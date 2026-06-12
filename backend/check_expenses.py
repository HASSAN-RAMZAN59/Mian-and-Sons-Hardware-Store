import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def check_db():
    load_dotenv()
    url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    db_name = os.getenv("DATABASE_NAME", "Mian_Sons_hardware_db")
    
    print(f"Connecting to {url} / {db_name}")
    client = AsyncIOMotorClient(url)
    db = client[db_name]
    
    # Check 'expenses' collection
    expenses_count = await db.expenses.count_documents({})
    print(f"Collection 'expenses' count: {expenses_count}")
    
    # Check 'transactions' collection for expenses
    tx_expenses_count = await db.transactions.count_documents({"type": "expense"})
    print(f"Collection 'transactions' (type:expense) count: {tx_expenses_count}")
    
    # List collections 
    names = await db.list_collection_names()
    print(f"All collections: {names}")

if __name__ == "__main__":
    asyncio.run(check_db())
