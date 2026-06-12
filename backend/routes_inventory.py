from fastapi import APIRouter, HTTPException, Request

from typing import Any, Dict, List, Optional

from db_utils import normalize_object_ids, parse_object_id
from models import InventoryItem

router = APIRouter()


def _inventory_pipeline(match: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    pipeline: List[Dict[str, Any]] = []
    if match:
        pipeline.append({"$match": match})
    pipeline.extend(
        [
            {
                "$lookup": {
                    "from": "inventory",
                    "localField": "_id",
                    "foreignField": "product_id",
                    "as": "inventory",
                }
            },
            {"$unwind": {"path": "$inventory", "preserveNullAndEmptyArrays": True}},
            {
                "$lookup": {
                    "from": "categories",
                    "localField": "category_id",
                    "foreignField": "_id",
                    "as": "category",
                }
            },
            {"$unwind": {"path": "$category", "preserveNullAndEmptyArrays": True}},
            {
                "$lookup": {
                    "from": "branches",
                    "localField": "inventory.branch_id",
                    "foreignField": "_id",
                    "as": "branch",
                }
            },
            {"$unwind": {"path": "$branch", "preserveNullAndEmptyArrays": True}},
            {
                "$addFields": {
                    "product_id": "$_id",
                    "inventory_id": "$inventory._id",
                    "quantity": {"$ifNull": ["$inventory.quantity", 0]},
                    "minStock": {"$ifNull": ["$inventory.minStock", 0]},
                    "maxStock": {"$ifNull": ["$inventory.maxStock", 0]},
                    "branch_id": "$inventory.branch_id",
                }
            },
            {
                "$addFields": {
                    "product": {
                        "_id": "$_id",
                        "name": "$name",
                        "size": "$size",
                        "purchasePrice": "$purchasePrice",
                        "unit": "$unit",
                        "category_id": "$category_id",
                        "company": "$company",
                        "type": "$type",
                        "category": "$category",
                    }
                }
            },
        ]
    )
    return pipeline


@router.get("/inventory")
async def get_inventory(request: Request):
    db = request.app.state.db
    inventory = []
    
    # Aggregate latest purchase dates for all products
    purchase_dates = {}
    try:
        pipeline = [
            {"$unwind": "$items"},
            {
                "$group": {
                    "_id": "$items.productId",
                    "lastPurchaseDate": {"$max": "$date"}
                }
            }
        ]
        async for res in db.purchases.aggregate(pipeline):
            if res.get("_id"):
                purchase_dates[str(res["_id"])] = res.get("lastPurchaseDate")
    except Exception as e:
        print("[ERROR AGGREGATING PURCHASE DATES]", e)
    
    # Get all products with inventory data
    cursor = db.products.aggregate(_inventory_pipeline())
    async for item in cursor:
        mapped = normalize_object_ids(item)
        inventory_id = mapped.get("inventory_id")
        product_id = mapped.get("product_id")
        if inventory_id:
            mapped["_id"] = inventory_id
        elif product_id:
            mapped["_id"] = product_id
            
        # Add dynamic lastPurchaseDate
        p_id_str = str(product_id) if product_id else ""
        mapped["lastPurchaseDate"] = purchase_dates.get(p_id_str)
        inventory.append(mapped)
    
    # Get all product IDs we've already added
    existing_product_ids = {str(item.get("product_id")) for item in inventory if item.get("product_id")}
    
    # Get all products that don't have inventory records yet
    all_products = await db.products.find().to_list(length=None)
    for product in all_products:
        product_id_str = str(product.get("_id"))
        if product_id_str not in existing_product_ids:
            # Add product with default/empty inventory values
            product_normalized = normalize_object_ids(product)
            product_normalized["product_id"] = product_normalized.get("_id")
            product_normalized["product"] = {
                "_id": product_normalized.get("_id"),
                "name": product_normalized.get("name", ""),
                "size": product_normalized.get("size", ""),
                "purchasePrice": product_normalized.get("purchasePrice", 0),
                "unit": product_normalized.get("unit", "pcs"),
                "category_id": product_normalized.get("category_id"),
                "company": product_normalized.get("company", ""),
                "type": product_normalized.get("type", ""),
                "category": {"name": product_normalized.get("category", "Uncategorized")}
            }
            product_normalized["quantity"] = 0
            product_normalized["minStock"] = 0
            product_normalized["maxStock"] = 0
            product_normalized["branch"] = {}
            product_normalized["_id"] = product_normalized.get("_id")
            
            # Add dynamic lastPurchaseDate
            product_normalized["lastPurchaseDate"] = purchase_dates.get(product_id_str)
            inventory.append(product_normalized)
    
    return inventory

@router.post("/inventory")
async def add_inventory_item(item: InventoryItem, request: Request):
    db = request.app.state.db
    inv = item.dict(exclude_unset=True)
    inv["product_id"] = parse_object_id(inv.get("product_id"), "product_id")
    if inv.get("branch_id"):
        inv["branch_id"] = parse_object_id(inv.get("branch_id"), "branch_id")
    product = await db.products.find_one({"_id": inv["product_id"]})
    if not product:
        raise HTTPException(status_code=400, detail="Product not found")
    if inv.get("branch_id"):
        branch = await db.branches.find_one({"_id": inv["branch_id"]})
        if not branch:
            raise HTTPException(status_code=400, detail="Branch not found")
    result = await db.inventory.insert_one(inv)
    inv["_id"] = result.inserted_id
    return normalize_object_ids(inv)


@router.put("/inventory/{item_id}")
async def update_inventory_item(item_id: str, payload: dict, request: Request):
    db = request.app.state.db
    update_doc = dict(payload or {})
    update_doc.pop("_id", None)
    update_doc.pop("product", None)
    update_doc.pop("branch", None)
    update_doc.pop("category", None)

    if "currentStock" in update_doc:
        update_doc["quantity"] = update_doc.pop("currentStock")
    if "product_id" in update_doc:
        update_doc["product_id"] = parse_object_id(update_doc["product_id"], "product_id")
    if "branch_id" in update_doc:
        update_doc["branch_id"] = parse_object_id(update_doc["branch_id"], "branch_id")

    if update_doc.get("product_id"):
        product = await db.products.find_one({"_id": update_doc["product_id"]})
        if not product:
            raise HTTPException(status_code=400, detail="Product not found")
    if update_doc.get("branch_id"):
        branch = await db.branches.find_one({"_id": update_doc["branch_id"]})
        if not branch:
            raise HTTPException(status_code=400, detail="Branch not found")

    parsed_item_id = parse_object_id(item_id, "item_id")
    inventory_doc = await db.inventory.find_one({"_id": parsed_item_id})
    if inventory_doc:
        await db.inventory.update_one({"_id": parsed_item_id}, {"$set": update_doc})
        product_id = inventory_doc.get("product_id")
    else:
        product = await db.products.find_one({"_id": parsed_item_id})
        if not product:
            raise HTTPException(status_code=404, detail="Inventory item not found")
        update_doc["product_id"] = parsed_item_id
        await db.inventory.update_one({"product_id": parsed_item_id}, {"$set": update_doc}, upsert=True)
        product_id = parsed_item_id

    updated = await db.products.aggregate(
        _inventory_pipeline({"_id": product_id})
    ).to_list(length=1)
    if not updated:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    mapped = normalize_object_ids(updated[0])
    if mapped.get("inventory_id"):
        mapped["_id"] = mapped.get("inventory_id")
    return mapped

@router.post("/stock-transfers")
async def create_stock_transfer(payload: dict, request: Request):
    from datetime import datetime
    db = request.app.state.db
    
    from_branch_id = parse_object_id(payload.get("from"), "from")
    to_branch_id = parse_object_id(payload.get("to"), "to")
    product_val = payload.get("product")
    quantity = float(payload.get("quantity") or 0)
    
    if quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than zero")
        
    product_oid = parse_object_id(product_val, "product")
    
    # Resolve product_id if it's an inventory record id
    inv_rec = await db.inventory.find_one({"_id": product_oid})
    if inv_rec:
        product_id = inv_rec.get("product_id")
    else:
        product_id = product_oid
        
    # Find source inventory
    source_inv = await db.inventory.find_one({
        "product_id": product_id,
        "branch_id": from_branch_id
    })
    
    if not source_inv or float(source_inv.get("quantity") or 0) < quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock in source branch")
        
    # Deduct from source branch
    await db.inventory.update_one(
        {"_id": source_inv["_id"]},
        {"$inc": {"quantity": -quantity}, "$set": {"lastUpdated": datetime.utcnow().isoformat()}}
    )
    
    # Add to destination branch
    await db.inventory.update_one(
        {"product_id": product_id, "branch_id": to_branch_id},
        {"$inc": {"quantity": quantity}, "$set": {"lastUpdated": datetime.utcnow().isoformat()}},
        upsert=True
    )
    
    # Save transfer log
    transfer_doc = {
        "from_branch_id": from_branch_id,
        "to_branch_id": to_branch_id,
        "product_id": product_id,
        "quantity": quantity,
        "createdAt": datetime.utcnow().isoformat()
    }
    result = await db.stock_transfers.insert_one(transfer_doc)
    transfer_doc["_id"] = result.inserted_id
    
    return normalize_object_ids(transfer_doc)

@router.get("/stock-transfers")
async def get_stock_transfers(request: Request):
    db = request.app.state.db
    transfers = []
    
    pipeline = [
        {
            "$lookup": {
                "from": "branches",
                "localField": "from_branch_id",
                "foreignField": "_id",
                "as": "from_branch_data"
            }
        },
        {"$unwind": {"path": "$from_branch_data", "preserveNullAndEmptyArrays": True}},
        {
            "$lookup": {
                "from": "branches",
                "localField": "to_branch_id",
                "foreignField": "_id",
                "as": "to_branch_data"
            }
        },
        {"$unwind": {"path": "$to_branch_data", "preserveNullAndEmptyArrays": True}},
        {
            "$lookup": {
                "from": "products",
                "localField": "product_id",
                "foreignField": "_id",
                "as": "product_data"
            }
        },
        {"$unwind": {"path": "$product_data", "preserveNullAndEmptyArrays": True}},
    ]
    
    cursor = db.stock_transfers.aggregate(pipeline)
    async for doc in cursor:
        # Map fields to match what the frontend expects
        mapped = normalize_object_ids(doc)
        mapped["fromBranchName"] = mapped.get("from_branch_data", {}).get("name", "Unknown Branch")
        mapped["toBranchName"] = mapped.get("to_branch_data", {}).get("name", "Unknown Branch")
        prod = mapped.get("product_data", {})
        mapped["productName"] = f"{prod.get('name', '')} {prod.get('size', '')}".strip() or "Unknown Product"
        transfers.append(mapped)
        
    return transfers

