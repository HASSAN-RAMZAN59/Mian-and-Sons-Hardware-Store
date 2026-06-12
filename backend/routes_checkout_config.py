from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Any, Dict, Optional
from bson import ObjectId

router = APIRouter()


class DeliveryOption(BaseModel):
    id: Optional[str] = None
    label: str
    charge: float = 0
    active: bool = True


class PaymentMethod(BaseModel):
    id: Optional[str] = None
    label: str
    details: Optional[str] = None
    active: bool = True


class CityConfig(BaseModel):
    id: Optional[str] = None
    name: str
    active: bool = True


class CouponCode(BaseModel):
    id: Optional[str] = None
    code: str
    percentage: float
    active: bool = True
    description: Optional[str] = None


def _parse_object_id(doc_id: str, field_name: str) -> ObjectId:
    if not ObjectId.is_valid(doc_id):
        raise HTTPException(status_code=400, detail=f"Invalid {field_name}")
    return ObjectId(doc_id)


def _serialize(doc: Dict[str, Any]) -> Dict[str, Any]:
    doc["_id"] = str(doc["_id"])
    return doc


@router.get("/delivery-options")
async def get_delivery_options(request: Request):
    db = request.app.state.db
    items = []
    cursor = db.delivery_options.find().sort("label", 1)
    async for doc in cursor:
        items.append(_serialize(doc))
    return items


@router.post("/delivery-options")
async def add_delivery_option(payload: DeliveryOption, request: Request):
    db = request.app.state.db
    doc = payload.dict(exclude_unset=True)
    result = await db.delivery_options.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


@router.put("/delivery-options/{option_id}")
async def update_delivery_option(option_id: str, payload: DeliveryOption, request: Request):
    db = request.app.state.db
    update_doc = payload.dict(exclude_unset=True)
    result = await db.delivery_options.update_one(
        {"_id": _parse_object_id(option_id, "delivery option id")},
        {"$set": update_doc},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Delivery option not found")

    updated = await db.delivery_options.find_one({"_id": _parse_object_id(option_id, "delivery option id")})
    return _serialize(updated)


@router.delete("/delivery-options/{option_id}")
async def delete_delivery_option(option_id: str, request: Request):
    db = request.app.state.db
    result = await db.delivery_options.delete_one({"_id": _parse_object_id(option_id, "delivery option id")})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Delivery option not found")
    return {"success": True, "deleted_id": option_id}


@router.get("/payment-methods")
async def get_payment_methods(request: Request):
    db = request.app.state.db
    items = []
    cursor = db.payment_methods.find().sort("label", 1)
    async for doc in cursor:
        items.append(_serialize(doc))
    return items


@router.post("/payment-methods")
async def add_payment_method(payload: PaymentMethod, request: Request):
    db = request.app.state.db
    doc = payload.dict(exclude_unset=True)
    result = await db.payment_methods.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


@router.put("/payment-methods/{method_id}")
async def update_payment_method(method_id: str, payload: PaymentMethod, request: Request):
    db = request.app.state.db
    update_doc = payload.dict(exclude_unset=True)
    result = await db.payment_methods.update_one(
        {"_id": _parse_object_id(method_id, "payment method id")},
        {"$set": update_doc},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Payment method not found")

    updated = await db.payment_methods.find_one({"_id": _parse_object_id(method_id, "payment method id")})
    return _serialize(updated)


@router.delete("/payment-methods/{method_id}")
async def delete_payment_method(method_id: str, request: Request):
    db = request.app.state.db
    result = await db.payment_methods.delete_one({"_id": _parse_object_id(method_id, "payment method id")})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Payment method not found")
    return {"success": True, "deleted_id": method_id}


@router.get("/cities")
async def get_cities(request: Request):
    db = request.app.state.db
    items = []
    cursor = db.cities.find().sort("name", 1)
    async for doc in cursor:
        items.append(_serialize(doc))
    return items


@router.post("/cities")
async def add_city(payload: CityConfig, request: Request):
    db = request.app.state.db
    doc = payload.dict(exclude_unset=True)
    result = await db.cities.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


@router.put("/cities/{city_id}")
async def update_city(city_id: str, payload: CityConfig, request: Request):
    db = request.app.state.db
    update_doc = payload.dict(exclude_unset=True)
    result = await db.cities.update_one(
        {"_id": _parse_object_id(city_id, "city id")},
        {"$set": update_doc},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="City not found")

    updated = await db.cities.find_one({"_id": _parse_object_id(city_id, "city id")})
    return _serialize(updated)


@router.delete("/cities/{city_id}")
async def delete_city(city_id: str, request: Request):
    db = request.app.state.db
    result = await db.cities.delete_one({"_id": _parse_object_id(city_id, "city id")})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="City not found")
    return {"success": True, "deleted_id": city_id}


@router.get("/coupons")
async def get_coupons(request: Request):
    db = request.app.state.db
    items = []
    cursor = db.coupons.find().sort("code", 1)
    async for doc in cursor:
        items.append(_serialize(doc))
    return items


@router.get("/coupons/active")
async def get_active_coupons(request: Request):
    db = request.app.state.db
    items = []
    cursor = db.coupons.find({"active": True}).sort("code", 1)
    async for doc in cursor:
        items.append(_serialize(doc))
    return items


@router.post("/coupons")
async def add_coupon(payload: CouponCode, request: Request):
    db = request.app.state.db
    doc = payload.dict(exclude_unset=True)
    doc["code"] = str(doc.get("code", "")).strip().upper()
    result = await db.coupons.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


@router.put("/coupons/{coupon_id}")
async def update_coupon(coupon_id: str, payload: CouponCode, request: Request):
    db = request.app.state.db
    update_doc = payload.dict(exclude_unset=True)
    if "code" in update_doc:
        update_doc["code"] = str(update_doc["code"] or "").strip().upper()

    result = await db.coupons.update_one(
        {"_id": _parse_object_id(coupon_id, "coupon id")},
        {"$set": update_doc},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Coupon not found")

    updated = await db.coupons.find_one({"_id": _parse_object_id(coupon_id, "coupon id")})
    return _serialize(updated)


@router.delete("/coupons/{coupon_id}")
async def delete_coupon(coupon_id: str, request: Request):
    db = request.app.state.db
    result = await db.coupons.delete_one({"_id": _parse_object_id(coupon_id, "coupon id")})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return {"success": True, "deleted_id": coupon_id}
