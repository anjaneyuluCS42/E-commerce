import asyncio
from app.database import engine, Base
from app.database import AsyncSessionLocal
from app.models.user import User
from app.models.product import Product
from app.models.category import Category
from app.auth.hash_password import hash_password

from sqlalchemy import text

async def seed_data():
    # 1. Truncate tables to ensure a clean slate and reset auto-increment IDs
    async with engine.begin() as conn:
        await conn.execute(text("TRUNCATE TABLE order_items, orders, products, categories, users RESTART IDENTITY CASCADE;"))
    print("Database tables truncated successfully.")

    async with AsyncSessionLocal() as session:
        # 2. Create admin user
        admin_user = User(
            username="anji",
            email="anji@gmail.com",
            password=hash_password("123456"),
            role="admin",
            is_active=True,
        )
        session.add(admin_user)
        await session.flush()
        
        # 3. Create categories
        categories_data = [
            ("Electronics", "Electronic gadgets, devices, and accessories"),
            ("Fashion", "Clothing, apparel, footwear, and fashion accessories"),
            ("Mobiles", "Smartphones, basic phones, and mobile accessories"),
            ("Home & Kitchen", "Kitchen appliances, cookware, home decors, and cleaning tools"),
            ("Books", "Fiction, non-fiction, educational, and guidebooks"),
            ("Sports", "Fitness equipment, sports gear, camping, and outdoor accessories")
        ]
        
        categories_dict = {}
        for name, desc in categories_data:
            cat = Category(name=name, description=desc)
            session.add(cat)
            await session.flush()
            categories_dict[name] = cat.id

        # 4. Define 20 products per category
        products_data = {
            "Electronics": [
                ("Laptop Pro 15", "High-performance laptop for professionals with 16GB RAM and 512GB SSD", 1299.99, 15),
                ("Desktop PC Elite", "Powerful desktop tower with latest graphics card and octa-core processor", 1599.99, 8),
                ("Wireless Mouse Silent", "Ergonomic wireless mouse with silent clicks and adjustable DPI", 29.99, 50),
                ("Mechanical Keyboard RGB", "Tactile mechanical keyboard with customizable RGB backlighting", 89.99, 30),
                ("Gaming Monitor 27", "27-inch gaming monitor with 144Hz refresh rate and 1ms response time", 249.99, 20),
                ("Bluetooth Speaker Max", "Portable waterproof Bluetooth speaker with 360-degree deep bass", 59.99, 40),
                ("Noise Cancelling Headphones", "Over-ear active noise-cancelling headphones with 40h battery life", 199.99, 25),
                ("USB-C Hub Multiport", "7-in-1 USB-C adapter hub with 4K HDMI, USB 3.0 ports, and SD card reader", 34.99, 60),
                ("External SSD 1TB", "Ultra-fast portable external solid state drive for backup and storage", 109.99, 35),
                ("UltraHD Webcam 4K", "4K web camera with autofocus and dual noise-reduction microphones", 79.99, 45),
                ("Dual-Band Wi-Fi Router", "Gigabit dual-band wireless router for high-speed internet coverage", 69.99, 25),
                ("Smart Watch Active", "Water-resistant smart watch with fitness tracking and heart rate monitor", 149.99, 30),
                ("Graphics Drawing Tablet", "Digital drawing tablet with battery-free stylus and customizable keys", 99.99, 18),
                ("Power Bank 20000mAh", "High-capacity portable charger power bank with fast charging outputs", 39.99, 55),
                ("VR Headset Quest", "Standalone virtual reality headset with spatial audio and touch controllers", 399.99, 12),
                ("Smart Plug Mini", "Wi-Fi smart plug compatible with voice control assistant (Pack of 2)", 24.99, 70),
                ("LED Ring Light 10", "10-inch ring light with tripod stand and phone holder for streaming", 29.99, 50),
                ("Wireless Charging Pad", "Fast wireless charger pad compatible with Qi-enabled smartphones", 19.99, 80),
                ("MicroSD Card 128GB", "Class 10 high-speed memory card with SD adapter for cameras and phones", 18.99, 100),
                ("HDMI 2.1 Cable 6ft", "High-speed 8K HDMI cable with gold-plated connectors for gaming consoles", 12.99, 120)
            ],
            "Fashion": [
                ("Classic Cotton T-Shirt", "100% premium cotton crewneck t-shirt, breathable and soft (Pack of 3)", 24.99, 100),
                ("Slim Fit Denim Jeans", "Classic five-pocket stretch denim jeans with slim-fit style", 49.99, 60),
                ("Faux Leather Jacket", "Stylish lightweight faux leather motorcycle jacket with zipper pockets", 79.99, 20),
                ("Breathable Running Shoes", "Lightweight athletic sneakers with cushioned sole for daily running", 69.99, 45),
                ("Floral Summer Dress", "Casual bohemian-style floral print A-line dress for warm weather", 34.99, 35),
                ("Merino Wool Sweater", "Warm knit sweater made from ultra-soft 100% merino wool", 59.99, 30),
                ("Polarized Sunglasses", "Classic retro style polarized sunglasses with UV400 protection", 15.99, 80),
                ("Adjustable Baseball Cap", "Classic unisex cotton baseball cap with adjustable strap closure", 12.99, 100),
                ("Analogue Wristwatch", "Minimalist quartz wristwatch with genuine leather strap", 89.99, 25),
                ("Urban Travel Backpack", "Water-resistant everyday laptop backpack with anti-theft design", 45.99, 40),
                ("Casual Retro Sneakers", "Low-top classic canvas sneakers for everyday wear", 39.99, 50),
                ("Athletic Ankle Socks", "Comfortable moisture-wicking athletic running ankle socks (Pack of 6)", 14.99, 150),
                ("Reversible Leather Belt", "Reversible black and brown genuine leather belt with metallic buckle", 22.99, 75),
                ("Soft Cashmere Scarf", "Warm winter wrap scarf made from premium cashmere blend", 28.99, 40),
                ("Classic Double-Breasted Trench Coat", "Mid-length water-resistant double-breasted trench coat with belt", 119.99, 15),
                ("One-Piece Swimwear", "Athnetical training one-piece swimsuit with racerback design", 29.99, 30),
                ("Lightweight Canvas Slip-ons", "Comfortable everyday slip-on shoes with cushioned footbed", 27.99, 60),
                ("Classic Cargo Shorts", "Durable cotton twill cargo shorts with multi-functional pockets", 29.99, 50),
                ("Fleece Pullover Hoodie", "Soft brushed fleece pullover hoodie with front kangaroo pocket", 34.99, 65),
                ("Ribbed Knit Beanie", "Classic warm stretch ribbed knit cuff beanie hat for cold weather", 9.99, 90)
            ],
            "Mobiles": [
                ("flagship smartphone Pro", "Premium flagship smartphone with 120Hz OLED screen and pro camera system", 999.99, 20),
                ("Budget Mobile phone Lite", "Affordable dual-sim smartphone with large battery and clean OS", 199.99, 50),
                ("Foldable smartphone X", "Cutting-edge foldable display smartphone with multitasking support", 1499.99, 5),
                ("Stylus Phone Note", "Productivity phone featuring built-in precision stylus and big screen", 799.99, 15),
                ("Dual Screen Phone Pro", "Innovative dual screen phone for advanced multitasking and productivity", 899.99, 10),
                ("Rugged Outdoor Phone", "Shockproof, dustproof, and waterproof rugged smartphone for adventures", 349.99, 25),
                ("Compact Mini Phone", "Small-sized lightweight 5G smartphone with premium specifications", 599.99, 30),
                ("Max Battery Phone", "Smartphone with massive 7000mAh battery for up to 3 days of usage", 299.99, 40),
                ("Super Camera Phone", "Photography-focused phone with 108MP main sensor and 100x zoom", 899.99, 18),
                ("Midrange Phone Plus", "Great value midrange smartphone with smooth 90Hz display", 329.99, 35),
                ("Basic Feature Phone", "Classic button feature phone with long-lasting battery and FM radio", 29.99, 100),
                ("5G Speedster Phone", "Fastest processor and 5G connectivity at an affordable price point", 449.99, 30),
                ("Eco-friendly Phone", "Smartphone made from recycled plastics with modular repairable design", 499.99, 15),
                ("Gaming Phone Max", "Dedicated gaming phone with active cooling fan and trigger buttons", 749.99, 12),
                ("Slim Design Phone", "Ultra-slim and elegant lightweight smartphone with metal frame", 649.99, 20),
                ("Classic Phone Reissue", "Retro flip-phone style with modern 4G and WhatsApp features", 79.99, 60),
                ("Pro Max Zoom Phone", "Premium smartphone with advanced 10x optical zoom lens", 1099.99, 10),
                ("Entry Level Phone 4G", "Basic smartphone for kids or elderly with simplified user interface", 99.99, 80),
                ("High Refresh Rate Phone", "Budget-friendly smartphone featuring a smooth 120Hz display", 249.99, 45),
                ("Smart Flip Phone X", "Foldable flip phone with compact design and external cover screen", 949.99, 8)
            ],
            "Home & Kitchen": [
                ("Digital Air Fryer 5L", "5-Liter capacity oil-free digital air fryer with 8 cooking presets", 89.99, 30),
                ("High-Speed Blender 1200W", "Professional countertop blender for smoothies, shakes, and ice crushing", 79.99, 25),
                ("Drip Coffee Maker", "12-cup automatic programmable drip coffee maker with glass carafe", 39.99, 40),
                ("Wide-Slot Toaster 2-Slice", "Stainless steel wide-slot toaster with browning dial settings", 24.99, 50),
                ("Electric Gooseneck Kettle", "1L precision pour gooseneck electric kettle with temperature control", 49.99, 35),
                ("Countertop Microwave 20L", "Compact 700W countertop microwave oven with digital display panel", 99.99, 15),
                ("Non-Stick Cookware 10pcs", "Anodized aluminum non-stick cookware set (pots, pans, and lids)", 149.99, 20),
                ("Stainless Steel Chef Knife Set", "Premium 6-piece kitchen knife block set with sharpening steel", 59.99, 30),
                ("Dinnerware Set 16-Piece", "Stoneware dinnerware service set (plates, bowls, and mugs) for 4", 69.99, 25),
                ("Robot Vacuum Cleaner", "Smart self-charging robotic vacuum cleaner with mapping technology", 199.99, 15),
                ("HEPA Air Purifier", "True HEPA filter air purifier for home allergies, pets, and smoke", 89.99, 28),
                ("Stand Mixer Tilt-Head", "Tilt-head planetary stand mixer with 5-quart bowl and attachments", 219.99, 12),
                ("Programmable Slow Cooker 6QT", "6-Quart oval programmable slow cooker with locking lid", 44.99, 30),
                ("Food Processor 8-Cup", "Versatile food processor with stainless steel slicing/shredding discs", 54.99, 22),
                ("Masticating Cold Press Juicer", "Slow cold-press juicer extractor for maximum nutrient retention", 119.99, 18),
                ("Electric Indoor Grill", "Non-stick indoor smokeless electric grill with temperature control", 69.99, 20),
                ("Kitchen Knife Sharpener", "3-stage manual knife sharpening tool for kitchen and pocket knives", 12.99, 60),
                ("Rotating Spice Rack Organizer", "Countertop rotating spice carousel with 16 pre-filled spice jars", 29.99, 40),
                ("Water Filter Pitcher 10-Cup", "BPA-free water filtration pitcher with standard replacement filter", 21.99, 50),
                ("Silicone Baking Mat Set", "Non-stick food-safe silicone baking mats (Pack of 3, half sheet size)", 14.99, 100)
            ],
            "Books": [
                ("Science Fiction Novel: Stars", "An epic sci-fi space opera about interstellar colony ship survival", 14.99, 40),
                ("Mystery Thriller Book: The Secret", "A gripping detective mystery thriller with unexpected twist endings", 12.99, 50),
                ("Biography of an Innovator", "The inspirational life story of a visionary tech industrialist", 19.99, 30),
                ("Self-Help Guide: Daily Habits", "Actionable guide on breaking bad routines and building good daily habits", 15.99, 80),
                ("History Encyclopedia: World Wars", "Detailed illustrated historical account of global world conflicts", 29.99, 15),
                ("Cookbook: Quick & Easy Recipes", "Over 100 delicious 30-minute recipes for healthy home cooking", 18.99, 45),
                ("Fantasy Epic Trilogy: The Ring", "First volume of an epic high-fantasy saga of magic and adventure", 16.99, 35),
                ("Business Strategy Guide: Scaling Up", "Essential handbook for entrepreneurs on scaling business operations", 22.99, 25),
                ("Poetry Collection: Modern Whispers", "An anthology of contemporary free-verse poems on life and love", 9.99, 60),
                ("Children's Bedtime Storybook", "Beautifully illustrated short bedtime stories for kids aged 3 to 7", 8.99, 100),
                ("Philosophy 101: Introduction", "Easy-to-understand introduction to major schools of philosophical thought", 14.99, 40),
                ("Travel Guidebook: Japan", "Comprehensive budget travel guide with maps and local highlights", 21.99, 30),
                ("Art History Textbook: Renaissance", "Visual analysis of Renaissance painters, sculptors, and masterpieces", 39.99, 12),
                ("Graphic Novel: Cyberpunk City", "A futuristic dystopian sci-fi graphic novel featuring cyberpunk art", 17.99, 25),
                ("True Crime Case Files", "Fascinating analysis of the most famous unsolved crimes in history", 11.99, 45),
                ("Urban Gardening Handbook", "Step-by-step instructions for growing vegetables in small apartments", 13.99, 55),
                ("Python Coding for Beginners", "Practical introduction to Python programming with exercises and projects", 24.99, 70),
                ("Astronomy Atlas: The Night Sky", "Stargazing guide with star charts, constellations, and moon maps", 27.99, 20),
                ("Healthy Living: Nutrition Guide", "Science-backed nutrition and dieting advice for lifetime wellness", 16.99, 40),
                ("Historical Fiction: The Kingdom", "An immersive historical fiction epic set in medieval Europe", 13.99, 35)
            ],
            "Sports": [
                ("Premium Soccer Ball Size 5", "Durable machine-stitched training soccer ball, size 5 standard", 19.99, 80),
                ("Composite Leather Basketball", "Official size composite leather indoor/outdoor basketball", 24.99, 60),
                ("Graphite Tennis Racket", "Lightweight graphite tennis racket with pre-strung durable strings", 59.99, 30),
                ("Eco-Friendly Yoga Mat", "6mm thick non-slip TPE yoga mat with alignment guide lines", 29.99, 50),
                ("Adjustable Dumbbells Set 20kg", "Pair of adjustable steel dumbbell plates and bars (total 20kg)", 89.99, 15),
                ("Resistance Loops Bands Set", "Premium latex elastic resistance loops for fitness training (Set of 5)", 9.99, 120),
                ("Cycling Helmet with Visor", "Lightweight adjustable bicycle helmet with detachable sun visor", 34.99, 40),
                ("Anti-Fog Swim Goggles", "Leak-free UV protection swim goggles with soft silicone frame", 14.99, 75),
                ("GPS Running Smartwatch", "Rugged GPS watch with training metrics, pace tracker, and map routing", 179.99, 20),
                ("Badminton Rackets Set of 2", "Graphite shaft badminton rackets with carrying bag and shuttlecocks", 39.99, 35),
                ("Golf Balls Premium (Dozen)", "3-piece soft feel distance flight golf balls pack of 12", 27.99, 50),
                ("Speed Jump Rope Steel", "Adjustable tangle-free steel cable speed skipping rope for cardio", 8.99, 110),
                ("Outdoor Hiking Backpack 50L", "Large capacity trekking backpack with rain cover and sleeping bag loop", 54.99, 25),
                ("Camping Tent 2-Person", "Waterproof lightweight double-layer dome tent for backpacking", 79.99, 18),
                ("Warm Sleeping Bag 3-Season", "Compact lightweight sleeping bag rated for cold and warm weather", 39.99, 30),
                ("Double-Kick Skateboard 31", "Complete double-kick 7-ply maple wood cruiser skateboard", 44.99, 22),
                ("Soccer Cleats Firm Ground", "Unisex professional soccer shoes for outdoor grass playing", 49.99, 45),
                ("Insulated Sports Water Bottle", "Double-walled vacuum insulated stainless steel water bottle 32oz", 17.99, 90),
                ("Weightlifting Gym Gloves", "Breathable weightlifting gloves with wrist wrap and palm protection", 11.99, 100),
                ("Heavy Punching Bag Set", "70-pound filled heavy punching bag with hanging chain and boxing gloves", 99.99, 12)
            ]
        }

        # 5. Insert all products
        import glob
        import random
        import os
        
        all_image_files = glob.glob("uploads/product_images/*")
        all_image_files = [f.replace("\\", "/") for f in all_image_files if os.path.isfile(f)]
        
        for category_name, list_of_products in products_data.items():
            cat_id = categories_dict[category_name]
            for name, desc, price, stock in list_of_products:
                sampled_images = []
                cover_image = None
                if all_image_files:
                    count = min(len(all_image_files), random.randint(4, 5))
                    sampled_images = random.sample(all_image_files, count)
                    cover_image = sampled_images[0]
                
                prod = Product(
                    name=name,
                    description=desc,
                    price=price,
                    stock=stock,
                    image_url=cover_image,
                    images=sampled_images,
                    is_active=True,
                    owner_id=admin_user.id,
                    category_id=cat_id
                )
                session.add(prod)
        
        await session.commit()
        print("Database fully seeded with 120 products!")

if __name__ == "__main__":
    asyncio.run(seed_data())
