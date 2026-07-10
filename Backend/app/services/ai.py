import re
import json
import asyncio
from typing import Dict, List, Any, Optional
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.product import Product
from groq import Groq
from dotenv import load_dotenv
import os
from app.cache.redis_client import redis_client
import httpx
import logging

load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)

class AIService:
    @staticmethod
    async def _call_llm(messages: List[Dict[str, Any]], temperature: float = 0.4) -> str:
        """
        Attempts to query Groq first. If that fails, falls back to Gemini.
        If Gemini also fails, falls back to Mistral.
        Raises an exception if all fail.
        """
        providers = [
            {
                "name": "Groq",
                "api_key": os.getenv("GROQ_API_KEY"),
                "url": "https://api.groq.com/openai/v1/chat/completions",
                "model": "llama-3.3-70b-versatile",
            },
            {
                "name": "Gemini",
                "api_key": os.getenv("GEMINI_API_KEY"),
                "url": "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                "model": "gemini-1.5-flash",
            },
            {
                "name": "Mistral",
                "api_key": os.getenv("MISTRAL_API_KEY"),
                "url": "https://api.mistral.ai/v1/chat/completions",
                "model": "mistral-small-latest",
            }
        ]

        last_error = None
        for provider in providers:
            if not provider["api_key"]:
                logger.warning(f"Skipping {provider['name']} as API key is not configured.")
                continue
            
            try:
                logger.info(f"Attempting to query LLM using provider: {provider['name']} (model: {provider['model']})")
                async with httpx.AsyncClient() as httpx_client:
                    headers = {
                        "Authorization": f"Bearer {provider['api_key']}",
                        "Content-Type": "application/json"
                    }
                    payload = {
                        "model": provider["model"],
                        "messages": messages,
                        "temperature": temperature,
                        "stream": False
                    }
                    response = await httpx_client.post(
                        provider["url"],
                        headers=headers,
                        json=payload,
                        timeout=30.0
                    )
                    response.raise_for_status()
                    res_json = response.json()
                    content = res_json["choices"][0]["message"]["content"]
                    if content:
                        logger.info(f"LLM call successfully completed using provider: {provider['name']}")
                        return content
            except Exception as e:
                logger.error(f"{provider['name']} LLM call failed: {str(e)}")
                last_error = e

        raise last_error or RuntimeError("No LLM providers available or all of them failed.")

    @staticmethod
    async def _call_llm_stream(messages: List[Dict[str, Any]], temperature: float = 0.4):
        """
        Sequentially tries to stream from Groq, Gemini, and Mistral.
        Yields text chunks.
        """
        providers = [
            {
                "name": "Groq",
                "api_key": os.getenv("GROQ_API_KEY"),
                "url": "https://api.groq.com/openai/v1/chat/completions",
                "model": "llama-3.3-70b-versatile",
            },
            {
                "name": "Gemini",
                "api_key": os.getenv("GEMINI_API_KEY"),
                "url": "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                "model": "gemini-1.5-flash",
            },
            {
                "name": "Mistral",
                "api_key": os.getenv("MISTRAL_API_KEY"),
                "url": "https://api.mistral.ai/v1/chat/completions",
                "model": "mistral-small-latest",
            }
        ]

        last_error = None
        for provider in providers:
            if not provider["api_key"]:
                logger.warning(f"Skipping {provider['name']} stream as API key is not configured.")
                continue
            
            try:
                logger.info(f"Attempting to stream from LLM using provider: {provider['name']} (model: {provider['model']})")
                headers = {
                    "Authorization": f"Bearer {provider['api_key']}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": provider["model"],
                    "messages": messages,
                    "temperature": temperature,
                    "stream": True
                }
                
                async with httpx.AsyncClient() as httpx_client:
                    async with httpx_client.stream("POST", provider["url"], headers=headers, json=payload, timeout=30.0) as response:
                        response.raise_for_status()
                        async for line in response.aiter_lines():
                            if line.startswith("data: "):
                                data_str = line[6:].strip()
                                if data_str == "[DONE]":
                                    break
                                try:
                                    chunk_json = json.loads(data_str)
                                    content = chunk_json["choices"][0]["delta"].get("content", "")
                                    if content:
                                        yield content
                                except Exception:
                                    pass
                logger.info(f"LLM streaming successfully completed using provider: {provider['name']}")
                return # Successful stream complete, exit function
            except Exception as e:
                logger.error(f"{provider['name']} streaming LLM call failed: {str(e)}")
                last_error = e

        raise last_error or RuntimeError("No LLM providers available or all of them failed.")

    @staticmethod
    async def generate_chat_response(message: str, db: AsyncSession) -> Dict[str, Any]:
        """
        Parses the user message to extract criteria, queries the PostgreSQL database,
        recommends matching products, and explains why they match. With Redis caching.
        """
        if not message or not message.strip():
            raise ValueError("Message content cannot be empty")

        # Normalize query for cache key
        norm_msg = message.strip().lower()
        cache_key = f"ai:chat_cache:{norm_msg}"
        
        try:
            cached_val = await redis_client.get(cache_key)
            if cached_val:
                return json.loads(cached_val)
        except Exception:
            pass

        # 1. Parse User Intent & Extract Specs
        criteria = AIService._extract_criteria(message)
        
        # 2. Query Products from Database
        result = await db.execute(select(Product))
        db_products = result.scalars().all()
        
        # 3. Match and Score Products
        matching_recs = []
        closest_alternatives = []
        
        has_strict_criteria = criteria["category"] or criteria["brand"] or criteria["budget_min"] or criteria["budget_max"]
        
        for prod in db_products:
            prod_name_lower = prod.name.lower()
            prod_desc_lower = prod.description.lower() if prod.description else ""
            
            # Check strict criteria: Category
            if criteria["category"]:
                is_mobile_query = criteria["category"] in ["mobile", "phone", "smartphone", "cellphone"]
                is_laptop_query = criteria["category"] in ["laptop", "computer", "pc", "notebook"]
                
                if is_mobile_query:
                    if prod.category_id != 3:
                        continue
                elif is_laptop_query:
                    is_prod_laptop = any(kw in prod_name_lower or kw in prod_desc_lower for kw in ["laptop", "notebook", "chromebook"]) or (prod.name.split()[0].lower() in ["dell", "macbook"])
                    if not is_prod_laptop:
                        continue
                    
            # Check strict criteria: Brand
            if criteria["brand"]:
                # Special handle for apple/iphone
                if criteria["brand"] == "apple" or criteria["brand"] == "iphone":
                    if not ("apple" in prod_name_lower or "iphone" in prod_name_lower or "apple" in prod_desc_lower):
                        continue
                else:
                    if criteria["brand"] not in prod_name_lower and criteria["brand"] not in prod_desc_lower:
                        continue
            
            # Calculate match reasons and scores
            score = 0
            reasons = []
            
            # Category match
            if criteria["category"]:
                score += 1
                reasons.append(f"matches category '{criteria['category']}'")
                
            # Brand match
            if criteria["brand"]:
                score += 1
                reasons.append(f"brand is {prod.name.split()[0]}")
                
            # Budget match
            price_matched = True
            budget_reasons = []
            if criteria["budget_min"] is not None:
                if prod.price >= criteria["budget_min"]:
                    score += 2
                    budget_reasons.append(f"above ₹{criteria['budget_min']:,}")
                else:
                    price_matched = False
            if criteria["budget_max"] is not None:
                if prod.price <= criteria["budget_max"]:
                    score += 2
                    budget_reasons.append(f"below ₹{criteria['budget_max']:,}")
                else:
                    price_matched = False
                    
            if price_matched:
                if budget_reasons:
                    reasons.append(f"{' and '.join(budget_reasons)} (priced at ₹{prod.price:,.0f})")
                else:
                    reasons.append(f"priced at ₹{prod.price:,.0f}")
            else:
                closest_alternatives.append(prod)
                continue
                
            # Spec Match: RAM
            if criteria["ram"]:
                if criteria["ram"].lower() in prod_desc_lower or criteria["ram"].lower() in prod_name_lower:
                    score += 2
                    reasons.append(f"has requested {criteria['ram']} RAM")
                elif any(kw in prod_desc_lower for kw in ["ram"]):
                    # If user asked for RAM, but this has different RAM
                    pass
            
            # Spec Match: Storage
            if criteria["storage"]:
                if criteria["storage"].lower() in prod_desc_lower or criteria["storage"].lower() in prod_name_lower:
                    score += 2
                    reasons.append(f"has {criteria['storage']} storage")
                    
            # Spec Match: Display
            if criteria["display"]:
                if criteria["display"].lower() in prod_desc_lower or criteria["display"].lower() in prod_name_lower:
                    score += 2
                    reasons.append(f"features a vivid {criteria['display'].upper()} display")
                    
            # Spec Match: Camera
            if criteria["camera"]:
                if any(kw in prod_desc_lower for kw in ["camera", "mp", "megapixels"]):
                    score += 1
                    # Try to extract megapixels for better description
                    mp_match = re.search(r'(\d+mp)', prod_desc_lower)
                    mp_text = f" ({mp_match.group(1).upper()})" if mp_match else ""
                    reasons.append(f"equipped with a good camera{mp_text}")
                    
            # Spec Match: Battery
            if criteria["battery"]:
                if any(kw in prod_desc_lower for kw in ["battery", "mah", "long last"]):
                    score += 1
                    mah_match = re.search(r'(\d+mah)', prod_desc_lower)
                    mah_text = f" ({mah_match.group(1)})" if mah_match else ""
                    reasons.append(f"features long-lasting battery life{mah_text}")
                    
            # Spec Match: Gaming
            if criteria["gaming"]:
                if "gaming" in prod_desc_lower or "gaming" in prod_name_lower:
                    score += 3
                    reasons.append("built for gaming performance")
            
            # Format reasons list nicely
            if reasons:
                # Capitalize first letter and format list
                match_reason = "This product " + ", ".join(reasons) + "."
            else:
                match_reason = f"Excellent product matching your requirements, priced at ₹{prod.price:,.0f}."
                
            matching_recs.append({
                "id": prod.id,
                "name": prod.name,
                "description": prod.description or "",
                "price": prod.price,
                "image_url": prod.image_url,
                "match_reason": match_reason,
                "score": score
            })
            
        # Sort recommendations by matching score in descending order
        matching_recs.sort(key=lambda x: x["score"], reverse=True)
        
        # 4. Generate AI response text
        response_text = ""
        suggestions = []

        if matching_recs:
            product_summary = "\n".join([
                f"- {p['name']} (₹{p['price']}) : {p['match_reason']}"
                for p in matching_recs[:5]
            ])

            prompt = f"""
    You are a professional and matured AI Shopping Assistant for an E-Commerce website.

    Customer Request: {message}

    Matching Products:
    {product_summary}

    Write a direct, clear, and matured shopping recommendation response.

    Rules:
    - Recommend ONLY the given matching products. Do not suggest other categories or accessories.
    - Explicitly mention that you are listing the products that fit the user's specific price range or criteria.
    - Explain why they match.
    - Do not invent products.
    - Be structured, objective, and professional. Keep the response within 120 words.
    """

            response_text = await AIService._call_llm(
                messages=[
                    {
                        "role": "system",
                        "content": "You are a professional shopping assistant."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.4
            )

            suggestions = [
                "Compare Products",
                "Show More Mobiles",
                "Add to Cart"
            ]
            # Clean up scores before sending response
            for rec in matching_recs:
                rec.pop("score", None)
        else:
            prompt = f"""
    You are a professional and matured AI Shopping Assistant for an E-Commerce website.
    Customer Request: {message}
    No products matched the customer's query.
    Write a clear and direct response letting the customer know we couldn't find any products matching their exact criteria.
    (e.g., if they asked for mobiles above 10,000, state directly: "No mobiles are available above ₹10,000 in our store.")
    Suggest they adjust their search criteria or look at other categories.
    Keep response within 80 words.
    """
            try:
                response_text = await AIService._call_llm(
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a professional shopping assistant."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    temperature=0.4
                )
            except Exception:
                response_text = "I couldn't find any products matching your criteria. Try adjusting your budget, brand, or specifications, or ask to show all products!"
            
            suggestions = [
                "Show All Products",
                "Try Another Search"
            ]

        res = {
            "text": response_text,
            "products": matching_recs,
            "suggestions": suggestions
        }
        
        try:
            await redis_client.set(cache_key, json.dumps(res), ex=3600)
        except Exception:
            pass
            
        return res

    @staticmethod
    async def generate_chat_response_stream(message: str, db: AsyncSession):
        """
        Streams AI assistant response, checking Redis cache first.
        """
        if not message or not message.strip():
            raise ValueError("Message content cannot be empty")

        norm_msg = message.strip().lower()
        cache_key = f"ai:chat_cache:{norm_msg}"
        
        try:
            cached_val = await redis_client.get(cache_key)
            if cached_val:
                cached_res = json.loads(cached_val)
                # Yield text in chunks to simulate streaming
                words = cached_res["text"].split(" ")
                for i in range(0, len(words), 3):
                    chunk = " ".join(words[i:i+3]) + " "
                    yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"
                    await asyncio.sleep(0.05)
                yield f"data: {json.dumps({'type': 'products', 'products': cached_res['products']})}\n\n"
                yield f"data: {json.dumps({'type': 'suggestions', 'suggestions': cached_res['suggestions']})}\n\n"
                yield "data: [DONE]\n\n"
                return
        except Exception:
            pass

        # If not cached, retrieve and perform RAG matching
        criteria = AIService._extract_criteria(message)
        result = await db.execute(select(Product))
        db_products = result.scalars().all()
        
        matching_recs = []
        closest_alternatives = []
        
        for prod in db_products:
            prod_name_lower = prod.name.lower()
            prod_desc_lower = prod.description.lower() if prod.description else ""
            
            # Check strict criteria: Category
            if criteria["category"]:
                is_mobile_query = criteria["category"] in ["mobile", "phone", "smartphone", "cellphone"]
                is_laptop_query = criteria["category"] in ["laptop", "computer", "pc", "notebook"]
                
                if is_mobile_query:
                    if prod.category_id != 3:
                        continue
                elif is_laptop_query:
                    is_prod_laptop = any(kw in prod_name_lower or kw in prod_desc_lower for kw in ["laptop", "notebook", "chromebook"]) or (prod.name.split()[0].lower() in ["dell", "macbook"])
                    if not is_prod_laptop:
                        continue
                    
            # Check strict criteria: Brand
            if criteria["brand"]:
                if criteria["brand"] == "apple" or criteria["brand"] == "iphone":
                    if not ("apple" in prod_name_lower or "iphone" in prod_name_lower or "apple" in prod_desc_lower):
                        continue
                else:
                    if criteria["brand"] not in prod_name_lower and criteria["brand"] not in prod_desc_lower:
                        continue
            
            score = 0
            reasons = []
            
            if criteria["category"]:
                score += 1
                reasons.append(f"matches category '{criteria['category']}'")
            if criteria["brand"]:
                score += 1
                reasons.append(f"brand is {prod.name.split()[0]}")
                
            # Budget match
            price_matched = True
            budget_reasons = []
            if criteria["budget_min"] is not None:
                if prod.price >= criteria["budget_min"]:
                    score += 2
                    budget_reasons.append(f"above ₹{criteria['budget_min']:,}")
                else:
                    price_matched = False
            if criteria["budget_max"] is not None:
                if prod.price <= criteria["budget_max"]:
                    score += 2
                    budget_reasons.append(f"below ₹{criteria['budget_max']:,}")
                else:
                    price_matched = False
                    
            if price_matched:
                if budget_reasons:
                    reasons.append(f"{' and '.join(budget_reasons)} (priced at ₹{prod.price:,.0f})")
                else:
                    reasons.append(f"priced at ₹{prod.price:,.0f}")
            else:
                closest_alternatives.append(prod)
                continue
                
            if criteria["ram"]:
                if criteria["ram"].lower() in prod_desc_lower or criteria["ram"].lower() in prod_name_lower:
                    score += 2
                    reasons.append(f"has requested {criteria['ram']} RAM")
            if criteria["storage"]:
                if criteria["storage"].lower() in prod_desc_lower or criteria["storage"].lower() in prod_name_lower:
                    score += 2
                    reasons.append(f"has {criteria['storage']} storage")
            if criteria["display"]:
                if criteria["display"].lower() in prod_desc_lower or criteria["display"].lower() in prod_name_lower:
                    score += 2
                    reasons.append(f"features a vivid {criteria['display'].upper()} display")
            if criteria["camera"]:
                if any(kw in prod_desc_lower for kw in ["camera", "mp", "megapixels"]):
                    score += 1
                    mp_match = re.search(r'(\d+mp)', prod_desc_lower)
                    mp_text = f" ({mp_match.group(1).upper()})" if mp_match else ""
                    reasons.append(f"equipped with a good camera{mp_text}")
            if criteria["battery"]:
                if any(kw in prod_desc_lower for kw in ["battery", "mah", "long last"]):
                    score += 1
                    mah_match = re.search(r'(\d+mah)', prod_desc_lower)
                    mah_text = f" ({mah_match.group(1)})" if mah_match else ""
                    reasons.append(f"features long-lasting battery life{mah_text}")
            if criteria["gaming"]:
                if "gaming" in prod_desc_lower or "gaming" in prod_name_lower:
                    score += 3
                    reasons.append("built for gaming performance")
            
            if reasons:
                match_reason = "This product " + ", ".join(reasons) + "."
            else:
                match_reason = f"Excellent product matching your requirements, priced at ₹{prod.price:,.0f}."
                
            matching_recs.append({
                "id": prod.id,
                "name": prod.name,
                "description": prod.description or "",
                "price": prod.price,
                "image_url": prod.image_url,
                "match_reason": match_reason,
                "score": score
            })
            
        matching_recs.sort(key=lambda x: x["score"], reverse=True)
        
        full_text = ""
        suggestions = []
        
        # Call Groq with stream=True
        if matching_recs:
            product_summary = "\n".join([
                f"- {p['name']} (₹{p['price']}) : {p['match_reason']}"
                for p in matching_recs[:5]
            ])
            prompt = f"""
    You are a professional and matured AI Shopping Assistant for an E-Commerce website.
    Customer Request: {message}
    Matching Products:
    {product_summary}
    Write a direct, clear, and matured shopping recommendation response.
    Rules:
    - Recommend ONLY the given matching products. Do not suggest other categories or accessories.
    - Explicitly mention that you are listing the products that fit the user's specific price range or criteria.
    - Explain why they match.
    - Do not invent products.
    - Be structured, objective, and professional. Keep the response within 120 words.
    """
            try:
                async for content in AIService._call_llm_stream(
                    messages=[
                        {"role": "system", "content": "You are a professional shopping assistant."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.4
                ):
                    full_text += content
                    yield f"data: {json.dumps({'type': 'token', 'content': content})}\n\n"
                    await asyncio.sleep(0.01) # Yield control
            except Exception as e:
                full_text = f"Here are the matches I found: "
                yield f"data: {json.dumps({'type': 'token', 'content': full_text})}\n\n"
                
            suggestions = ["Compare Products", "Show More Mobiles", "Add to Cart"]
            for rec in matching_recs:
                rec.pop("score", None)
        else:
            prompt = f"""
    You are a professional and matured AI Shopping Assistant for an E-Commerce website.
    Customer Request: {message}
    No products matched the customer's query.
    Write a clear and direct response letting the customer know we couldn't find any products matching their exact criteria.
    (e.g., if they asked for mobiles above 10,000, state directly: "No mobiles are available above ₹10,000 in our store.")
    Suggest they adjust their search criteria or look at other categories.
    Keep response within 80 words.
    """
            try:
                async for content in AIService._call_llm_stream(
                    messages=[
                        {"role": "system", "content": "You are a professional shopping assistant."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.4
                ):
                    full_text += content
                    yield f"data: {json.dumps({'type': 'token', 'content': content})}\n\n"
                    await asyncio.sleep(0.01)
            except Exception:
                full_text = "I couldn't find any products matching your criteria. Try adjusting your budget, brand, or specifications, or ask to show all products!"
                yield f"data: {json.dumps({'type': 'token', 'content': full_text})}\n\n"
            
            suggestions = ["Show All Products", "Try Another Search"]

        # Cache compiled response
        res_payload = {
            "text": full_text,
            "products": matching_recs,
            "suggestions": suggestions
        }
        try:
            await redis_client.set(cache_key, json.dumps(res_payload), ex=3600)
        except Exception:
            pass
            
        yield f"data: {json.dumps({'type': 'products', 'products': matching_recs})}\n\n"
        yield f"data: {json.dumps({'type': 'suggestions', 'suggestions': suggestions})}\n\n"
        yield "data: [DONE]\n\n"

    @staticmethod
    async def generate_product_description(name: str, category: Optional[str] = None, price: Optional[float] = None) -> str:
        """
        Auto-generates a product description using the Groq Llama model.
        """
        prompt = f"""
        You are a professional copywriter for an E-Commerce store.
        Write a compelling, engaging, and professional product description for the following product:
        - Name: {name}
        - Category: {category or 'General'}
        - Price: ₹{price:,.2f} if price else 'N/A'

        Rules:
        - Keep the description between 40 and 80 words.
        - Highlight the key value proposition of the product.
        - Write in a friendly, persuasive marketing style.
        - Respond with ONLY the product description, nothing else. Do not add intro like 'Here is...' or quotes.
        """
        try:
            description = await AIService._call_llm(
                messages=[
                    {"role": "system", "content": "You are a professional product description writer."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7
            )
            return description.strip()
        except Exception as e:
            return f"An excellent {category or 'product'} designed for performance and value."
        
    @staticmethod
    def _extract_criteria(message: str) -> Dict[str, Any]:
        """
        Parses text input to extract categories, brands, budgets, and specifications.
        """
        message_clean = message.lower().replace(',', '')
        
        criteria = {
            "category": None,
            "brand": None,
            "budget_min": None,
            "budget_max": None,
            "ram": None,
            "storage": None,
            "camera": False,
            "battery": False,
            "display": None,
            "gaming": False
        }
        
        # Extract Category
        if any(kw in message_clean for kw in ["mobile", "phone", "smartphone", "cellphone", "iphone"]):
            criteria["category"] = "mobile"
        elif any(kw in message_clean for kw in ["laptop", "computer", "pc", "notebook"]):
            criteria["category"] = "laptop"
            
        # Extract Brand
        for b in ["samsung", "apple", "iphone", "vivo", "dell"]:
            if b in message_clean:
                criteria["brand"] = b
                break
                
        # Extract Budget Min/Max
        min_match = re.search(r'(?:above|greater|more than|over|starting|min|at least)\s*(?:₹|rs\.?)?\s*(\d+)', message_clean)
        max_match = re.search(r'(?:under|below|less|max|up to|budget|maximum)\s*(?:₹|rs\.?)?\s*(\d+)', message_clean)
        
        if min_match:
            criteria["budget_min"] = float(min_match.group(1))
        if max_match:
            criteria["budget_max"] = float(max_match.group(1))
            
        # Fallback if no explicit direction keywords, but a number exists
        if not criteria["budget_min"] and not criteria["budget_max"]:
            nums = re.findall(r'\b(\d{4,6})\b', message_clean)
            if nums:
                criteria["budget_max"] = float(nums[0])
                
        # Extract RAM (e.g. 8gb, 12gb, 16gb)
        ram_match = re.search(r'\b(4|6|8|12|16|32|64)\s*(?:gb)?\s*ram\b', message_clean)
        if ram_match:
            criteria["ram"] = f"{ram_match.group(1)}GB"
        else:
            # Fallback check for numbers directly before GB if they look like RAM values
            gb_matches = re.findall(r'\b(4|6|8|12|16|32|64)\s*gb\b', message_clean)
            if gb_matches:
                criteria["ram"] = f"{gb_matches[0]}GB"
                
        # Extract Storage (e.g. 128gb, 256gb, 512gb)
        storage_match = re.search(r'\b(64|128|256|512)\s*(?:gb)?\s*(?:storage|rom|ssd)\b', message_clean)
        if storage_match:
            criteria["storage"] = f"{storage_match.group(1)}GB"
        else:
            # Fallback check for numbers directly before GB if they are typical storage sizes
            gb_matches = re.findall(r'\b(128|256|512)\s*gb\b', message_clean)
            if gb_matches:
                criteria["storage"] = f"{gb_matches[0]}GB"
                
        # Extract Camera
        if any(kw in message_clean for kw in ["camera", "mp", "megapixels", "photography", "photos"]):
            criteria["camera"] = True
            
        # Extract Battery
        if any(kw in message_clean for kw in ["battery", "mah", "long last", "charging", "charger"]):
            criteria["battery"] = True
            
        # Extract Display
        if "amoled" in message_clean:
            criteria["display"] = "amoled"
        elif "oled" in message_clean:
            criteria["display"] = "oled"
        elif "lcd" in message_clean:
            criteria["display"] = "lcd"
        elif "ips" in message_clean:
            criteria["display"] = "ips"
        elif any(kw in message_clean for kw in ["display", "screen"]):
            criteria["display"] = "display"
            
        # Extract Gaming
        if any(kw in message_clean for kw in ["gaming", "game", "games", "play"]):
            criteria["gaming"] = True
            
        return criteria
