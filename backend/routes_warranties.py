from fastapi import APIRouter, HTTPException, Request, Depends
from auth_utils import PermissionChecker
from typing import Any, Dict, List, Optional
from datetime import datetime

from db_utils import normalize_object_ids, parse_object_id
from models import Warranty

router = APIRouter()

@router.get("/warranties", dependencies=[Depends(PermissionChecker("warranties", "read"))])
async def get_warranties(request: Request):
    db = request.app.state.db
    warranties = []
    pipeline = [
        {
            "$lookup": {
                "from": "products",
                "localField": "product_id",
                "foreignField": "_id",
                "as": "product",
            }
        },
        {"$unwind": {"path": "$product", "preserveNullAndEmptyArrays": True}},
        {
            "$lookup": {
                "from": "customers",
                "localField": "customer_id",
                "foreignField": "_id",
                "as": "customer",
            }
        },
        {"$unwind": {"path": "$customer", "preserveNullAndEmptyArrays": True}},
        {
            "$lookup": {
                "from": "orders",
                "localField": "sale_id",
                "foreignField": "_id",
                "as": "sale",
            }
        },
        {"$unwind": {"path": "$sale", "preserveNullAndEmptyArrays": True}},
        {"$sort": {"createdAt": -1}}
    ]
    cursor = db.warranties.aggregate(pipeline)
    async for war in cursor:
        warranties.append(normalize_object_ids(war))
    return warranties

@router.get("/warranties/{warranty_id}", dependencies=[Depends(PermissionChecker("warranties", "read"))])
async def get_warranty_by_id(warranty_id: str, request: Request):
    db = request.app.state.db
    pipeline = [
        {"$match": {"_id": parse_object_id(warranty_id, "warranty_id")}},
        {
            "$lookup": {
                "from": "products",
                "localField": "product_id",
                "foreignField": "_id",
                "as": "product",
            }
        },
        {"$unwind": {"path": "$product", "preserveNullAndEmptyArrays": True}},
        {
            "$lookup": {
                "from": "customers",
                "localField": "customer_id",
                "foreignField": "_id",
                "as": "customer",
            }
        },
        {"$unwind": {"path": "$customer", "preserveNullAndEmptyArrays": True}},
        {
            "$lookup": {
                "from": "orders",
                "localField": "sale_id",
                "foreignField": "_id",
                "as": "sale",
            }
        },
        {"$unwind": {"path": "$sale", "preserveNullAndEmptyArrays": True}},
    ]
    result = await db.warranties.aggregate(pipeline).to_list(length=1)
    if not result:
        raise HTTPException(status_code=404, detail="Warranty not found")
    return normalize_object_ids(result[0])

@router.post("/warranties")
async def add_warranty(warranty: Warranty, request: Request):
    db = request.app.state.db
    war = warranty.dict(exclude_unset=True)
    
    # Standardize IDs
    war["product_id"] = parse_object_id(war.get("product_id"), "product_id")
    war["customer_id"] = parse_object_id(war.get("customer_id"), "customer_id")
    if war.get("sale_id"):
        war["sale_id"] = parse_object_id(war.get("sale_id"), "sale_id")

    # Validation
    product = await db.products.find_one({"_id": war["product_id"]})
    if not product:
        raise HTTPException(status_code=400, detail="Product not found")
    customer = await db.customers.find_one({"_id": war["customer_id"]})
    if not customer:
        raise HTTPException(status_code=400, detail="Customer not found")
    if war.get("sale_id"):
        sale = await db.orders.find_one({"_id": war["sale_id"]})
        if not sale:
            raise HTTPException(status_code=400, detail="Sale not found")

    war.setdefault("createdAt", datetime.utcnow().isoformat())
    war.setdefault("updatedAt", datetime.utcnow().isoformat())
    
    result = await db.warranties.insert_one(war)
    war["_id"] = result.inserted_id
    return normalize_object_ids(war)

@router.put("/warranties/{warranty_id}", dependencies=[Depends(PermissionChecker("warranties", "update"))])
async def update_warranty(warranty_id: str, payload: Dict[str, Any], request: Request):
    db = request.app.state.db
    existing = await db.warranties.find_one({"_id": parse_object_id(warranty_id, "warranty_id")})
    if not existing:
        raise HTTPException(status_code=404, detail="Warranty not found")

    update_doc = dict(payload)
    update_doc.pop("_id", None)
    update_doc["updatedAt"] = datetime.utcnow().isoformat()
    
    # Coerce IDs if present
    if "product_id" in update_doc:
        update_doc["product_id"] = parse_object_id(update_doc["product_id"], "product_id")
    if "customer_id" in update_doc:
        update_doc["customer_id"] = parse_object_id(update_doc["customer_id"], "customer_id")
    if "sale_id" in update_doc:
        update_doc["sale_id"] = parse_object_id(update_doc["sale_id"], "sale_id")

    result = await db.warranties.update_one(
        {"_id": parse_object_id(warranty_id, "warranty_id")},
        {"$set": update_doc}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Warranty not found")

    if update_doc.get("status") == "Claimed" and existing.get("status") != "Claimed":
        customer_id = update_doc.get("customer_id") or existing.get("customer_id")
        product_name = existing.get("product_name") or existing.get("product", {}).get("name") or "your product"
        await db.notifications.insert_one({
            "customer_id": str(customer_id) if customer_id else None,
            "title": "Warranty Claimed",
            "message": f"Your warranty claim for {product_name} has been approved by Super Admin.",
            "type": "success",
            "target": "/customer/account",
            "created_at": datetime.utcnow().isoformat(),
            "read": False,
        })
        
    updated = await db.warranties.find_one({"_id": parse_object_id(warranty_id, "warranty_id")})
    return normalize_object_ids(updated)

@router.delete("/warranties/{warranty_id}", dependencies=[Depends(PermissionChecker("warranties", "delete"))])
async def delete_warranty(warranty_id: str, request: Request):
    db = request.app.state.db
    result = await db.warranties.delete_one({"_id": parse_object_id(warranty_id, "warranty_id")})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Warranty not found")
    return {"success": True}
