#!/usr/bin/env python3
"""
QUICK DATABASE CLEANUP SCRIPT
Removes ALL dummy/static data from MongoDB
Only data added through admin & customer panels will be kept
"""

from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "Mian_Sons_hardware_db")

print("\n" + "="*70)
print("⚠️  DATABASE CLEANUP - REMOVING ALL DUMMY DATA")
print("="*70)
print("\nThis will DELETE all documents from all collections!")
print("Only REAL data from admin & customer panels will be kept.")
print("\n⚠️  WARNING: This action cannot be undone!")
print("\nType 'CLEANUP' to confirm deletion: ", end="")

confirmation = input().strip().upper()

if confirmation != "CLEANUP":
    print("\n❌ Cleanup cancelled. No data was deleted.\n")
    exit(0)

print("\nConnecting to MongoDB...", end="")

try:
    client = MongoClient(MONGODB_URL, serverSelectionTimeoutMS=5000)
    # Test connection
    client.admin.command('ping')
    db = client[DATABASE_NAME]
    print(" ✅ Connected\n")
    
    collections = db.list_collection_names()
    
    print("="*70)
    print("DELETING DOCUMENTS FROM COLLECTIONS:")
    print("="*70 + "\n")
    
    total_deleted = 0
    
    for collection_name in sorted(collections):
        result = db[collection_name].delete_many({})
        deleted_count = result.deleted_count
        total_deleted += deleted_count
        
        if deleted_count > 0:
            print(f"✅ {collection_name:<25} - Deleted {deleted_count:>3} documents")
        else:
            print(f"⏭️  {collection_name:<25} - Already empty")
    
    print("\n" + "="*70)
    print(f"✅ CLEANUP COMPLETE - {total_deleted} documents deleted")
    print("="*70)
    
    print("\n📊 Final Database Status:")
    print("-" * 70)
    total_remaining = 0
    for col in sorted(collections):
        count = db[col].count_documents({})
        total_remaining += count
        status = "✅ EMPTY" if count == 0 else f"⚠️  {count} docs"
        print(f"{status:<10} | {col:<25}")
    
    print("-" * 70)
    if total_remaining == 0:
        print("✅ DATABASE IS CLEAN - All dummy data removed!")
    else:
        print(f"⚠️  {total_remaining} documents remain")
    
    print("\n" + "="*70)
    print("✅ READY TO USE - Start system and add REAL data")
    print("="*70)
    print("\nNext steps:")
    print("1. Start backend:  cd backend && uvicorn main:app --port 8000")
    print("2. Start frontend: npm start")
    print("3. Add real data via admin/customer panels")
    print("4. Data will flow directly to MongoDB ✅\n")
    
    client.close()
    
except Exception as e:
    print(f"\n❌ ERROR: {str(e)}")
    print("Make sure MongoDB is running on localhost:27017\n")
    exit(1)
