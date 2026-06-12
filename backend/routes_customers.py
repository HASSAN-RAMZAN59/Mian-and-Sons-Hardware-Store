from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
import os
import json
import asyncio
import uuid
import hashlib
import logging

from db_utils import normalize_object_ids, parse_object_id
from models import Customer
from rate_limiter import login_limiter

router = APIRouter()
logger = logging.getLogger("routes_customers")

# Local JSON fallback storage (used only if MongoDB is unavailable)
FALLBACK_DIR = os.path.join(os.path.dirname(__file__), "data")
FALLBACK_CUSTOMERS_FILE = os.path.join(FALLBACK_DIR, "customers.json")
FALLBACK_CUSTOMER_AUTH_FILE = os.path.join(FALLBACK_DIR, "customer_auth_accounts.json")

def _ensure_fallback_dir():
    try:
        os.makedirs(FALLBACK_DIR, exist_ok=True)
    except Exception as e:
        logger.error(f"Fallback directory creation failed: {str(e)}")

async def _read_fallback_customers():
    _ensure_fallback_dir()
    if not os.path.exists(FALLBACK_CUSTOMERS_FILE):
        return []
    try:
        # run blocking io in thread
        def _read():
            with open(FALLBACK_CUSTOMERS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        return await asyncio.to_thread(_read)
    except Exception as e:
        logger.error(f"Fallback customers read failed: {str(e)}")
        return []

async def _write_fallback_customers(customers):
    _ensure_fallback_dir()
    try:
        def _write():
            with open(FALLBACK_CUSTOMERS_FILE, "w", encoding="utf-8") as f:
                json.dump(customers, f, ensure_ascii=False, indent=2)
        await asyncio.to_thread(_write)
    except Exception as e:
        logger.error(f"Fallback customers write failed: {str(e)}")


def _normalize_email(email: Optional[str]) -> str:
    return str(email or "").strip().lower()


def _normalize_phone(phone: Optional[str]) -> str:
    return str(phone or "").strip()


def _hash_password(password: str) -> str:
    # Lightweight deterministic hash for customer auth persistence.
    # Keeps implementation dependency-free and consistent across restarts.
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


async def _read_fallback_customer_auth_accounts():
    _ensure_fallback_dir()
    if not os.path.exists(FALLBACK_CUSTOMER_AUTH_FILE):
        return []
    try:
        def _read():
            with open(FALLBACK_CUSTOMER_AUTH_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        return await asyncio.to_thread(_read)
    except Exception as e:
        logger.error(f"Fallback auth accounts read failed: {str(e)}")
        return []


async def _write_fallback_customer_auth_accounts(accounts):
    _ensure_fallback_dir()
    try:
        def _write():
            with open(FALLBACK_CUSTOMER_AUTH_FILE, "w", encoding="utf-8") as f:
                json.dump(accounts, f, ensure_ascii=False, indent=2)
        await asyncio.to_thread(_write)
    except Exception as e:
        logger.error(f"Fallback auth accounts write failed: {str(e)}")


class CustomerRegisterPayload(BaseModel):
    fullName: str
    email: str
    phone: str
    password: str
    address: Optional[str] = ""
    city: Optional[str] = ""
    customerType: Optional[str] = "Retail"


class CustomerLoginPayload(BaseModel):
    identifier: str
    password: str


class CustomerSocialLoginPayload(BaseModel):
    email: str
    fullName: str
    authProvider: str


@router.post("/customer-auth/social-login")
async def customer_auth_social_login(payload: CustomerSocialLoginPayload, request: Request):
    db = request.app.state.db
    email = _normalize_email(payload.email)
    full_name = str(payload.fullName or "").strip()
    auth_provider = str(payload.authProvider or "").strip().lower()

    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    if not full_name:
        raise HTTPException(status_code=400, detail="Full name is required")

    now = datetime.utcnow().isoformat()

    try:
        existing = await db.customer_auth_accounts.find_one({"email": email})
        if existing:
            safe = dict(existing)
            safe.pop("passwordHash", None)
            if "_id" in safe:
                safe["_id"] = str(safe["_id"])
            return safe

        # Create new account
        account = {
            "id": f"cust_{int(datetime.utcnow().timestamp() * 1000)}",
            "fullName": full_name,
            "email": email,
            "phone": "",
            "passwordHash": "",
            "address": "",
            "city": "",
            "customerType": "Retail",
            "authProvider": auth_provider,
            "createdAt": now,
            "updatedAt": now,
        }
        await db.customer_auth_accounts.insert_one(account)
        
        safe = dict(account)
        if "_id" in safe:
            safe["_id"] = str(safe["_id"])
        return safe
    except Exception as e:
        print(f"[ERROR SOCIAL LOGIN] {e}")
        # Fallback to local accounts if db fails
        accounts = await _read_fallback_customer_auth_accounts()
        existing = next((item for item in accounts if _normalize_email(item.get("email")) == email), None)
        if existing:
            safe = dict(existing)
            safe.pop("passwordHash", None)
            return safe

        account = {
            "id": f"cust_{int(datetime.utcnow().timestamp() * 1000)}",
            "fullName": full_name,
            "email": email,
            "phone": "",
            "passwordHash": "",
            "address": "",
            "city": "",
            "customerType": "Retail",
            "authProvider": auth_provider,
            "createdAt": now,
            "updatedAt": now,
        }
        accounts.insert(0, account)
        await _write_fallback_customer_auth_accounts(accounts)
        
        safe = dict(account)
        return safe


@router.post("/customer-auth/register")
async def customer_auth_register(payload: CustomerRegisterPayload, request: Request):
    login_limiter.check(request)
    db = request.app.state.db

    full_name = str(payload.fullName or "").strip()
    email = _normalize_email(payload.email)
    phone = _normalize_phone(payload.phone)
    password = str(payload.password or "")

    if not full_name:
        raise HTTPException(status_code=400, detail="Full name is required")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    if not phone:
        raise HTTPException(status_code=400, detail="Phone is required")
    if not password:
        raise HTTPException(status_code=400, detail="Password is required")

    now = datetime.utcnow().isoformat()
    account = {
        "id": f"cust_{int(datetime.utcnow().timestamp() * 1000)}",
        "fullName": full_name,
        "email": email,
        "phone": phone,
        "passwordHash": _hash_password(password),
        "address": str(payload.address or "").strip(),
        "city": str(payload.city or "").strip(),
        "customerType": str(payload.customerType or "Retail"),
        "createdAt": now,
        "updatedAt": now,
    }

    # Prefer MongoDB storage; fallback to local JSON if DB unavailable.
    try:
        existing = await db.customer_auth_accounts.find_one({
            "$or": [{"email": email}, {"phone": phone}]
        })
        if existing:
            if _normalize_email(existing.get("email")) == email:
                raise HTTPException(status_code=400, detail="Email is already registered")
            raise HTTPException(status_code=400, detail="Phone is already registered")

        await db.customer_auth_accounts.insert_one(account)
    except HTTPException:
        raise
    except Exception:
        accounts = await _read_fallback_customer_auth_accounts()
        for existing in accounts:
            if _normalize_email(existing.get("email")) == email:
                raise HTTPException(status_code=400, detail="Email is already registered")
            if _normalize_phone(existing.get("phone")) == phone:
                raise HTTPException(status_code=400, detail="Phone is already registered")
        accounts.insert(0, account)
        await _write_fallback_customer_auth_accounts(accounts)

    safe = dict(account)
    safe.pop("passwordHash", None)
    return normalize_object_ids(safe)


@router.post("/customer-auth/login")
async def customer_auth_login(payload: CustomerLoginPayload, request: Request):
    login_limiter.check(request)
    db = request.app.state.db

    identifier = str(payload.identifier or "").strip()
    password = str(payload.password or "")

    if not identifier:
        raise HTTPException(status_code=400, detail="Email or phone is required")
    if not password:
        raise HTTPException(status_code=400, detail="Password is required")

    normalized_email = _normalize_email(identifier)
    normalized_phone = _normalize_phone(identifier)
    incoming_hash = _hash_password(password)

    account = None
    try:
        account = await db.customer_auth_accounts.find_one({
            "$or": [{"email": normalized_email}, {"phone": normalized_phone}]
        })
    except Exception:
        accounts = await _read_fallback_customer_auth_accounts()
        account = next(
            (
                item
                for item in accounts
                if _normalize_email(item.get("email")) == normalized_email
                or _normalize_phone(item.get("phone")) == normalized_phone
            ),
            None,
        )

    if not account or str(account.get("passwordHash") or "") != incoming_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    safe = normalize_object_ids(dict(account))
    safe.pop("passwordHash", None)
    return safe


class CustomerChangePasswordPayload(BaseModel):
    id: str
    currentPassword: str
    newPassword: str


@router.post("/customer-auth/change-password")
async def customer_auth_change_password(payload: CustomerChangePasswordPayload, request: Request):
    db = request.app.state.db
    customer_id = str(payload.id or "").strip()
    current_password = str(payload.currentPassword or "")
    new_password = str(payload.newPassword or "")

    if not customer_id:
        raise HTTPException(status_code=400, detail="Customer ID is required")
    if not current_password or not new_password:
        raise HTTPException(status_code=400, detail="Current and new passwords are required")

    # Find customer account
    account = None
    try:
        account = await db.customer_auth_accounts.find_one({"id": customer_id})
    except Exception:
        pass

    # Fallback to local accounts if db fails/not found
    fallback_used = False
    if not account:
        try:
            accounts = await _read_fallback_customer_auth_accounts()
            account = next((item for item in accounts if item.get("id") == customer_id), None)
            if account:
                fallback_used = True
        except Exception:
            pass

    if not account:
        raise HTTPException(status_code=404, detail="Customer account not found")

    # Verify current password
    current_hash = _hash_password(current_password)
    if str(account.get("passwordHash") or "") != current_hash:
        raise HTTPException(status_code=400, detail="Incorrect current password")

    new_hash = _hash_password(new_password)

    # Save to db
    updated = False
    if not fallback_used:
        try:
            result = await db.customer_auth_accounts.update_one(
                {"id": customer_id},
                {"$set": {"passwordHash": new_hash}}
            )
            if result.matched_count > 0:
                updated = True
        except Exception:
            pass

    # If DB failed or fallback was used, write to fallback file
    if not updated or fallback_used:
        try:
            accounts = await _read_fallback_customer_auth_accounts()
            for acc in accounts:
                if acc.get("id") == customer_id:
                    acc["passwordHash"] = new_hash
                    updated = True
                    break
            if updated:
                await _write_fallback_customer_auth_accounts(accounts)
        except Exception:
            pass

    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update password")

    return {"ok": True}


@router.get("/customers")
async def get_customers(request: Request):
    db = request.app.state.db
    try:
        customers = []
        cursor = db.customers.find().sort("createdAt", -1)
        async for customer in cursor:
            customers.append(normalize_object_ids(customer))
        return customers
    except Exception:
        # Fallback to local JSON file storage
        data = await _read_fallback_customers()
        return data

@router.post("/customers")
async def add_customer(payload: Dict[str, Any], request: Request):
    db = request.app.state.db
    
    # Validation
    if not payload.get("fullName"):
        raise HTTPException(status_code=400, detail="Full Name is required")
    if not payload.get("phone"):
        raise HTTPException(status_code=400, detail="Phone Number is required")
        
    # Clean numeric fields (handle empty strings from frontend)
    try:
        def clean_float(val):
            if val == "" or val is None:
                return 0.0
            return float(val)

        payload["creditLimit"] = clean_float(payload.get("creditLimit"))
        payload["openingBalance"] = clean_float(payload.get("openingBalance"))
        payload["totalPurchases"] = clean_float(payload.get("totalPurchases"))
        payload["totalPaid"] = clean_float(payload.get("totalPaid"))
        payload["balanceDue"] = clean_float(payload.get("balanceDue"))

        # If it's a new customer, balanceDue should be openingBalance at start
        if payload["balanceDue"] == 0.0 and payload["openingBalance"] != 0.0:
            payload["balanceDue"] = payload["openingBalance"]

        now = datetime.utcnow().isoformat()
        payload["createdAt"] = now
        payload["updatedAt"] = now

        # Try inserting into MongoDB; if it fails, fall back to local JSON file
        try:
            result = await db.customers.insert_one(payload)
            payload["_id"] = str(result.inserted_id)
            return normalize_object_ids(payload)
        except Exception:
            # Fallback: write to local customers.json
            customers = await _read_fallback_customers()
            payload_copy = dict(payload)
            payload_copy["_id"] = str(uuid.uuid4())
            customers.insert(0, payload_copy)
            await _write_fallback_customers(customers)
            return normalize_object_ids(payload_copy)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=f"Invalid numeric value: {str(ve)}")
    except Exception as e:
        print(f"Error adding customer: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/customers/{customer_id}")
async def update_customer(customer_id: str, payload: dict, request: Request):
    db = request.app.state.db
    oid = parse_object_id(customer_id, "customer_id")
    # Explicitly sanitize input payload keys to prevent mass assignment
    allowed_keys = {
        "fullName", "phone", "email", "address", "city", "customerType",
        "status", "creditLimit", "openingBalance", "totalPurchases",
        "totalPaid", "balanceDue", "orders", "purchaseHistory", "createdAt", "updatedAt"
    }
    update_doc = {k: v for k, v in payload.items() if k in allowed_keys}
    result = await db.customers.update_one({"_id": oid}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"status": "success"}

@router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, request: Request):
    db = request.app.state.db
    oid = parse_object_id(customer_id, "customer_id")
    
    # Check if customer exists
    customer = await db.customers.find_one({"_id": oid})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Optional: Delete related orders and transactions if "completely delete" is desired
    # For now, we delete the customer. In a real system you'd might want to block 
    # if they have balance, but the user asked for "completely delete".
    
    # 1. Delete Orders
    await db.orders.delete_many({"customer_id": oid})
    
    # 2. Delete Transactions/Ledger entries
    # Transactions sometimes use string IDs or ObjectIds, we handle both if possible
    await db.transactions.delete_many({"customer_id": oid})
    await db.transactions.delete_many({"customer_id": customer_id})
    
    # 3. Delete Customer
    result = await db.customers.delete_one({"_id": oid})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    return {"status": "success", "message": "Customer and all related records deleted"}

