"""
MongoDB Database Migration Script
Migrates data from old 'hardware_store' database to 'Mian_Sons_hardware_db'
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
OLD_DATABASE = "hardware_store"
NEW_DATABASE = "Mian_Sons_hardware_db"

async def migrate_database():
    """Migrate all collections from old database to new database"""
    client = AsyncIOMotorClient(MONGODB_URL)
    
    try:
        print("\n" + "="*70)
        print("MongoDB DATABASE MIGRATION SCRIPT")
        print("="*70)
        
        # Get both databases
        old_db = client[OLD_DATABASE]
        new_db = client[NEW_DATABASE]
        
        # List all databases
        all_dbs = await client.list_database_names()
        print(f"\n📊 Available Databases: {', '.join(all_dbs)}")
        
        # Check if old database exists
        if OLD_DATABASE not in all_dbs:
            print(f"\n⚠️  Old database '{OLD_DATABASE}' not found.")
            print(f"   Proceeding with new database setup: '{NEW_DATABASE}'")
            new_collections = await new_db.list_collection_names()
            print(f"   Existing collections in {NEW_DATABASE}: {new_collections if new_collections else 'None (fresh start)'}")
            client.close()
            return
        
        # Get collections from old database
        old_collections = await old_db.list_collection_names()
        print(f"\n📦 Collections in '{OLD_DATABASE}': {old_collections if old_collections else 'None'}")
        
        # Get collections from new database
        new_collections = await new_db.list_collection_names()
        print(f"📦 Collections in '{NEW_DATABASE}': {new_collections if new_collections else 'None (will be populated)'}")
        
        if not old_collections:
            print(f"\n✓ No data to migrate from '{OLD_DATABASE}'")
            print(f"✓ Using clean database: '{NEW_DATABASE}'")
        else:
            # Migrate each collection
            print(f"\n🔄 Starting migration...\n")
            migration_log = []
            
            for collection_name in old_collections:
                old_collection = old_db[collection_name]
                new_collection = new_db[collection_name]
                
                # Count documents
                doc_count = await old_collection.count_documents({})
                
                if doc_count > 0:
                    # Get all documents
                    documents = await old_collection.find({}).to_list(length=None)
                    
                    # Insert into new database
                    result = await new_collection.insert_many(documents)
                    
                    msg = f"   ✓ {collection_name}: {doc_count} documents migrated"
                    print(msg)
                    migration_log.append(msg)
                else:
                    msg = f"   ○ {collection_name}: Empty collection, skipped"
                    print(msg)
                    migration_log.append(msg)
            
            print(f"\n{'='*70}")
            print("Migration Summary")
            print(f"{'='*70}")
            total_collections = len([m for m in migration_log if '✓' in m])
            print(f"Collections migrated: {total_collections}")
            print(f"Total collections in new DB: {len(await new_db.list_collection_names())}")
        
        # Final verification
        print(f"\n{'='*70}")
        print("Post-Migration Verification")
        print(f"{'='*70}")
        
        final_collections = await new_db.list_collection_names()
        print(f"\n✓ Active Database: {NEW_DATABASE}")
        print(f"✓ Collections in {NEW_DATABASE}:")
        
        if final_collections:
            for col in final_collections:
                count = await new_db[col].count_documents({})
                print(f"   • {col}: {count} documents")
        else:
            print("   (No collections yet - ready for fresh data)")
        
        # Test write operation
        print(f"\n📝 Testing write capability...")
        test_col = new_db["_test_connection"]
        test_doc = {"test": True, "timestamp": datetime.utcnow(), "message": "Connection test"}
        result = await test_col.insert_one(test_doc)
        await test_col.delete_one({"_id": result.inserted_id})
        print(f"✓ Write test successful")
        
        print(f"\n{'='*70}")
        print("✅ Migration Complete!")
        print(f"{'='*70}\n")
        
    except Exception as e:
        print(f"\n❌ Migration Error: {str(e)}")
        raise
    finally:
        client.close()

async def verify_database():
    """Verify the active database configuration"""
    client = AsyncIOMotorClient(MONGODB_URL)
    
    try:
        print("\n" + "="*70)
        print("DATABASE VERIFICATION")
        print("="*70)
        
        new_db = client[NEW_DATABASE]
        
        # Ping database
        await new_db.command('ping')
        print(f"\n✓ MongoDB Connection: Active")
        print(f"✓ Selected Database: {NEW_DATABASE}")
        
        collections = await new_db.list_collection_names()
        print(f"✓ Collections: {collections if collections else 'None (fresh setup)'}")
        
        print(f"\n{'='*70}\n")
        
    except Exception as e:
        print(f"\n❌ Verification Error: {str(e)}")
        raise
    finally:
        client.close()

if __name__ == "__main__":
    print("\nSelect operation:")
    print("1 - Migrate data from old DB to new DB")
    print("2 - Verify database connection")
    print("3 - Both")
    
    choice = input("\nEnter choice (1/2/3): ").strip()
    
    if choice == "1":
        asyncio.run(migrate_database())
    elif choice == "2":
        asyncio.run(verify_database())
    elif choice == "3":
        asyncio.run(migrate_database())
        asyncio.run(verify_database())
    else:
        print("Invalid choice")
