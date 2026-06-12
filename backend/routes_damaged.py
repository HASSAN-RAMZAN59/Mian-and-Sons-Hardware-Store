from fastapi import APIRouter, HTTPException, Request, Depends
from auth_utils import PermissionChecker
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

from db_utils import normalize_object_ids, parse_object_id

router = APIRouter()


class DamagedStockCreate(BaseModel):
    product_id: str
    quantity: int
    reason: str
    date: str
    status: str = "pending"
    notes: Optional[str] = None


def _damaged_pipeline(match: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    pipeline: List[Dict[str, Any]] = []
    if match:
        pipeline.append({"$match": match})
    pipeline.extend(
        [
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
                    "from": "categories",
                    "localField": "product.category_id",
                    "foreignField": "_id",
                    "as": "category",
                }
            },
            {"$unwind": {"path": "$category", "preserveNullAndEmptyArrays": True}},
        ]
    )
    return pipeline

@router.get("/damaged-stock", dependencies=[Depends(PermissionChecker("damaged", "read"))])
async def get_damaged_stock(request: Request):
    db = request.app.state.db
    records = []
    cursor = db.damaged_stock.aggregate(_damaged_pipeline())
    async for record in cursor:
        records.append(normalize_object_ids(record))
    return records


@router.get("/damaged-stock/{record_id}", dependencies=[Depends(PermissionChecker("damaged", "read"))])
async def get_damaged_stock_by_id(record_id: str, request: Request):
    db = request.app.state.db
    record = await db.damaged_stock.aggregate(
        _damaged_pipeline({"_id": parse_object_id(record_id, "record_id")})
    ).to_list(length=1)
    if not record:
        raise HTTPException(status_code=404, detail="Damaged stock record not found")
    return normalize_object_ids(record[0])

@router.post("/damaged-stock", dependencies=[Depends(PermissionChecker("damaged", "create"))])
async def add_damaged_stock(record: DamagedStockCreate, request: Request):
    db = request.app.state.db
    rec = record.dict(exclude_unset=True)
    rec["product_id"] = parse_object_id(rec.get("product_id"), "product_id")

    product = await db.products.find_one({"_id": rec["product_id"]})
    if not product:
        raise HTTPException(status_code=400, detail="Product not found")

    inventory_item = await db.inventory.find_one({"product_id": rec["product_id"]})
    if not inventory_item:
        raise HTTPException(status_code=400, detail="Inventory item not found")

    current_qty = int(inventory_item.get("quantity") or 0)
    if rec["quantity"] > current_qty:
        raise HTTPException(status_code=400, detail=f"Only {current_qty} units are available")

    value_lost = float(product.get("purchasePrice") or 0) * rec["quantity"]
    rec["valueLost"] = value_lost

    await db.inventory.update_one(
        {"_id": inventory_item["_id"]},
        {"$inc": {"quantity": -rec["quantity"]}},
    )

    result = await db.damaged_stock.insert_one(rec)
    rec["_id"] = result.inserted_id
    return normalize_object_ids(rec)


@router.put("/damaged-stock/{record_id}", dependencies=[Depends(PermissionChecker("damaged", "update"))])
async def update_damaged_stock(record_id: str, payload: Dict[str, Any], request: Request):
    db = request.app.state.db
    update_doc = dict(payload or {})
    update_doc.pop("_id", None)
    update_doc.pop("product", None)
    update_doc.pop("category", None)

    existing = await db.damaged_stock.find_one({"_id": parse_object_id(record_id, "record_id")})
    if not existing:
        raise HTTPException(status_code=404, detail="Damaged stock record not found")

    if "product_id" in update_doc:
        update_doc["product_id"] = parse_object_id(update_doc["product_id"], "product_id")
    product_id = update_doc.get("product_id", existing.get("product_id"))
    quantity = int(update_doc.get("quantity", existing.get("quantity") or 0))

    product = await db.products.find_one({"_id": product_id})
    if not product:
        raise HTTPException(status_code=400, detail="Product not found")

    inventory_item = await db.inventory.find_one({"product_id": product_id})
    if not inventory_item:
        raise HTTPException(status_code=400, detail="Inventory item not found")

    previous_quantity = int(existing.get("quantity") or 0)
    await db.inventory.update_one(
        {"product_id": existing.get("product_id")},
        {"$inc": {"quantity": previous_quantity}},
    )

    current_qty = int(inventory_item.get("quantity") or 0) + previous_quantity
    if quantity > current_qty:
        raise HTTPException(status_code=400, detail=f"Only {current_qty} units are available")

    await db.inventory.update_one(
        {"_id": inventory_item["_id"]},
        {"$inc": {"quantity": -quantity}},
    )

    update_doc["valueLost"] = float(product.get("purchasePrice") or 0) * quantity

    await db.damaged_stock.update_one(
        {"_id": parse_object_id(record_id, "record_id")},
        {"$set": update_doc},
    )

    updated = await db.damaged_stock.aggregate(
        _damaged_pipeline({"_id": parse_object_id(record_id, "record_id")})
    ).to_list(length=1)
    return normalize_object_ids(updated[0])


@router.delete("/damaged-stock/{record_id}", dependencies=[Depends(PermissionChecker("damaged", "delete"))])
async def delete_damaged_stock(record_id: str, request: Request):
    db = request.app.state.db
    existing = await db.damaged_stock.find_one({"_id": parse_object_id(record_id, "record_id")})
    if not existing:
        raise HTTPException(status_code=404, detail="Damaged stock record not found")

    await db.inventory.update_one(
        {"product_id": existing.get("product_id")},
        {"$inc": {"quantity": int(existing.get("quantity") or 0)}},
    )

    result = await db.damaged_stock.delete_one({"_id": parse_object_id(record_id, "record_id")})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Damaged stock record not found")
    return {"success": True, "deleted_id": record_id}

# More CRUD endpoints (update, delete) can be added as needed
