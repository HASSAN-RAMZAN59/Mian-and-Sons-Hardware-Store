from fastapi import APIRouter, HTTPException, Request
from typing import Any, Dict, List, Optional
from datetime import datetime
from datetime import timedelta

from bson import ObjectId

from db_utils import normalize_object_ids, parse_object_id
from models import Order
from rate_limiter import checkout_limiter

router = APIRouter()

def _serialize_order(order_doc: Dict[str, Any]) -> Dict[str, Any]:
    return normalize_object_ids(order_doc)


def _parse_object_id(order_id: str):
    return parse_object_id(order_id, "order_id")


def _maybe_object_id(value: Optional[str]) -> Optional[ObjectId]:
    if value is None:
        return None
    if not ObjectId.is_valid(value):
        return None
    return ObjectId(value)


async def record_order_payment_transaction(db, order_id_str: str, amount: float, method: str, customer_id: Any, date_str: str, invoice_no: str):
    order_id = _maybe_object_id(order_id_str)
    if not order_id:
        return
    existing = await db.transactions.find_one({"type": "payment", "order_id": order_id})
    if existing:
        print(f"[DEBUG PAYMENT] Payment transaction already exists for order {order_id_str}. Skipping duplicate creation.")
        return
        
    cust_id = _maybe_object_id(str(customer_id)) if customer_id else None
    
    pay = {
        "order_id": order_id,
        "customer_id": cust_id,
        "type": "payment",
        "amount": amount,
        "method": method,
        "date": date_str,
        "createdAt": date_str,
        "description": f"Payment received for Order Invoice {invoice_no}",
        "referenceType": "Order",
        "referenceId": order_id_str,
        "status": "Completed"
    }
    
    result = await db.transactions.insert_one(pay)
    print(f"[DEBUG PAYMENT] Created payment transaction for order {order_id_str}: {result.inserted_id}")
    
    if cust_id:
        await db.customers.update_one(
            {"_id": cust_id},
            {
                "$inc": {
                    "totalPaid": amount,
                    "balanceDue": -amount
                }
            }
        )
        print(f"[DEBUG PAYMENT] Updated customer {cust_id} balances: totalPaid += {amount}, balanceDue -= {amount}")


async def delete_order_payment_transaction(db, order_id_str: str):
    order_id = _maybe_object_id(order_id_str)
    if not order_id:
        return
    tx = await db.transactions.find_one({"type": "payment", "order_id": order_id})
    if tx:
        amount = float(tx.get("amount", 0))
        cust_id = tx.get("customer_id")
        
        await db.transactions.delete_one({"_id": tx["_id"]})
        print(f"[DEBUG PAYMENT] Deleted payment transaction {tx['_id']} for order {order_id_str}")
        
        if cust_id:
            await db.customers.update_one(
                {"_id": cust_id},
                {
                    "$inc": {
                        "totalPaid": -amount,
                        "balanceDue": amount
                    }
                }
            )
            print(f"[DEBUG PAYMENT] Reversed customer {cust_id} balances: totalPaid -= {amount}, balanceDue += {amount}")


def _coerce_order_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    # Do NOT pop customer anymore, we need it for lookup
    payload.pop("user", None)
    payload.pop("products", None)
    if "customer_id" in payload:
        payload["customer_id"] = _maybe_object_id(payload["customer_id"]) or payload["customer_id"]
    if "user_id" in payload:
        payload["user_id"] = _maybe_object_id(payload["user_id"]) or payload["user_id"]
    if "items" in payload:
        items: List[Dict[str, Any]] = []
        for item in payload.get("items") or []:
            item = dict(item)
            product_ref = item.get("product_id") or item.get("_id") or item.get("id")
            if product_ref is None and item.get("product"):
                product_ref = item["product"].get("_id") or item["product"].get("id")
            item["product_id"] = parse_object_id(product_ref, "product_id")
            if "discount_id" in item:
                item["discount_id"] = parse_object_id(item.get("discount_id"), "discount_id")
            items.append(item)
        payload["items"] = items
    return payload


