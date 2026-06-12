from fastapi import APIRouter, HTTPException, Request, Depends
from auth_utils import PermissionChecker

from db_utils import normalize_object_ids, parse_object_id
from models import Payment

router = APIRouter()

@router.get("/payments", dependencies=[Depends(PermissionChecker("payments", "read"))])
async def get_payments(request: Request):
    db = request.app.state.db
    payments = []
    pipeline = [
        {"$match": {"type": "payment"}},
        {
            "$lookup": {
                "from": "orders",
                "localField": "order_id",
                "foreignField": "_id",
                "as": "order",
            }
        },
        {"$unwind": {"path": "$order", "preserveNullAndEmptyArrays": True}},
        {
            "$lookup": {
                "from": "customers",
                "localField": "customer_id",
                "foreignField": "_id",
                "as": "customer",
            }
        },
        {"$unwind": {"path": "$customer", "preserveNullAndEmptyArrays": True}},
    ]
    cursor = db.transactions.aggregate(pipeline)
    async for pay in cursor:
        payments.append(normalize_object_ids(pay))
    return payments

# New endpoint: Get payments by customer_id
@router.get("/payments/by-customer/{customer_id}", dependencies=[Depends(PermissionChecker("payments", "read"))])
async def get_payments_by_customer(customer_id: str, request: Request):
    db = request.app.state.db
    payments = []
    pipeline = [
        {"$match": {"type": "payment", "customer_id": parse_object_id(customer_id, "customer_id")}},
        {
            "$lookup": {
                "from": "orders",
                "localField": "order_id",
                "foreignField": "_id",
                "as": "order",
            }
        },
        {"$unwind": {"path": "$order", "preserveNullAndEmptyArrays": True}},
    ]
    cursor = db.transactions.aggregate(pipeline)
    async for pay in cursor:
        payments.append(normalize_object_ids(pay))
    return payments

@router.post("/payments", dependencies=[Depends(PermissionChecker("payments", "create"))])
async def add_payment(payment: Payment, request: Request):
    db = request.app.state.db
    pay = payment.dict(exclude_unset=True)
    pay.pop("order", None)
    pay.pop("customer", None)
    pay["order_id"] = parse_object_id(pay.get("order_id"), "order_id") if pay.get("order_id") else None
    
    if pay.get("customer_id"):
        pay["customer_id"] = parse_object_id(pay.get("customer_id"), "customer_id")
    
    if pay.get("supplier_id"):
        pay["supplier_id"] = parse_object_id(pay.get("supplier_id"), "supplier_id")
        pay["referenceType"] = "Supplier"
        pay["referenceId"] = str(pay["supplier_id"])
    elif pay.get("order_id"):
        if pay.get("customer_id") is None:
            order = await db.orders.find_one({"_id": pay["order_id"]})
            if not order:
                raise HTTPException(status_code=400, detail="Order not found for payment")
            pay["customer_id"] = order.get("customer_id")
        pay["referenceType"] = "Order"
        pay["referenceId"] = str(pay["order_id"])
    
    pay["type"] = "payment"
    
    result = await db.transactions.insert_one(pay)
    pay["_id"] = result.inserted_id
    
    # Securely notify the parent order schema that the payment has cleared
    if pay.get("order_id"):
        await db.orders.update_one(
            {"_id": pay["order_id"]},
            {"$set": {"paymentStatus": "paid"}}
        )
    
    # 2. Update Customer financial fields
    if pay.get("customer_id"):
        amount = float(pay.get("amount", 0))
        await db.customers.update_one(
            {"_id": pay["customer_id"]},
            {
                "$inc": {
                    "totalPaid": amount,
                    "balanceDue": -amount
                }
            }
        )
    
    print(f"[DEBUG TRANSACTION] Created unified transaction for payment. Linked reference -> referenceId: {pay.get('referenceId')}")
    return normalize_object_ids(pay)
