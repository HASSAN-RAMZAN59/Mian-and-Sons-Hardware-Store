from fastapi import APIRouter, HTTPException, Request, Depends
from auth_utils import PermissionChecker
from typing import Any, Dict, List, Optional
from datetime import datetime
from bson import ObjectId
from models import Supplier
from db_utils import parse_object_id, normalize_object_ids

router = APIRouter()

def _serialize(doc: Dict[str, Any]) -> Dict[str, Any]:
    if not doc:
        return doc
    doc["_id"] = str(doc["_id"])
    return doc

async def _seed_suppliers(db):
    """Seed initial suppliers if they don't exist by phone number."""
    initial_suppliers = [
        {"name": "Babar", "company": "BABAR SANITARY STORE", "phone": "03326613593"},
        {"name": "Ijaz", "company": "M NAWAZ PAINT AND SANITARY", "phone": "03457903352"},
        {"name": "Zain", "company": "Salesman", "phone": "03077975134"},
        {"name": "Yaseen", "company": "Salesman", "phone": "03066255875"}
    ]
    for s in initial_suppliers:
        exists = await db.suppliers.find_one({"phone": s["phone"]})
        if not exists:
            s["createdAt"] = datetime.utcnow().isoformat()
            await db.suppliers.insert_one(s)
            print(f"[SEED] Inserted supplier: {s['company']}")

@router.get("/suppliers", dependencies=[Depends(PermissionChecker("suppliers", "read"))])
async def get_suppliers(request: Request):
    db = request.app.state.db
    # Run seed check on get
    await _seed_suppliers(db)
    
    suppliers = []
    cursor = db.suppliers.find().sort("createdAt", -1)
    async for sup in cursor:
        suppliers.append(normalize_object_ids(sup))
    return suppliers

@router.get("/suppliers/{supplier_id}", dependencies=[Depends(PermissionChecker("suppliers", "read"))])
async def get_supplier_by_id(supplier_id: str, request: Request):
    db = request.app.state.db
    doc = await db.suppliers.find_one({"_id": parse_object_id(supplier_id, "supplier_id")})
    if not doc:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return normalize_object_ids(doc)

@router.post("/suppliers", dependencies=[Depends(PermissionChecker("suppliers", "create"))])
async def add_supplier(supplier: Supplier, request: Request):
    db = request.app.state.db
    sup_data = supplier.dict(exclude_unset=True)
    
    # 1. Duplicate check (by phone)
    existing = await db.suppliers.find_one({"phone": sup_data.get("phone")})
    if existing:
        raise HTTPException(status_code=400, detail=f"Supplier with phone {sup_data['phone']} already exists")
    
    # 2. Save
    sup_data["createdAt"] = datetime.utcnow().isoformat()
    result = await db.suppliers.insert_one(sup_data)
    sup_data["_id"] = str(result.inserted_id)
    print(f"[SUPPLIER] Created new supplier: {sup_data.get('company')}")
    return sup_data

@router.put("/suppliers/{supplier_id}", dependencies=[Depends(PermissionChecker("suppliers", "update"))])
async def update_supplier(supplier_id: str, payload: Dict[str, Any], request: Request):
    db = request.app.state.db
    oid = parse_object_id(supplier_id, "supplier_id")
    
    # Explicitly sanitize input payload keys to prevent mass assignment
    allowed_keys = {"name", "company", "phone", "address", "createdAt"}
    update_doc = {k: v for k, v in payload.items() if k in allowed_keys}
    
    # If phone is being updated, check for duplicates
    if "phone" in update_doc:
        existing = await db.suppliers.find_one({"phone": update_doc["phone"], "_id": {"$ne": oid}})
        if existing:
            raise HTTPException(status_code=400, detail="Another supplier already has this phone number")

    result = await db.suppliers.update_one({"_id": oid}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found")
        
    updated = await db.suppliers.find_one({"_id": oid})
    return normalize_object_ids(updated)

@router.delete("/suppliers/{supplier_id}", dependencies=[Depends(PermissionChecker("suppliers", "delete"))])
async def delete_supplier(supplier_id: str, request: Request):
    db = request.app.state.db
    oid = parse_object_id(supplier_id, "supplier_id")
    
    # Optional: Check if supplier has purchases before deleting?
    # For now, immediate delete as requested.
    result = await db.suppliers.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return {"success": True, "deleted_id": supplier_id}

@router.get("/suppliers/{supplier_id}/ledger", dependencies=[Depends(PermissionChecker("suppliers", "read"))])
async def get_supplier_ledger(supplier_id: str, request: Request, startDate: Optional[str] = None, endDate: Optional[str] = None):
    db = request.app.state.db
    oid = parse_object_id(supplier_id, "supplier_id")
    
    # 1. Fetch Supplier
    supplier = await db.suppliers.find_one({"_id": oid})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    # 2. Fetch Purchases
    purchase_query = {"supplierId": oid}
    if startDate:
        purchase_query["date"] = {"$gte": startDate}
    if endDate:
        purchase_query["date"] = {**purchase_query.get("date", {}), "$lte": endDate}
        
    purchases_cursor = db.purchases.find(purchase_query)
    purchases = []
    async for p in purchases_cursor:
        p_date = p.get("date", p.get("createdAt", ""))
        po_no = p.get("poNo", "")
        total_amt = float(p.get("totalAmount", 0))
        paid_amt = float(p.get("paidAmount", 0))
        
        # Add Purchase Credit
        purchases.append({
            "date": p_date,
            "description": f"Purchase Order {po_no}",
            "invoice": po_no,
            "debit": 0,
            "credit": total_amt,
            "type": "purchase",
            "refId": str(p["_id"])
        })
        
        # Add Purchase Payment Debit if any
        if paid_amt > 0:
            # We add it as a separate entry so it shows up in "Total Payments Made"
            purchases.append({
                "date": p_date,
                "description": f"Payment for {po_no}",
                "invoice": po_no,
                "debit": paid_amt,
                "credit": 0,
                "type": "payment",
                "refId": str(p["_id"])
            })
        
    # 3. Fetch Payments
    payment_query = {"supplier_id": oid, "type": "payment"}
    if startDate:
        payment_query["date"] = {"$gte": startDate}
    if endDate:
        payment_query["date"] = {**payment_query.get("date", {}), "$lte": endDate}
        
    payments_cursor = db.transactions.find(payment_query)
    payments = []
    async for pay in payments_cursor:
        payments.append({
            "date": pay.get("date", pay.get("createdAt", "")),
            "description": pay.get("notes") or "Supplier Payment",
            "invoice": pay.get("reference", ""),
            "debit": float(pay.get("amount", 0)),
            "credit": 0,
            "type": "payment",
            "refId": str(pay["_id"])
        })
        
    # 4. Merge and Sort
    transactions = sorted(purchases + payments, key=lambda x: x["date"])
    
    # 5. Debug Logs (Mandatory as per request)
    print(f"SupplierId: {supplier_id}")
    print(f"Purchases count: {len(purchases)}")
    print(f"Payments count: {len(payments)}")
    print(f"Total Transactions: {len(transactions)}")
    
    return normalize_object_ids({
        "supplierId": supplier_id,
        "companyName": supplier.get("company"),
        "ledger": transactions
    })
