import asyncio
from sqlalchemy import text
from app.database import engine


async def update_schema():
    async with engine.begin() as conn:
        print("Checking/Updating orders table schema...")
        try:
            # PostgreSQL syntax: ADD COLUMN IF NOT EXISTS
            await conn.execute(
                text(
                    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS current_location VARCHAR DEFAULT 'Warehouse'"
                )
            )
            await conn.execute(
                text(
                    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_history VARCHAR DEFAULT '[]'"
                )
            )
            print(
                "Columns current_location and tracking_history added successfully (or already exist)."
            )
        except Exception as e:
            print(f"Error updating schema: {e}")


if __name__ == "__main__":
    asyncio.run(update_schema())
