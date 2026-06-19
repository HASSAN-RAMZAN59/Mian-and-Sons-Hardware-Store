from fastapi import APIRouter, HTTPException, Request, File, UploadFile, Depends
from auth_utils import PermissionChecker
import os
import shutil
from typing import Any, Dict, List
import cloudinary
import cloudinary.uploader

from db_utils import normalize_object_ids, parse_object_id
from models import ProductCreate
from audit_logger import log_activity

# Cloudinary Configuration
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", "ddn2sk1jy"),
    api_key=os.getenv("CLOUDINARY_API_KEY", "923157939598755"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET", "vUt8j_T2uRxsDfNOomkjPSHqIgw"),
    secure=True
)

router = APIRouter()


def _to_float(value, field_name: str) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail=f"{field_name} must be a valid number")


def _parse_object_id(product_id: str):
    return parse_object_id(product_id, "product_id")

def _products_pipeline(match: Dict[str, Any] = None) -> List[Dict[str, Any]]:
    pipeline = []
    if match:
        pipeline.append({"$match": match})
    pipeline.extend(
        [
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
                    "from": "brands",
                    "localField": "brand_id",
                    "foreignField": "_id",
                    "as": "brand",
                }
            },
            {"$unwind": {"path": "$brand", "preserveNullAndEmptyArrays": True}},
            {
                "$lookup": {
                    "from": "suppliers",
                    "localField": "supplier_id",
                    "foreignField": "_id",
                    "as": "supplier_lookup",
                }
            },
            {"$unwind": {"path": "$supplier_lookup", "preserveNullAndEmptyArrays": True}},
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
                "$addFields": {
                    "currentStock": {"$ifNull": ["$inventory.quantity", 0]},
                    "minStock": {"$ifNull": ["$inventory.minStock", 0]},
                    "maxStock": {"$ifNull": ["$inventory.maxStock", 0]},
                }
            },
        ]
    )
    return pipeline


@router.get("/products")
async def get_products(request: Request):
    db = request.app.state.db
    products = []
    try:
        cursor = db.products.aggregate(_products_pipeline())
        async for product in cursor:
            mapped = normalize_object_ids(product)
            category_obj = mapped.get("category")
            if isinstance(category_obj, dict) and category_obj.get("name"):
                mapped["category"] = category_obj.get("name")
            brand_obj = mapped.get("brand")
            # Prefer joined brand name, fallback to company string if present
            if isinstance(brand_obj, dict) and brand_obj.get("name"):
                mapped["brand"] = brand_obj.get("name")
            else:
                mapped["brand"] = mapped.get("company") or mapped.get("brand")
            supplier_obj = mapped.get("supplier_lookup")
            if isinstance(supplier_obj, dict) and supplier_obj.get("name"):
                mapped["supplier"] = supplier_obj.get("name")
            else:
                mapped["supplier"] = mapped.get("supplier")
            mapped["stockQty"] = mapped.get("currentStock", 0)
            mapped["stock"] = mapped.get("currentStock", 0)
            products.append(mapped)
        return products
    except Exception as e:
        print("ERROR in GET /products:", e)
        raise HTTPException(status_code=500, detail=str(e))
@router.post("/products/upload", dependencies=[Depends(PermissionChecker("products", "create"))])
async def upload_product_image(file: UploadFile = File(...)):
    try:
        # Reset file stream head to read
        file.file.seek(0)
        # Upload the file directly to Cloudinary
        upload_result = cloudinary.uploader.upload(
            file.file,
            folder="products",
            resource_type="image"
        )
        secure_url = upload_result.get("secure_url")
        if not secure_url:
            raise Exception("Cloudinary upload failed - secure_url not found in response")
        return {"filename": secure_url}
    except Exception as e:
        print("ERROR in /products/upload (Cloudinary):", e)
        # Fallback to local upload so that the site doesn't break if there's any temporary Cloudinary issue
        try:
            file.file.seek(0)
            upload_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "public", "images", "products"))
            if not os.path.exists(upload_dir):
                os.makedirs(upload_dir, exist_ok=True)
            
            import uuid
            ext = os.path.splitext(file.filename)[1].lower() or ".png"
            safe_filename = f"{uuid.uuid4().hex}{ext}"
            file_path = os.path.join(upload_dir, safe_filename)
            
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
                
            return {"filename": f"/images/products/{safe_filename}"}
        except Exception as local_err:
            print("ERROR in /products/upload (local fallback):", local_err)
            raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/products", dependencies=[Depends(PermissionChecker("products", "create"))])
