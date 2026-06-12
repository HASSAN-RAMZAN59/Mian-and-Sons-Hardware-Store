from fastapi import APIRouter, Request, Depends, HTTPException
from auth_utils import PermissionChecker

from db_utils import normalize_object_ids, parse_object_id
from models import Category

router = APIRouter()

@router.get("/categories")
async def get_categories(request: Request):
    db = request.app.state.db
    categories = []
    try:
        # Aggregate categories with product counts (match by category_id or category name)
        pipeline = [
            {
                "$lookup": {
                    "from": "products",
                    "let": {"catId": "$_id", "catName": "$name"},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$or": [
                                        {"$eq": ["$category_id", "$$catId"]},
                                        {"$eq": ["$category", "$$catName"]}
                                    ]
                                }
                            }
                        },
                        {"$count": "count"}
                    ],
                    "as": "products"
                }
            },
            {
                "$addFields": {
                    "productCount": {"$ifNull": [{"$arrayElemAt": ["$products.count", 0]}, 0]}
                }
            },
            {"$project": {"products": 0}}
        ]
        cursor = db.categories.aggregate(pipeline)
        async for category in cursor:
            normalized = normalize_object_ids(category)
            if "status" not in normalized or not normalized["status"]:
                normalized["status"] = "Active"
            if "source" not in normalized or not normalized["source"]:
                normalized["source"] = "Catalog"
            categories.append(normalized)
        return categories
    except Exception as e:
        print("ERROR in GET /categories:", e)
        raise

@router.post("/categories", dependencies=[Depends(PermissionChecker("categories", "create"))])
async def add_category(payload: dict, request: Request):
    db = request.app.state.db
    cat = dict(payload or {})
    # Support frontend sending `parentCategory` (name) instead of parent_id
    if "parentCategory" in cat:
        p_cat = cat.get("parentCategory")
        if p_cat and p_cat != "None":
            parent_doc = await db.categories.find_one({"name": p_cat})
            if parent_doc:
                cat["parent_id"] = parent_doc.get("_id")
            else:
                cat["parent_id"] = None
        else:
            cat["parent_id"] = None
    if "parent_id" in cat:
        cat["parent_id"] = parse_object_id(cat["parent_id"], "parent_id")
    # Ensure optional fields are present
    if "icon" not in cat:
        cat["icon"] = "FaBoxes"
    if "color" not in cat:
        cat["color"] = "#1e3a5f"
    if "status" not in cat:
        cat["status"] = "Active"
    if "source" not in cat:
        cat["source"] = "Custom"
    result = await db.categories.insert_one(cat)
    cat["_id"] = result.inserted_id
    return normalize_object_ids(cat)


@router.put("/categories/{category_id}", dependencies=[Depends(PermissionChecker("categories", "update"))])
async def update_category(category_id: str, payload: dict, request: Request):
    db = request.app.state.db
    cat_id = parse_object_id(category_id, "category_id")
    # Fetch current category first to verify existence and check name change
    current_cat = await db.categories.find_one({"_id": cat_id})
    if not current_cat:
        raise HTTPException(status_code=404, detail="Category not found")

    # Explicitly sanitize input payload keys to prevent mass assignment
    allowed_keys = {"name", "description", "parent_id", "parentCategory", "icon", "color", "status", "source"}
    update_doc = {k: v for k, v in payload.items() if k in allowed_keys}
    
    # Handle parentCategory name -> parent_id mapping
    if "parentCategory" in update_doc:
        p_cat = update_doc.get("parentCategory")
        if p_cat and p_cat != "None":
            parent_doc = await db.categories.find_one({"name": p_cat})
            if parent_doc:
                update_doc["parent_id"] = parent_doc.get("_id")
            else:
                update_doc["parent_id"] = None
        else:
            update_doc["parent_id"] = None
            
    if "parent_id" in update_doc:
        update_doc["parent_id"] = parse_object_id(update_doc["parent_id"], "parent_id")

    # Perform database update
    await db.categories.update_one({"_id": cat_id}, {"$set": update_doc})

    # If name changed, sync name in all products linked to this category
    new_name = update_doc.get("name")
    if new_name and current_cat.get("name") != new_name:
        await db.products.update_many(
            {"category_id": cat_id},
            {"$set": {"category": new_name}}
        )
        await db.products.update_many(
            {"category": current_cat.get("name")},
            {"$set": {"category": new_name, "category_id": cat_id}}
        )

    updated = await db.categories.find_one({"_id": cat_id})
    return normalize_object_ids(updated)


@router.delete("/categories/{category_id}", dependencies=[Depends(PermissionChecker("categories", "delete"))])
async def delete_category(category_id: str, request: Request):
    db = request.app.state.db
    cat_id = parse_object_id(category_id, "category_id")
    # Fetch category to get its name before deletion
    category = await db.categories.find_one({"_id": cat_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
        
    await db.categories.delete_one({"_id": cat_id})
    
    # Update products that were linked to this category, making them Uncategorized
    await db.products.update_many(
        {"category_id": cat_id},
        {"$set": {"category": "Uncategorized", "category_id": None}}
    )
    if category.get("name"):
        await db.products.update_many(
            {"category": category.get("name")},
            {"$set": {"category": "Uncategorized", "category_id": None}}
        )
        
    return {"success": True, "deleted_id": category_id}

# More CRUD endpoints can be added here