@router.get("/customers/{customer_id}/summary")
async def get_customer_summary(customer_id: str, request: Request):
    db = request.app.state.db
    oid = parse_object_id(customer_id, "customer_id")
    
    # 1. Fetch Customer
    customer = await db.customers.find_one({"_id": oid})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    # 2. Aggregate Orders
    orders_cursor = db.orders.find({"customer_id": oid}).sort("createdAt", -1)
    orders = []
    total_spent = 0.0
    async for o in orders_cursor:
        total_spent += float(o.get("total", 0))
        orders.append(normalize_object_ids(o))
        
    # 3. Aggregate Payments
    payments_cursor = db.transactions.find({
        "$or": [
            {"customer_id": oid},
            {"customerId": customer_id} # Fallback for legacy
        ],
        "type": "payment"
    }).sort("date", -1)
    
    payments = []
    total_paid = 0.0
    async for p in payments_cursor:
        total_paid += float(p.get("amount", 0))
        payments.append(normalize_object_ids(p))
        
    # 4. Aggregate Returns
    returns_cursor = db.returns.find({
        "$or": [
            {"customer_id": oid},
            {"customerId": customer_id} # Fallback for legacy
        ]
    }).sort("createdAt", -1)
    
    returns = []
    total_returned = 0.0
    async for r in returns_cursor:
        total_returned += float(r.get("refundAmount", 0))
        returns.append(normalize_object_ids(r))
        
    # 5. Normalize and Merge Transactions (Steps 3-5 of instructions)
    transactions = []
    
    # Opening Balance as first entry
    opening_balance = float(customer.get("openingBalance", 0))
    if opening_balance != 0:
        transactions.append({
            "date": customer.get("createdAt", datetime.utcnow().isoformat()),
            "description": "Opening Balance",
            "invoice": "-",
            "debit": opening_balance if opening_balance > 0 else 0,
            "credit": abs(opening_balance) if opening_balance < 0 else 0,
            "type": "opening_balance"
        })

    for o in orders:
        oid_str = str(o.get("_id", ""))
        invoice_suffix = oid_str[-6:].upper()
        transactions.append({
            "date": o.get("createdAt"),
            "description": f"Order - ORD-{invoice_suffix}",
            "invoice": f"ORD-{invoice_suffix}",
            "debit": float(o.get("total", 0)),
            "credit": 0.0,
            "type": "order"
        })

    for p in payments:
        transactions.append({
            "date": p.get("date") or p.get("createdAt"),
            "description": f"Payment - {p.get('method', 'Cash')}",
            "invoice": "-",
            "debit": 0,
            "credit": float(p.get("amount", 0)),
            "type": "payment"
        })

    for r in returns:
        rid_str = str(r.get("_id", ""))
        invoice_suffix = rid_str[-6:].upper()
        transactions.append({
            "date": r.get("createdAt"),
            "description": f"Return - {r.get('productName', 'Item')}",
            "invoice": f"RET-{invoice_suffix}",
            "debit": 0.0,
            "credit": float(r.get("refundAmount", 0)),
            "type": "return"
        })

    # Sort transactions by date (Step 4)
    transactions.sort(key=lambda x: x["date"])

    # Calculate running balance (Step 5)
    balance = 0.0
    for tx in transactions:
        debit = float(tx.get("debit", 0))
        credit = float(tx.get("credit", 0))
        balance += (debit - credit)
        tx["balanceAfter"] = balance

    # 6. Final Response Structure (Step 6)
    return normalize_object_ids({
        "customerId": customer_id,
        "customer": customer,
        "transactions": transactions,
        "totalDebit": sum(tx["debit"] for tx in transactions),
        "totalCredit": sum(tx["credit"] for tx in transactions),
        "outstandingBalance": balance,
        "summary": {
            "totalSpent": total_spent,
            "totalPayments": total_paid,
            "totalReturns": total_returned,
            "openingBalance": opening_balance
        }
    })