async def add_product(payload: ProductCreate, request: Request):
    db = request.app.state.db
    try:
        payload_dict = payload.dict(exclude_unset=True)
        print("POST /products called with:", payload_dict)

        name = str(payload.name).strip()
        if not name:
            raise HTTPException(status_code=400, detail="name is required")

        category_id = parse_object_id(payload.category_id, "category_id")
        category_name = payload.category
        if category_id is None and category_name:
            category_doc = await db.categories.find_one({"name": category_name})
            if category_doc:
                category_id = category_doc.get("_id")

        prod: Dict[str, Any] = {
            "name": name,
            "code": payload.code,
            "size": payload.size,
            "company": payload.company,
            "type": payload.type,
            "category": category_name,
            "description": payload.description,
            "purchasePrice": _to_float(payload.purchasePrice, "purchasePrice"),
            "salePrice": _to_float(payload.salePrice, "salePrice"),
            "unit": payload.unit,
            "tags": payload.tags if isinstance(payload.tags, list) else [],
            "image": payload.image,
            "category_id": category_id,
            "brand_id": parse_object_id(payload.brand_id, "brand_id"),
            "supplier_id": parse_object_id(payload.supplier_id, "supplier_id"),
            "supplier": payload.supplier,
            "branch": payload.branch,
            "status": payload.status or "Active",
        }

        print("Product dict:", prod)
        result = await db.products.insert_one(prod)
        print("Insert result:", result)
        prod_id = result.inserted_id
        current_stock = payload.currentStock if payload.currentStock is not None else 0
        inventory_doc = {
            "product_id": prod_id,
            "quantity": int(current_stock or 0),
            "minStock": int(payload.minStock or 0),
            "maxStock": int(payload.maxStock or 0),
        }
        await db.inventory.update_one(
            {"product_id": prod_id},
            {"$set": inventory_doc},
            upsert=True,
        )

        prod["_id"] = prod_id
        prod["currentStock"] = int(current_stock or 0)
        prod["minStock"] = int(payload.minStock or 0)
        prod["maxStock"] = int(payload.maxStock or 0)
        prod["stockQty"] = prod["currentStock"]
        prod["stock"] = prod["currentStock"]
        # Expose `brand` for frontend convenience when brand_id is not set
        if not prod.get("brand"):
            prod["brand"] = prod.get("company")
        await log_activity(request, action="Created", module="Products", description=f"Added product: {prod.get('name')} (Price: Rs {prod.get('salePrice')})")
        return normalize_object_ids(prod)
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        print("ERROR in POST /products:", e)
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/products/{product_id}")
async def get_product_by_id(product_id: str, request: Request):
    db = request.app.state.db
    product = await db.products.aggregate(
        _products_pipeline({"_id": _parse_object_id(product_id)})
    ).to_list(length=1)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    mapped = normalize_object_ids(product[0])
    category_obj = mapped.get("category")
    if isinstance(category_obj, dict) and category_obj.get("name"):
        mapped["category"] = category_obj.get("name")
    brand_obj = mapped.get("brand")
    if isinstance(brand_obj, dict) and brand_obj.get("name"):
        mapped["brand"] = brand_obj.get("name")
    else:
        mapped["brand"] = mapped.get("company") or mapped.get("brand")
    supplier_obj = mapped.get("supplier_lookup")
    if isinstance(supplier_obj, dict) and supplier_obj.get("name"):
        mapped["supplier"] = supplier_obj.get("name")
    else:
        mapped["supplier"] = mapped.get("supplier")
    mapped["stockQty"] = mapped.get("currentStock", 0)
    mapped["stock"] = mapped.get("currentStock", 0)
    return mapped


