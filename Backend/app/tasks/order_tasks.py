from app.tasks.celery_worker import celery
import time
import logging
import asyncio
import csv
from app.services.pdf_service import generate_invoice_pdf

logger = logging.getLogger(__name__)

@celery.task(bind=True, max_retries=3)
def send_order_confirmation_email(self, email: str, order_id: int, total_price: float = 0.0, items: list = None):
    try:
        logger.info(f"Preparing order confirmation for {email} - Order #{order_id}")
        
        # 1. Generate the PDF Invoice
        items = items or [] # In real-world, fetch from DB if not passed
        pdf_path = generate_invoice_pdf(order_id, email, total_price, items)
        logger.info(f"Invoice generated at {pdf_path}")
        
        # 2. Simulate sending email with PDF attached (e.g., via SendGrid)
        time.sleep(2) 
        
        logger.info(f"Order confirmation sent successfully to {email}")
        return {"status": "Email Sent", "order_id": order_id, "invoice_path": pdf_path}
        
    except Exception as exc:
        logger.error(f"Failed to send email to {email}. Retrying...")
        # Exponential backoff retry: 1min, 2min, 4min
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))

@celery.task(bind=True, max_retries=3)
def send_welcome_email(self, email: str, username: str):
    try:
        logger.info(f"Sending Welcome Email to {username} ({email})")
        time.sleep(2)
        return "Welcome Email Sent"
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)

@celery.task
def cleanup_abandoned_carts():
    """
    Scheduled task (Beat) to find carts in Redis older than 7 days and delete them.
    """
    logger.info("Running nightly cleanup of abandoned carts in Redis...")
    # Logic to clean up Redis hashes would go here
    return "Cleanup complete"

@celery.task
def test_hello_world(name: str):
    logger.info(f"Test task running for: {name}")
    time.sleep(2)  # Simulate small work
    return f"Hello, {name}!"

@celery.task(bind=True)
def generate_invoice_task(self, order_id: int, user_email: str, total_price: float, items: list):
    logger.info(f"Generating PDF invoice for Order #{order_id}")
    self.update_state(state='PROGRESS', meta={'progress': 10})
    time.sleep(1) # simulate work
    self.update_state(state='PROGRESS', meta={'progress': 50})
    
    # Call pdf generation
    pdf_path = generate_invoice_pdf(order_id, user_email, total_price, items)
    time.sleep(1)
    
    self.update_state(state='PROGRESS', meta={'progress': 100})
    return {"download_url": f"/orders/{order_id}/invoice/download"}

async def run_import(file_path: str, admin_id: int, task_self):
    from app.database import AsyncSessionLocal
    from app.models.product import Product
    from sqlalchemy import select

    # Count rows
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            total_rows = sum(1 for _ in csv.reader(f)) - 1
    except Exception as e:
        return {"processed": 0, "success": 0, "failed": 0, "errors": [f"File read error: {str(e)}"]}

    if total_rows <= 0:
        return {"processed": 0, "success": 0, "failed": 0, "errors": ["Empty CSV file"]}

    processed = 0
    success = 0
    failed = 0
    errors = []

    async with AsyncSessionLocal() as db:
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for idx, row in enumerate(reader):
                processed += 1
                try:
                    name = row.get("name")
                    description = row.get("description", "")
                    price_str = row.get("price")
                    stock_str = row.get("stock")
                    category_id_str = row.get("category_id")

                    if not name or not price_str or not stock_str or not category_id_str:
                        raise ValueError("Missing required fields (name, price, stock, category_id)")

                    price = float(price_str)
                    stock = int(stock_str)
                    category_id = int(category_id_str)

                    # Check duplicate
                    stmt = select(Product).where(Product.name == name)
                    res = await db.execute(stmt)
                    if res.scalar_one_or_none():
                        raise ValueError(f"Product name '{name}' already exists (Duplicate)")

                    # Create product
                    product = Product(
                        name=name,
                        description=description,
                        price=price,
                        stock=stock,
                        category_id=category_id,
                        owner_id=admin_id,
                        is_active=True,
                        status="active"
                    )
                    db.add(product)
                    success += 1
                except Exception as e:
                    failed += 1
                    errors.append(f"Row {idx + 2}: {str(e)}")

                # Update progress every few rows
                if processed % 5 == 0 or processed == total_rows:
                    progress_pct = int((processed / total_rows) * 100)
                    task_self.update_state(
                        state='PROGRESS',
                        meta={
                            'progress': progress_pct,
                            'processed': processed,
                            'total': total_rows,
                            'success': success,
                            'failed': failed,
                            'errors': errors[:50]
                        }
                    )

            # Commit the transaction
            await db.commit()
            
            # Clear products cache
            try:
                from app.cache.redis_client import redis_client
                await redis_client.delete("all_products")
            except Exception:
                pass

    return {
        "processed": processed,
        "total": total_rows,
        "success": success,
        "failed": failed,
        "errors": errors
    }

@celery.task(bind=True)
def bulk_import_products_task(self, file_path: str, admin_id: int):
    # Run the async importer synchronously inside Celery using asyncio event loop
    return asyncio.run(run_import(file_path, admin_id, self))