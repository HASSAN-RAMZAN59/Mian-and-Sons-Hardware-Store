from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from audit_logger import log_activity
from auth_utils import get_current_user, PermissionChecker

router = APIRouter()

class AuditLog(BaseModel):
    id: Optional[str] = None
    action: str
    user_id: Optional[str] = None
    timestamp: Optional[str] = None
    details: Optional[str] = None

@router.get("/audit", dependencies=[Depends(PermissionChecker("audit", "read"))])
async def get_audit_logs(request: Request):
    db = request.app.state.db
    logs = []
    cursor = db.audit.find().sort("timestamp", -1)
    async for log in cursor:
        log["_id"] = str(log["_id"])
        log["id"] = log["_id"]
        logs.append(log)
    return logs

@router.post("/audit", dependencies=[Depends(PermissionChecker("audit", "create"))])
async def add_audit_log(audit: AuditLog, request: Request):
    db = request.app.state.db
    log = audit.dict(exclude_unset=True)
    result = await db.audit.insert_one(log)
    log["_id"] = str(result.inserted_id)
    return log

@router.delete("/audit")
async def clear_audit_logs(request: Request, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Only superadmin can clear audit logs")
    db = request.app.state.db
    result = await db.audit.delete_many({})
    await log_activity(request, action="Deleted", module="Audit", description="Cleared all system audit logs")
    return {"success": True, "deleted_count": result.deleted_count}