async def _calculate_secure_totals(db, items: List[Dict], discount_id: Optional[str] = None):
    """
    Recalculates order subtotal, validates discount, and computes grand total.
    Prevents frontend price manipulation.
    """
    subtotal = 0.0
    
    # 1. Recalculate Subtotal using DB product prices
    for item in items:
        p_id = item.get("product_id")
        if not p_id:
            continue
            
        product = await db.products.find_one({"_id": p_id})
        if not product:
            print(f"[SECURITY] Product {p_id} not found in database during order calculation.")
            continue
            
        # Use salePrice from DB, not from payload
        unit_price = float(product.get("salePrice", product.get("price", 0)))
        qty = int(item.get("quantity", 0))
        item_total = unit_price * qty
        subtotal += item_total
        
        # Sync the item with DB prices for recording
        item["unitPrice"] = unit_price
        item["price"] = unit_price
        item["lineTotal"] = item_total

    discount_amount = 0.0
    discount_meta = None
    
    # 2. Validate and Apply Discount
    if discount_id:
        try:
            d_oid = parse_object_id(discount_id, "discount_id")
            discount = await db.discounts.find_one({"_id": d_oid})
            
            if discount and discount.get("status") == "Active":
                min_amt = float(discount.get("minOrderAmount", 0))
                
                # Check if subtotal meets minimum requirement
                if subtotal >= min_amt:
                    d_type = discount.get("type", "Percentage")
                    d_val = float(discount.get("value", 0))
                    
                    if d_type == "Percentage":
                        discount_amount = (subtotal * d_val) / 100
                        # Apply cap if maxDiscount is set
                        max_d = discount.get("maxDiscount")
                        if max_d is not None and discount_amount > float(max_d):
                            discount_amount = float(max_d)
                    else: # Fixed Amount
                        discount_amount = d_val
                    
                    # Ensure discount doesn't exceed subtotal
                    discount_amount = min(discount_amount, subtotal)
                    print(f"[DEBUG DISCOUNT] Applied {d_type} discount: {discount_amount}")
                    
                    discount_meta = {
                        "id": str(d_oid),
                        "name": discount.get("name"),
                        "type": d_type,
                        "value": d_val,
                        "amount": discount_amount
                    }
                else:
                    print(f"[DEBUG DISCOUNT] Subtotal {subtotal} below minOrderAmount {min_amt}")
            else:
                print(f"[DEBUG DISCOUNT] Discount {discount_id} is inactive or not found")
        except Exception as e:
            print(f"[ERROR DISCOUNT] Validation failed for {discount_id}: {e}")

    grand_total = max(0, subtotal - discount_amount)
    
    return {
        "subtotal": round(subtotal, 2),
        "discountAmount": round(discount_amount, 2),
        "grandTotal": round(grand_total, 2),
        "discount": discount_meta
    }


@router.get("/orders")
async def get_orders(request: Request):
    db = request.app.state.db
    orders = []
    pipeline = [
        {
            "$lookup": {
                "from": "customers",
                "localField": "customer_id",
                "foreignField": "_id",
                "as": "customer",
            }
        },
        {"$unwind": {"path": "$customer", "preserveNullAndEmptyArrays": True}},
        {
            "$lookup": {
                "from": "users",
                "localField": "user_id",
                "foreignField": "_id",
                "as": "user",
            }
        },
        {"$unwind": {"path": "$user", "preserveNullAndEmptyArrays": True}},
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
        {"$sort": {"createdAt": -1}},
    ]
    cursor = db.orders.aggregate(pipeline)
    async for order in cursor:
        orders.append(_serialize_order(order))
    return orders