@router.put("/products/{product_id}", dependencies=[Depends(PermissionChecker("products", "update"))])
async def update_product(product_id: str, payload: Dict[str, Any], request: Request):
    db = request.app.state.db
    allowed_keys = {
        "name", "code", "size", "company", "type", "category", "purchasePrice",
        "salePrice", "unit", "tags", "category_id", "brand_id",
        "supplier_id", "currentStock", "minStock", "maxStock", "image",
        "supplier", "branch", "status", "description"
    }
    update_doc = {k: v for k, v in payload.items() if k in allowed_keys}
    if "category" in update_doc and not update_doc.get("category"):
        update_doc.pop("category", None)

    if "purchasePrice" in update_doc:
        update_doc["purchasePrice"] = _to_float(update_doc["purchasePrice"], "purchasePrice")
    if "salePrice" in update_doc:
        update_doc["salePrice"] = _to_float(update_doc["salePrice"], "salePrice")
    if "category_id" in update_doc:
        update_doc["category_id"] = parse_object_id(update_doc["category_id"], "category_id")
    if "category" in update_doc and not update_doc.get("category_id"):
        category_doc = await db.categories.find_one({"name": update_doc["category"]})
        if category_doc:
            update_doc["category_id"] = category_doc.get("_id")
    if "brand_id" in update_doc:
        update_doc["brand_id"] = parse_object_id(update_doc["brand_id"], "brand_id")
    if "supplier_id" in update_doc:
        update_doc["supplier_id"] = parse_object_id(update_doc["supplier_id"], "supplier_id")

    inventory_update = {}
    if "currentStock" in update_doc:
        inventory_update["quantity"] = int(update_doc.pop("currentStock") or 0)
    if "minStock" in update_doc:
        inventory_update["minStock"] = int(update_doc.pop("minStock") or 0)
    if "maxStock" in update_doc:
        inventory_update["maxStock"] = int(update_doc.pop("maxStock") or 0)

    result = await db.products.update_one(
        {"_id": _parse_object_id(product_id)},
        {"$set": update_doc},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")

    if inventory_update:
        await db.inventory.update_one(
            {"product_id": _parse_object_id(product_id)},
            {"$set": inventory_update},
            upsert=True,
        )

    updated = await db.products.aggregate(
        _products_pipeline({"_id": _parse_object_id(product_id)})
    ).to_list(length=1)
    if not updated:
        raise HTTPException(status_code=404, detail="Product not found")
    mapped = normalize_object_ids(updated[0])
    category_obj = mapped.get("category")
    if isinstance(category_obj, dict) and category_obj.get("name"):
        mapped["category"] = category_obj.get("name")
    brand_obj = mapped.get("brand")
    if isinstance(brand_obj, dict) and brand_obj.get("name"):
        mapped["brand"] = brand_obj.get("name")
    else:
        mapped["brand"] = mapped.get("company") or mapped.get("brand")
    supplier_obj = mapped.get("supplier_lookup")
    if isinstance(supplier_obj, dict) and supplier_obj.get("name"):
        mapped["supplier"] = supplier_obj.get("name")
    else:
        mapped["supplier"] = mapped.get("supplier")
    mapped["stockQty"] = mapped.get("currentStock", 0)
    mapped["stock"] = mapped.get("currentStock", 0)
    await log_activity(request, action="Updated", module="Products", description=f"Updated product details: {mapped.get('name')}")
    return mapped


@router.delete("/products/{product_id}", dependencies=[Depends(PermissionChecker("products", "delete"))])
async def delete_product(product_id: str, request: Request):
    db = request.app.state.db
    product = await db.products.find_one({"_id": _parse_object_id(product_id)})
    result = await db.products.delete_one({"_id": _parse_object_id(product_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    product_name = product.get("name") if product else product_id
    await log_activity(request, action="Deleted", module="Products", description=f"Deleted product: {product_name}")
    return {"success": True, "deleted_id": product_id}
