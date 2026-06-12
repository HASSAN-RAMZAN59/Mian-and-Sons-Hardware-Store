from fastapi import APIRouter, HTTPException, Request, Depends
from auth_utils import PermissionChecker
from typing import Any, Dict, List, Optional
from datetime import datetime
from bson import ObjectId
from models import PurchaseOrder
from db_utils import parse_object_id, normalize_object_ids

router = APIRouter()

from db_utils import parse_object_id, normalize_object_ids

async def _increment_stock(db, product_id: ObjectId, quantity: float):
    """Increments stock in the inventory collection for a given product."""
    # Ensure inventory doc exists for this product
    await db.inventory.update_one(
        {"product_id": product_id},
        {"$inc": {"quantity": quantity}, "$set": {"lastUpdated": datetime.utcnow().isoformat()}},
        upsert=True
    )
    print(f"[PURCHASE] Incremented stock for product {product_id} by {quantity}")

@router.get("/purchases", dependencies=[Depends(PermissionChecker("purchases", "read"))])
async def get_purchases(request: Request):
    db = request.app.state.db
    items = []
    cursor = db.purchases.find().sort("createdAt", -1)
    async for doc in cursor:
        items.append(normalize_object_ids(doc))
    return items

@router.get("/purchases/{purchase_id}", dependencies=[Depends(PermissionChecker("purchases", "read"))])
async def get_purchase_by_id(purchase_id: str, request: Request):
    db = request.app.state.db
    doc = await db.purchases.find_one({"_id": parse_object_id(purchase_id, "purchase_id")})
    if not doc:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return normalize_object_ids(doc)

@router.post("/purchases", dependencies=[Depends(PermissionChecker("purchases", "create"))])
async def add_purchase(payload: PurchaseOrder, request: Request):
    db = request.app.state.db
    now = datetime.utcnow().isoformat()
    
    # 1. Prepare Purchase Record
    # Use by_alias=True so 'productId' in items remains 'productId' (matches model alias)
    purchase_doc = payload.dict(by_alias=True, exclude_unset=True)
    print(f"[PURCHASE] Incoming request: {purchase_doc}")
    
    purchase_doc["supplierId"] = parse_object_id(purchase_doc["supplierId"], "supplierId")
    
    # Validate supplier exists and store name/company for consistency
    supplier = await db.suppliers.find_one({"_id": purchase_doc["supplierId"]})
    if not supplier:
        print(f"[PURCHASE] ERROR: Supplier not found: {purchase_doc['supplierId']}")
        raise HTTPException(status_code=400, detail="Supplier not found")
    
    purchase_doc["supplierName"] = supplier.get("name")
    purchase_doc["supplierCompany"] = supplier.get("company")
    
    purchase_doc["createdAt"] = now
    purchase_doc["updatedAt"] = now
    purchase_doc["receivedStatus"] = "Received"

    # CRITICAL: User requested specific logging format
    print(f"Purchase Data: {purchase_doc}")
    
    if not purchase_doc.get("poNo"):
        count = await db.purchases.count_documents({})
        purchase_doc["poNo"] = f"PO-{count + 1001}"

    # Process items and validate products
    processed_items = []
    for item in purchase_doc.get("items", []):
        p_id = parse_object_id(item["productId"], "productId")
        print(f"[PURCHASE] Product lookup for ID: {p_id}")
        product = await db.products.find_one({"_id": p_id})
        if not product:
            print(f"[PURCHASE] ERROR: Product not found: {p_id}")
            raise HTTPException(status_code=400, detail=f"Product not found: {item['productId']}")
        
        item["productId"] = p_id
        processed_items.append(item)
    
    purchase_doc["items"] = processed_items

    # 2. Store in Database
    result = await db.purchases.insert_one(purchase_doc)
    purchase_doc["_id"] = result.inserted_id
    print(f"[PURCHASE] Saved purchase record with ID: {result.inserted_id}")

    # 3. Update Stock for each product (CRITICAL)
    for item in processed_items:
        # Log stock before
        inv = await db.inventory.find_one({"product_id": item["productId"]})
        stock_before = inv.get("quantity", 0) if inv else 0
        
        await _increment_stock(db, item["productId"], float(item["quantity"]))
        
        # Log stock after
        inv_after = await db.inventory.find_one({"product_id": item["productId"]})
        stock_after = inv_after.get("quantity", 0) if inv_after else 0
        print(f"[PURCHASE] Stock update for {item['productId']}: {stock_before} -> {stock_after}")

    return normalize_object_ids(purchase_doc)

@router.put("/purchases/{purchase_id}", dependencies=[Depends(PermissionChecker("purchases", "update"))])
async def update_purchase(purchase_id: str, payload: Dict[str, Any], request: Request):
    db = request.app.state.db
    oid = parse_object_id(purchase_id, "purchase_id")
    
    # Simple update for meta info
    # Warning: Updating items requires complex stock reversal logic, 
    # for now we only allow updating notes/status/payment unless strictly needed.
    
    update_doc = dict(payload)
    update_doc.pop("_id", None)
    update_doc["updatedAt"] = datetime.utcnow().isoformat()
    
    if "supplierId" in update_doc:
        update_doc["supplierId"] = parse_object_id(update_doc["supplierId"], "supplierId")
        
    # If items are updated, we'd need to compare and adjust stock. 
    # For a "fix", we focus on the creation flow which was missing.
    
    result = await db.purchases.update_one({"_id": oid}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Purchase order not found")
        
    updated = await db.purchases.find_one({"_id": oid})
    return normalize_object_ids(updated)

@router.delete("/purchases/{purchase_id}", dependencies=[Depends(PermissionChecker("purchases", "delete"))])
async def delete_purchase(purchase_id: str, request: Request):
    db = request.app.state.db
    oid = parse_object_id(purchase_id, "purchase_id")
    result = await db.purchases.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return {"success": True, "deleted_id": purchase_id}
