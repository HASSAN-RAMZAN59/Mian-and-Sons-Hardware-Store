import os
import json
import datetime
from fastapi import APIRouter, HTTPException, Request
from db_config import DatabaseConfig
from audit_logger import log_activity
from bson import ObjectId

router = APIRouter(prefix="/system", tags=["System"])

BACKUP_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "backups"))

def serialize_doc(doc):
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    if isinstance(doc, dict):
        return {k: serialize_doc(v) for k, v in doc.items()}
    if isinstance(doc, ObjectId):
        return {"$oid": str(doc)}
    if isinstance(doc, datetime.datetime):
        return {"$date": doc.isoformat()}
    return doc

def deserialize_doc(doc):
    if isinstance(doc, list):
        return [deserialize_doc(item) for item in doc]
    if isinstance(doc, dict):
        if len(doc) == 1:
            if "$oid" in doc:
                return ObjectId(doc["$oid"])
            if "$date" in doc:
                try:
                    return datetime.datetime.fromisoformat(doc["$date"])
                except Exception:
                    return doc["$date"]
        return {k: deserialize_doc(v) for k, v in doc.items()}
    return doc

@router.get("/backup/status")
async def get_backup_status(request: Request):
    db = request.app.state.db
    # Get the latest backup entry from the backups collection
    last_backup = await db.backups.find_one(sort=[("timestamp", -1)])
    if last_backup:
        return {
            "lastBackupDate": last_backup.get("timestamp"),
            "filename": last_backup.get("filename"),
            "size": last_backup.get("size")
        }
    return {
        "lastBackupDate": "Never",
        "filename": None,
        "size": 0
    }

@router.post("/backup")
async def backup_database(request: Request):
    db = request.app.state.db
    try:
        if not os.path.exists(BACKUP_DIR):
            os.makedirs(BACKUP_DIR, exist_ok=True)
            
        timestamp = datetime.datetime.utcnow().isoformat().replace(":", "-").split(".")[0]
        filename = f"backup_{timestamp}.json"
        filepath = os.path.join(BACKUP_DIR, filename)
        
        backup_data = {}
        for key, col_name in DatabaseConfig.COLLECTIONS.items():
            if col_name == 'backups':
                continue
            cursor = db[col_name].find()
            docs = []
            async for doc in cursor:
                docs.append(serialize_doc(doc))
            backup_data[col_name] = docs
            
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(backup_data, f, indent=2, ensure_ascii=False)
            
        file_size = os.path.getsize(filepath)
        timestamp_str = datetime.datetime.utcnow().strftime("%d/%m/%Y, %H:%M:%S")
        
        backup_entry = {
            "timestamp": timestamp_str,
            "filename": filename,
            "size": file_size,
            "createdAt": datetime.datetime.utcnow()
        }
        
        await db.backups.insert_one(backup_entry)
        await log_activity(request, action="Created", module="Backup", description=f"Created database backup: {filename} ({file_size} bytes)")
        
        return {
            "status": "success",
            "lastBackupDate": timestamp_str,
            "filename": filename,
            "size": file_size
        }
    except Exception as e:
        print("[BACKUP ERROR]", e)
        raise HTTPException(status_code=500, detail=f"Backup failed: {str(e)}")

@router.post("/backup/restore")
async def restore_database(request: Request):
    db = request.app.state.db
    try:
        # Get the latest backup file or entry
        last_backup = await db.backups.find_one(sort=[("timestamp", -1)])
        if not last_backup:
            # Fallback: look at files in backups/ directory
            if os.path.exists(BACKUP_DIR):
                files = [f for f in os.listdir(BACKUP_DIR) if f.startswith("backup_") and f.endswith(".json")]
                if files:
                    files.sort()
                    filename = files[-1]
                else:
                    raise HTTPException(status_code=400, detail="No backup snapshot found to restore.")
            else:
                raise HTTPException(status_code=400, detail="No backups found in backups/ directory.")
        else:
            filename = last_backup.get("filename")
            
        filepath = os.path.join(BACKUP_DIR, filename)
        if not os.path.exists(filepath):
            raise HTTPException(status_code=404, detail=f"Backup file {filename} not found on disk.")
            
        with open(filepath, "r", encoding="utf-8") as f:
            backup_data = json.load(f)
            
        # Overwrite collections one by one
        for col_name, docs_list in backup_data.items():
            # Drop or delete all in collection
            await db[col_name].delete_many({})
            if docs_list:
                deserialized_docs = [deserialize_doc(d) for d in docs_list]
                await db[col_name].insert_many(deserialized_docs)
                
        await log_activity(request, action="Restored", module="Backup", description=f"Restored database from snapshot: {filename}")
        return {"status": "success", "message": "Database restored successfully."}
    except Exception as e:
        print("[RESTORE ERROR]", e)
        raise HTTPException(status_code=500, detail=f"Restore failed: {str(e)}")

@router.get("/backup/export")
async def export_database(request: Request):
    db = request.app.state.db
    try:
        backup_data = {}
        for key, col_name in DatabaseConfig.COLLECTIONS.items():
            if col_name == 'backups':
                continue
            cursor = db[col_name].find()
            docs = []
            async for doc in cursor:
                docs.append(serialize_doc(doc))
            backup_data[col_name] = docs
            
        # Return complete database state as JSON
        await log_activity(request, action="Exported", module="Backup", description="Exported complete database schema and records")
        return backup_data
    except Exception as e:
        print("[EXPORT ERROR]", e)
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@router.get("/settings/{key}")
async def get_setting(key: str, request: Request):
    db = request.app.state.db
    doc = await db.settings.find_one({"_id": key})
    if doc:
        return doc.get("data", {})
    return {}

@router.post("/settings/{key}")
async def save_setting(key: str, payload: dict, request: Request):
    db = request.app.state.db
    await db.settings.update_one(
        {"_id": key},
        {"$set": {"data": payload, "updatedAt": datetime.datetime.utcnow()}},
        upsert=True
    )
    await log_activity(request, action="Updated", module="Settings", description=f"Updated system setting configuration: {key}")
    return {"status": "success", "data": payload}
