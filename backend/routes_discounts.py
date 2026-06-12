from fastapi import APIRouter, HTTPException, Request, Depends
from auth_utils import PermissionChecker
from pydantic import BaseModel
from audit_logger import log_activity
from typing import Optional, Any, Dict
from bson import ObjectId

router = APIRouter()

from typing import Optional, Any, Dict, Literal

class Discount(BaseModel):
    id: Optional[str] = None
    name: str
    code: Optional[str] = None # For manual entry at checkout
    type: Literal["Percentage", "Fixed Amount"] = "Percentage"
    value: float
    applicableOn: Literal["All", "Category", "Product"] = "All"
    categoryName: Optional[str] = None
    productName: Optional[str] = None
    validFrom: Optional[str] = None
    validTo: Optional[str] = None
    status: Literal["Active", "Inactive"] = "Active"
    description: Optional[str] = None
    minOrderAmount: float = 0.0
    maxDiscount: Optional[float] = None


def _parse_object_id(discount_id: str) -> ObjectId:
    if not ObjectId.is_valid(discount_id):
        raise HTTPException(status_code=400, detail="Invalid discount id")
    return ObjectId(discount_id)

@router.get("/discounts", dependencies=[Depends(PermissionChecker("discounts", "read"))])
async def get_discounts(request: Request):
    db = request.app.state.db
    discounts = []
    cursor = db.discounts.find()
    async for discount in cursor:
        discount["_id"] = str(discount["_id"])
        discounts.append(discount)
    return discounts


@router.get("/discounts/active")
async def get_active_discounts(request: Request):
    db = request.app.state.db
    discounts = []
    cursor = db.discounts.find({"status": "Active"})
    async for discount in cursor:
        discount["_id"] = str(discount["_id"])
        discounts.append(discount)
    return discounts


@router.get("/discounts/{discount_id}", dependencies=[Depends(PermissionChecker("discounts", "read"))])
async def get_discount_by_id(discount_id: str, request: Request):
    db = request.app.state.db
    discount = await db.discounts.find_one({"_id": _parse_object_id(discount_id)})
    if not discount:
        raise HTTPException(status_code=404, detail="Discount not found")
    discount["_id"] = str(discount["_id"])
    return discount

@router.post("/discounts", dependencies=[Depends(PermissionChecker("discounts", "create"))])
async def add_discount(discount: Discount, request: Request):
    db = request.app.state.db
    disc = discount.dict(exclude_unset=True)
    result = await db.discounts.insert_one(disc)
    disc["_id"] = str(result.inserted_id)
    await log_activity(request, action="Created", module="Discounts", description=f"Created new discount: {disc.get('name')}")
    return disc


@router.put("/discounts/{discount_id}", dependencies=[Depends(PermissionChecker("discounts", "update"))])
async def update_discount(discount_id: str, payload: Dict[str, Any], request: Request):
    db = request.app.state.db
    # Explicitly sanitize input payload keys to prevent mass assignment
    allowed_keys = {
        "name", "code", "type", "value", "applicableOn",
        "categoryName", "productName", "validFrom", "validTo",
        "status", "description", "minOrderAmount", "maxDiscount"
    }
    update_doc = {k: v for k, v in payload.items() if k in allowed_keys}
    result = await db.discounts.update_one(
        {"_id": _parse_object_id(discount_id)},
        {"$set": update_doc},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Discount not found")

    updated = await db.discounts.find_one({"_id": _parse_object_id(discount_id)})
    updated["_id"] = str(updated["_id"])
    await log_activity(request, action="Updated", module="Discounts", description=f"Updated discount: {updated.get('name')}")
    return updated


@router.delete("/discounts/{discount_id}", dependencies=[Depends(PermissionChecker("discounts", "delete"))])
async def delete_discount(discount_id: str, request: Request):
    db = request.app.state.db
    discount = await db.discounts.find_one({"_id": _parse_object_id(discount_id)})
    result = await db.discounts.delete_one({"_id": _parse_object_id(discount_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Discount not found")
    discount_name = discount.get("name") if discount else discount_id
    await log_activity(request, action="Deleted", module="Discounts", description=f"Deleted discount: {discount_name}")
    return {"success": True, "deleted_id": discount_id}
