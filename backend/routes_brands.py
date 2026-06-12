from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class Brand(BaseModel):
    id: Optional[str] = None
    name: str
    description: Optional[str] = None

@router.get("/brands")
async def get_brands(request: Request):
    db = request.app.state.db
    brands = []
    cursor = db.brands.find()
    async for brand in cursor:
        brand["_id"] = str(brand["_id"])
        brands.append(brand)
    return brands

@router.post("/brands")
async def add_brand(brand: Brand, request: Request):
    db = request.app.state.db
    br = brand.dict(exclude_unset=True)
    result = await db.brands.insert_one(br)
    br["_id"] = str(result.inserted_id)
    return br
