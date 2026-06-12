
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
import json

async def audit_db():
    load_dotenv()
    url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    db_name = os.getenv("DATABASE_NAME", "Mian_Sons_hardware_db")
    client = AsyncIOMotorClient(url)
    db = client[db_name]
    
    collections = await db.list_collection_names()
    report = {}
    
    for coll in collections:
        count = await db[coll].count_documents({})
        report[coll] = {
            "count": count,
            "has_data": count > 0
        }
    
    print(json.dumps(report, indent=4))
    client.close()

if __name__ == "__main__":
    asyncio.run(audit_db())
