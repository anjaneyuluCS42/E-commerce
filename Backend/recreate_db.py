import asyncio
from app.database import engine, Base
from app.models.user import User
from app.models.product import Product
from app.models.category import Category
from app.models.order import Order

async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("Database recreated successfully.")

if __name__ == "__main__":
    asyncio.run(main())
