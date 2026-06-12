from fastapi import APIRouter, HTTPException, Request

from db_utils import normalize_object_ids, parse_object_id
from models import Wishlist

router = APIRouter()

@router.get("/wishlist/{user_id}")
async def get_wishlist(user_id: str, request: Request):
    db = request.app.state.db
    pipeline = [
        {"$match": {"user_id": parse_object_id(user_id, "user_id")}},
        {
            "$lookup": {
                "from": "products",
                "localField": "items.product_id",
                "foreignField": "_id",
                "as": "products",
            }
        },
        {
            "$addFields": {
                "items": {
                    "$map": {
                        "input": "$items",
                        "as": "item",
                        "in": {
                            "$mergeObjects": [
                                "$$item",
                                {
                                    "product": {
                                        "$arrayElemAt": [
                                            {
                                                "$filter": {
                                                    "input": "$products",
                                                    "as": "p",
                                                    "cond": {"$eq": ["$$p._id", "$$item.product_id"]},
                                                }
                                            },
                                            0,
                                        ]
                                    }
                                },
                            ]
                        },
                    }
                }
            }
        },
        {"$project": {"products": 0}},
    ]
    wishlist = await db.wishlists.aggregate(pipeline).to_list(length=1)
    if wishlist:
        return normalize_object_ids(wishlist[0])
    return {"user_id": user_id, "items": []}

@router.post("/wishlist")
async def update_wishlist(wishlist: Wishlist, request: Request):
    db = request.app.state.db
    payload = wishlist.dict(exclude_unset=True)
    payload["user_id"] = parse_object_id(payload.get("user_id"), "user_id")
    items = []
    for item in payload.get("items") or []:
        item = dict(item)
        item["product_id"] = parse_object_id(item.get("product_id"), "product_id")
        items.append(item)
    payload["items"] = items
    product_ids = [item.get("product_id") for item in items if item.get("product_id")]
    if product_ids:
        product_count = await db.products.count_documents({"_id": {"$in": product_ids}})
        if product_count != len(set(product_ids)):
            raise HTTPException(status_code=400, detail="One or more products not found")
    await db.wishlists.update_one({"user_id": payload["user_id"]}, {"$set": payload}, upsert=True)
    return {"success": True}

# More endpoints (remove item, clear wishlist) can be added here
