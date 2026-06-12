from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

class CompareItem(BaseModel):
    product_id: str

class CompareList(BaseModel):
    id: Optional[str] = None
    user_id: str
    items: List[CompareItem]

@router.get("/compare/{user_id}")
async def get_compare(user_id: str, request: Request):
    db = request.app.state.db
    compare = await db.compares.find_one({"user_id": user_id})
    if compare:
        compare["_id"] = str(compare["_id"])
        return compare
    return {"user_id": user_id, "items": []}

@router.post("/compare")
async def update_compare(compare: CompareList, request: Request):
    db = request.app.state.db
    result = await db.compares.update_one({"user_id": compare.user_id}, {"$set": compare.dict(exclude_unset=True)}, upsert=True)
    return {"success": True}
