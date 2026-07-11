import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import select, text
import sys

# Local PostgreSQL connection URL
LOCAL_URL = "postgresql+asyncpg://postgres:Anji%402003@localhost/ecommerce_db"

if len(sys.argv) < 2:
    print("Usage: python migrate_db.py <supabase_connection_string>")
    sys.exit(1)

REMOTE_URL = sys.argv[1]
if not REMOTE_URL.startswith("postgresql+asyncpg://"):
    if REMOTE_URL.startswith("postgresql://"):
        REMOTE_URL = REMOTE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
    else:
        print("Error: Remote URL must start with postgresql:// or postgresql+asyncpg://")
        sys.exit(1)

async def migrate():
    import ssl
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    local_engine = create_async_engine(LOCAL_URL)
    remote_engine = create_async_engine(REMOTE_URL, connect_args={"ssl": ssl_context})

    tables = ["users", "categories", "products", "orders", "order_items"]

    async with local_engine.connect() as local_conn:
        async with remote_engine.connect() as remote_conn:
            print("Connected to both databases.")

            # Load models to register with Base metadata
            from app.database import Base
            from app.models.user import User
            from app.models.product import Product
            from app.models.category import Category
            from app.models.order import Order, OrderItem

            print("Creating tables on remote database if they don't exist...")
            try:
                await remote_conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
                await remote_conn.commit()
            except Exception as e:
                print(f"Warning: Could not create pg_trgm extension: {e}")

            def create_tables(connection):
                Base.metadata.create_all(connection)
            
            await remote_conn.run_sync(create_tables)
            await remote_conn.commit()
            print("Tables verified/created.")

            # Truncate remote tables in reverse order to clear any existing test data
            print("Clearing existing data on remote database...")
            for table in reversed(tables):
                try:
                    await remote_conn.execute(text(f"TRUNCATE TABLE {table} CASCADE"))
                except Exception as e:
                    print(f"Could not truncate {table}: {e}")
            await remote_conn.commit()

            # Copy data table by table
            for table in tables:
                print(f"Migrating table: {table}...")
                result = await local_conn.execute(text(f"SELECT * FROM {table}"))
                rows = result.fetchall()
                keys = result.keys()

                if not rows:
                    print(f"Table {table} is empty. Skipping.")
                    continue

                # Filter out generated columns (like search_vector in products)
                filtered_keys = [key for key in keys if key != "search_vector"]

                # Prepare insert statement
                placeholders = ", ".join([f":{key}" for key in filtered_keys])
                columns = ", ".join(filtered_keys)
                insert_stmt = text(f"INSERT INTO {table} ({columns}) VALUES ({placeholders})")

                # Insert rows
                for row in rows:
                    row_dict = dict(zip(keys, row))
                    # Pass only non-generated fields
                    filtered_row_dict = {k: v for k, v in row_dict.items() if k != "search_vector"}
                    await remote_conn.execute(insert_stmt, filtered_row_dict)
                
                await remote_conn.commit()
                print(f"Successfully migrated {len(rows)} rows for {table}.")

                # Reset sequence for primary key 'id'
                try:
                    seq_reset = text(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), coalesce(max(id), 1)) FROM {table}")
                    await remote_conn.execute(seq_reset)
                    await remote_conn.commit()
                    print(f"Sequence reset for {table}.")
                except Exception as e:
                    print(f"Warning: Could not reset sequence for {table}: {e}")

            print("Migration completed successfully!")

if __name__ == "__main__":
    asyncio.run(migrate())