@router.get("/orders/{order_id}")
async def get_order_by_id(order_id: str, request: Request):
    db = request.app.state.db
    pipeline = [
        {"$match": {"_id": _parse_object_id(order_id)}},
        {
            "$lookup": {
                "from": "customers",
                "localField": "customer_id",
                "foreignField": "_id",
                "as": "customer",
            }
        },
        {"$unwind": {"path": "$customer", "preserveNullAndEmptyArrays": True}},
        {
            "$lookup": {
                "from": "users",
                "localField": "user_id",
                "foreignField": "_id",
                "as": "user",
            }
        },
        {"$unwind": {"path": "$user", "preserveNullAndEmptyArrays": True}},
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
    order = await db.orders.aggregate(pipeline).to_list(length=1)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return _serialize_order(order[0])

# New endpoint: Get orders by customer_id
@router.get("/orders/by-customer/{customer_id}")
async def get_orders_by_customer(customer_id: str, request: Request, phone: Optional[str] = None):
    db = request.app.state.db
    orders = []
    
    # Prepare list of possible customer_ids to match
    match_ids = []
    
    # 1. Add the passed customer_id
    if ObjectId.is_valid(customer_id):
        match_ids.append(ObjectId(customer_id))
    else:
        # Support string/local IDs
        match_ids.append(customer_id)
        
    # 2. If phone provided, find all MongoDB customers with that phone and include their IDs
    if phone:
        print(f"[DEBUG] Finding orders for phone: {phone}")
        customers_cursor = db.customers.find({"phone": phone})
        async for c in customers_cursor:
            if c["_id"] not in match_ids:
                match_ids.append(c["_id"])
    
    print(f"[DEBUG] Matching orders with customer_id in: {match_ids}")

    pipeline = [
        {"$match": {"customer_id": {"$in": match_ids}}},
        {
            "$lookup": {
                "from": "customers",
                "localField": "customer_id",
                "foreignField": "_id",
                "as": "customer",
            }
        },
        {"$unwind": {"path": "$customer", "preserveNullAndEmptyArrays": True}},
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
        {"$sort": {"createdAt": -1}},
    ]
    cursor = db.orders.aggregate(pipeline)
    async for order in cursor:
        orders.append(_serialize_order(order))
    return orders

@router.post("/orders")
async def add_order(order: Order, request: Request):
    checkout_limiter.check(request)
    print("\n" + "="*50)
    print("🔥 SALE/ORDER SAVE TRIGGERED")
    print(f"COLLECTION: 'orders'")
    print(f"TIMESTAMP: {datetime.utcnow().isoformat()}")
    print(f"RAW BODY: {order.dict(exclude_unset=True)}")
    print("="*50 + "\n")
    
    try:
        db = request.app.state.db
        ord = _coerce_order_payload(order.dict(exclude_unset=True))
        print(f"Coerced payload: {ord}")
        
        if isinstance(ord.get("customer_id"), ObjectId):
            customer = await db.customers.find_one({"_id": ord["customer_id"]})
            if not customer:
                print("Validation Error: Customer not found")
                raise HTTPException(status_code=400, detail="Customer not found")
                
        product_ids = [item.get("product_id") for item in ord.get("items", [])]
        product_ids = [pid for pid in product_ids if pid is not None]
        print(f"Checking products: {product_ids}")
        
        if product_ids:
            product_count = await db.products.count_documents({"_id": {"$in": product_ids}})
            if product_count != len(set(product_ids)):
                print(f"Validation Error: Found {product_count} products out of {len(set(product_ids))} unique ids provided")
                raise HTTPException(status_code=400, detail="One or more products not found")
                
        now = datetime.utcnow().isoformat()
        
        # --- CUSTOMER DYNAMIC UPSERT LOGIC ---
        customer_payload = ord.get("customer")
        customer_id = ord.get("customer_id")
        
        if customer_payload and isinstance(customer_payload, dict):
            phone = str(customer_payload.get("phone", "")).strip()
            full_name = customer_payload.get("fullName") or customer_payload.get("name") or "New Customer"
            email = customer_payload.get("email")
            
            if phone:
                print(f"[DEBUG CUSTOMER] Looking up customer with phone: {phone}")
                existing_customer = await db.customers.find_one({"phone": phone})
                
                # Prepare/Update customer doc
                cust_doc = {
                    "fullName": full_name,
                    "phone": phone,
                    "email": email,
                    "address": ord.get("shipping", {}).get("address"),
                    "city": ord.get("shipping", {}).get("city", "Lahore"),
                    "updatedAt": now
                }
                
                if existing_customer:
                    print(f"[DEBUG CUSTOMER] Found existing customer: {existing_customer['_id']}")
                    customer_id = existing_customer["_id"]
                    # Update existing customer info
                    await db.customers.update_one(
                        {"_id": customer_id},
                        {"$set": cust_doc}
                    )
                else:
                    print(f"[DEBUG CUSTOMER] creating new customer for {full_name}")
                    cust_doc["createdAt"] = now
                    cust_doc["orders"] = []
                    cust_doc["totalPurchases"] = 0.0
                    cust_doc["totalPaid"] = 0.0
                    cust_doc["balanceDue"] = 0.0
                    cust_res = await db.customers.insert_one(cust_doc)
                    customer_id = cust_res.inserted_id
            
        # Coerce customer_id to ObjectId if valid string
        if customer_id and not isinstance(customer_id, ObjectId):
            customer_id = _maybe_object_id(str(customer_id)) or str(customer_id)
            
        ord["customer_id"] = customer_id
        # Remove customer snippet from order before saving to avoid duplication if it's large, 
        # but keep it if the user wants it as a snapshot. The user said ORder Schema must include customer snapshot (optional).
        # We'll keep it for history.

        ord.setdefault("createdAt", now)
        ord.setdefault("updatedAt", now)
        # Add statusUpdatedAt for precise frontend UI syncing
        ord.setdefault("statusUpdatedAt", now)
        ord.setdefault("paymentStatus", "unpaid")
        ord["trackingHistory"] = [{
            "status": "Order Placed",
            "timestamp": now,
            "message": "Order has been placed successfully."
        }]

        # --- SECURE PRICING RECALCULATION ---
        discount_id = ord.get("discount_id") or ord.get("totals", {}).get("discountId")
        calculated = await _calculate_secure_totals(db, ord["items"], discount_id)
        
        ord["totals"] = {
            "subtotal": calculated["subtotal"],
            "discountAmount": calculated["discountAmount"],
            "grandTotal": calculated["grandTotal"],
            "discount": calculated["discount"],
            "delivery": float(ord.get("totals", {}).get("delivery", 0))
        }
        # Final adjustment for delivery
        ord["totals"]["grandTotal"] += ord["totals"]["delivery"]
        ord["total"] = ord["totals"]["grandTotal"]
        
        print(f"[SECURITY] Recalculated Order Totals: {ord['totals']}")
        
        result = await db.orders.insert_one(ord)
        print(f"Order saved successfully with ID: {result.inserted_id}")
        ord["_id"] = result.inserted_id
        # --- DECREMENT INVENTORY QUANTITIES ---
        try:
            for it in ord.get("items", []):
                p_id = it.get("product_id")
                qty = int(it.get("quantity") or it.get("qty") or 0)
                if not p_id or qty <= 0:
                    continue

                # If an inventory document exists, atomically subtract but never go below 0
                inv = await db.inventory.find_one({"product_id": p_id})
                if inv:
                    try:
                        # Try atomic aggregation update (MongoDB 4.2+)
                        await db.inventory.update_one(
                            {"product_id": p_id},
                            [
                                {"$set": {"quantity": {"$max": [{"$subtract": ["$quantity", qty]}, 0]}}}
                            ]
                        )
                        updated = await db.inventory.find_one({"product_id": p_id})
                        print(f"[INVENTORY] Decremented product {p_id} by {qty}. New qty: {updated.get('quantity') if updated else 'unknown'}")
                    except Exception:
                        # Fallback: read-modify-write to support older servers/drivers
                        current_qty = int(inv.get("quantity") or 0)
                        new_qty = max(current_qty - qty, 0)
                        await db.inventory.update_one({"product_id": p_id}, {"$set": {"quantity": new_qty}})
                        print(f"[INVENTORY-FALLBACK] Set product {p_id} quantity from {current_qty} to {new_qty}")
                else:
                    # Ensure an inventory doc exists (start at 0) to keep product listing consistent
                    await db.inventory.insert_one({"product_id": p_id, "quantity": 0, "minStock": 0, "maxStock": 0})
                    print(f"[INVENTORY] Created inventory doc for product {p_id} with quantity 0")
        except Exception as _e:
            print(f"[WARN] Failed to update inventory quantities: {_e}")
        
        # Link order back to customer
        if customer_id:
            grand_total = float(ord.get("totals", {}).get("grandTotal", ord.get("total", 0)))
            await db.customers.update_one(
                {"_id": customer_id},
                {
                    "$push": {"orders": str(result.inserted_id)},
                    "$inc": {
                        "totalPurchases": grand_total,
                        "balanceDue": grand_total
                    }
                }
            )
            print(f"[DEBUG CUSTOMER] Linked order {result.inserted_id} to customer {customer_id}")

        # --- Create a customer notification for order confirmation ---
        try:
            # Build product names list
            product_names = []
            for it in ord.get("items", []):
                pid = it.get("product_id")
                if not pid:
                    continue
                prod = await db.products.find_one({"_id": pid})
                if prod:
                    pname = prod.get("name") or prod.get("title") or prod.get("productName") or str(pid)
                    product_names.append(str(pname))

            # Delivery estimate: 7 to 8 days from now
            now_dt = datetime.now()
            est_from = (now_dt + timedelta(days=7)).date()
            est_to = (now_dt + timedelta(days=8)).date()
            est_text = "Your order will be delivered within 7 to 8 days."
            customer_snapshot = ord.get("customer") if isinstance(ord.get("customer"), dict) else {}
            recipient_email = str(
                (customer_payload or {}).get("email")
                or customer_snapshot.get("email")
                or ""
            ).strip().lower()
            recipient_phone = str(
                (customer_payload or {}).get("phone")
                or customer_snapshot.get("phone")
                or ""
            ).strip()

            note = {
                "customer_id": str(customer_id) if customer_id else None,
                "customer_email": recipient_email or None,
                "customer_phone": recipient_phone or None,
                "title": "Order Confirmed",
                "message": "Your order has been successfully confirmed. Thank you for shopping with Mian & Sons Hardware Store.",
                "products": product_names,
                "delivery_message": est_text,
                "delivery_estimate": {"from": est_from.isoformat(), "to": est_to.isoformat()},
                "type": "success",
                "target": "/customer/account",
                "created_at": datetime.utcnow().isoformat(),
                "read": False,
            }
            await db.notifications.insert_one(note)
            print(f"[DEBUG NOTIFICATION] Order confirmation notification created for customer {customer_id}")
        except Exception as _e:
            print(f"[WARN] Failed to create order notification: {_e}")

        # Secure Payment Schema Fetch Logic bridging Daraz config
        payment_method = "cod"
        if isinstance(ord.get("payment"), dict):
            payment_method = ord["payment"].get("method", "cod").lower()
        elif ord.get("paymentMethod"):
            payment_method = ord.get("paymentMethod").lower()

        # Determine if the payment is complete
        payment_status_input = str(ord.get("paymentStatus", "")).lower()
        is_paid = payment_status_input in ["paid", "completed"] or (payment_method not in ["cod", "credit"] and ord.get("source") == "pos")

        if is_paid:
            ord["paymentStatus"] = "paid"
            await record_order_payment_transaction(
                db=db,
                order_id_str=str(result.inserted_id),
                amount=float(ord["totals"]["grandTotal"]),
                method=payment_method,
                customer_id=customer_id,
                date_str=now,
                invoice_no=ord.get("invoiceNumber", f"INV-{str(result.inserted_id)[-6:].upper()}")
            )
        else:
            ord["paymentStatus"] = "unpaid"

        return _serialize_order(ord)
        
    except Exception as e:
        import traceback
        print("==== ERROR IN ORDER ROUTE ====")
        print(traceback.format_exc())
        raise e


@router.put("/orders/{order_id}")
async def update_order(order_id: str, payload: Dict[str, Any], request: Request):
    db = request.app.state.db
    
    current = await db.orders.find_one({"_id": _parse_object_id(order_id)})
    if not current:
        raise HTTPException(status_code=404, detail="Order not found")

    payload = _coerce_order_payload(dict(payload or {}))
    payload.pop("_id", None)
    payload["updatedAt"] = datetime.utcnow().isoformat()

    # --- SECURE RECALCULATION ON UPDATE ---
    if "items" in payload or "discount_id" in payload or "totals" in payload:
        items = payload.get("items", current.get("items", []))
        discount_id = payload.get("discount_id") or payload.get("totals", {}).get("discountId") or current.get("totals", {}).get("discountId")
        
        calculated = await _calculate_secure_totals(db, items, discount_id)
        
        payload["totals"] = {
            "subtotal": calculated["subtotal"],
            "discountAmount": calculated["discountAmount"],
            "grandTotal": calculated["grandTotal"],
            "discount": calculated["discount"],
            "delivery": float(payload.get("totals", {}).get("delivery", current.get("totals", {}).get("delivery", 0)))
        }
        payload["totals"]["grandTotal"] += payload["totals"]["delivery"]
        payload["total"] = payload["totals"]["grandTotal"]

    # --- CHECK FOR PAYMENT STATUS CHANGE ---
    new_payment_status = payload.get("paymentStatus")
    if new_payment_status:
        new_payment_status = str(new_payment_status).lower()
        old_payment_status = str(current.get("paymentStatus", "unpaid")).lower()
        
        if new_payment_status != old_payment_status:
            if new_payment_status == "paid":
                payment_method = "cash"
                if isinstance(payload.get("payment"), dict):
                    payment_method = payload["payment"].get("method", current.get("paymentMethod", "cash")).lower()
                else:
                    payment_method = payload.get("paymentMethod", current.get("paymentMethod", "cash")).lower()
                
                grand_total = float(payload.get("totals", {}).get("grandTotal", current.get("totals", {}).get("grandTotal", current.get("total", 0))))
                
                await record_order_payment_transaction(
                    db=db,
                    order_id_str=order_id,
                    amount=grand_total,
                    method=payment_method,
                    customer_id=current.get("customer_id"),
                    date_str=datetime.utcnow().isoformat(),
                    invoice_no=current.get("invoiceNumber", f"INV-{order_id[-6:].upper()}")
                )
            elif new_payment_status in ["unpaid", "credit", "pending"]:
                await delete_order_payment_transaction(db, order_id)

    result = await db.orders.update_one(
        {"_id": _parse_object_id(order_id)},
        {"$set": payload},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")

    updated = await db.orders.find_one({"_id": _parse_object_id(order_id)})
    return _serialize_order(updated)

@router.patch("/orders/{order_id}")
async def patch_order_status_and_tracking(order_id: str, payload: Dict[str, Any], request: Request):
    db = request.app.state.db
    
    current = await db.orders.find_one({"_id": _parse_object_id(order_id)})
    if not current:
        raise HTTPException(status_code=404, detail="Order not found")

    new_status = payload.get("status")
    now = datetime.utcnow().isoformat()
    update_doc = {"$set": {"updatedAt": now}}
    
    if new_status:
        update_doc["$set"]["status"] = new_status
        message = payload.get("message", f"Order status updated to {new_status}")
        update_doc["$push"] = {
            "trackingHistory": {
                "status": new_status,
                "timestamp": now,
                "message": message
            }
        }
        update_doc["$set"]["statusUpdatedAt"] = now
        
    payment_status = payload.get("paymentStatus")
    if payment_status:
        update_doc["$set"]["paymentStatus"] = payment_status
        
        new_payment_status = str(payment_status).lower()
        old_payment_status = str(current.get("paymentStatus", "unpaid")).lower()
        
        if new_payment_status != old_payment_status:
            if new_payment_status == "paid":
                payment_method = current.get("paymentMethod", "cash").lower()
                grand_total = float(current.get("totals", {}).get("grandTotal", current.get("total", 0)))
                await record_order_payment_transaction(
                    db=db,
                    order_id_str=order_id,
                    amount=grand_total,
                    method=payment_method,
                    customer_id=current.get("customer_id"),
                    date_str=now,
                    invoice_no=current.get("invoiceNumber", f"INV-{order_id[-6:].upper()}")
                )
            elif new_payment_status in ["unpaid", "credit", "pending"]:
                await delete_order_payment_transaction(db, order_id)

    if len(update_doc["$set"]) == 1 and "$push" not in update_doc:
        raise HTTPException(status_code=400, detail="No trackable properties provided for patch.")

    result = await db.orders.update_one(
        {"_id": _parse_object_id(order_id)},
        update_doc
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
        
    updated = await db.orders.find_one({"_id": _parse_object_id(order_id)})
    return _serialize_order(updated)


@router.delete("/orders/{order_id}")
async def delete_order(order_id: str, request: Request):
    db = request.app.state.db
    # Reverse any active payment transaction before deleting the order
    await delete_order_payment_transaction(db, order_id)
    
    result = await db.orders.delete_one({"_id": _parse_object_id(order_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"success": True, "deleted_id": order_id}

