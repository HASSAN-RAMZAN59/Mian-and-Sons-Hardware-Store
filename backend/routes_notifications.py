from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from bson import ObjectId

router = APIRouter()

from typing import Optional, List

class Notification(BaseModel):
    id: Optional[str] = None
    customer_id: Optional[str] = None
    user_id: Optional[str] = None
    roles: Optional[List[str]] = None
    title: Optional[str] = None
    message: str
    type: Optional[str] = None
    target: Optional[str] = None
    created_at: Optional[str] = None
    read: bool = False

@router.get("/notifications")
async def get_notifications(
    request: Request,
    customer_id: Optional[str] = None,
    customer_email: Optional[str] = None,
    customer_phone: Optional[str] = None,
    role: Optional[str] = None,
    user_id: Optional[str] = None,
):
    db = request.app.state.db
    notifications = []
    
    # 1. Customer-specific query path (Storefront user)
    if customer_id or customer_email or customer_phone:
        or_filters = []
        if customer_id:
            or_filters.append({"customer_id": customer_id})
            if ObjectId.is_valid(customer_id):
                or_filters.append({"customer_id": ObjectId(customer_id)})
        if customer_email:
            normalized_email = str(customer_email).strip().lower()
            if normalized_email:
                or_filters.append({"customer_email": normalized_email})
        if customer_phone:
            normalized_phone = str(customer_phone).strip()
            if normalized_phone:
                or_filters.append({"customer_phone": normalized_phone})
        
        query = {"$or": or_filters}
        
    # 2. Role-based / Admin-specific query path
    else:
        user_role = str(role).strip().lower() if role else "cashier"
        
        # Admin users only see system-level notifications (i.e. those without a customer_id)
        # OR notifications specifically targeted to their user_id.
        system_filter = {"customer_id": {"$exists": False}}
        if user_id:
            query = {
                "$or": [
                    system_filter,
                    {"user_id": user_id}
                ]
            }
        else:
            query = system_filter
            
        # Add role-based visibility rules:
        # A notification is visible if the user's role is in its "roles" list,
        # OR (if no specific roles list is defined) it matches default type-based filters:
        # - cashier: ONLY see success (sales/pos)
        # - manager: see success, warning, info
        # - admin: see success, warning, info
        # - superadmin: see all (success, warning, info, danger, error, etc.)
        role_filter = [{"roles": user_role}]
        
        if user_role == "superadmin":
            role_filter.append({"roles": {"$exists": False}})
        elif user_role in ["admin", "manager"]:
            role_filter.append({
                "roles": {"$exists": False},
                "type": {"$in": ["success", "warning", "info", None]}
            })
        elif user_role == "cashier":
            role_filter.append({
                "roles": {"$exists": False},
                "type": "success"
            })
        else:
            role_filter.append({
                "roles": {"$exists": False},
                "type": "success"
            })
            
        if "$or" in query:
            query = {"$and": [query, {"$or": role_filter}]}
        else:
            query["$or"] = role_filter

    print(f"[DEBUG NOTIFICATIONS] Querying notifications for role={role}, user_id={user_id}. Query={query}")
    cursor = db.notifications.find(query).sort("created_at", -1)
    async for note in cursor:
        note["_id"] = str(note["_id"])
        notifications.append(note)
    return notifications

@router.post("/notifications")
async def add_notification(notification: Notification, request: Request):
    db = request.app.state.db
    note = notification.dict(exclude_unset=True)
    note.setdefault("created_at", datetime.utcnow().isoformat())
    note.setdefault("read", False)
    result = await db.notifications.insert_one(note)
    note["_id"] = str(result.inserted_id)
    return note


@router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, request: Request):
    db = request.app.state.db
    try:
        oid = ObjectId(notification_id)
    except Exception:
        # try matching by string id field
        oid = None

    query = {"_id": oid} if oid is not None else {"_id": notification_id}
    result = await db.notifications.update_one(query, {"$set": {"read": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"ok": True}
