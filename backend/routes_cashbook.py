from fastapi import APIRouter, Request, HTTPException, Depends
from auth_utils import PermissionChecker
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter()

class OpeningBalance(BaseModel):
    amount: float
    date: Optional[str] = None

@router.get("/cashbook/opening-balance", dependencies=[Depends(PermissionChecker("cashbook", "read"))])
async def get_opening_balance(request: Request):
    db = request.app.state.db
    doc = await db.cashbook.find_one({"type": "opening_balance"})
    if doc:
        return {"amount": doc.get("amount", 0), "date": doc.get("date")}
    return {"amount": 0, "date": None}

@router.post("/cashbook/opening-balance", dependencies=[Depends(PermissionChecker("cashbook", "update"))])
async def set_opening_balance(data: OpeningBalance, request: Request):
    db = request.app.state.db
    await db.cashbook.update_one(
        {"type": "opening_balance"},
        {"$set": {"amount": data.amount, "date": data.date or datetime.utcnow().isoformat(), "type": "opening_balance"}},
        upsert=True
    )
    return {"amount": data.amount, "date": data.date}


from bson import ObjectId

def to_date_part(dt):
    if not dt:
        return None
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt)
        except Exception:
            return dt
    return dt.strftime('%Y-%m-%d')

def to_time_part(dt):
    if not dt:
        return None
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt)
        except Exception:
            return ''
    return dt.strftime('%H:%M:%S')

@router.get("/cashbook/transactions", dependencies=[Depends(PermissionChecker("cashbook", "read"))])
async def get_cashbook_transactions(request: Request):
    db = request.app.state.db
    
    # 1. Fetch Opening Balance (for starting the running balance calc)
    opening_bal_doc = await db.cashbook.find_one({"type": "opening_balance"})
    opening_balance = float(opening_bal_doc.get("amount", 0)) if opening_bal_doc else 0.0
    opening_date = opening_bal_doc.get("date") if opening_bal_doc else None

    # Final normalized list
    final_transactions = []
    
    # Add opening balance as first entry if it exists
    if opening_balance != 0:
        final_transactions.append({
            'date': to_date_part(opening_date) or datetime.utcnow().strftime('%Y-%m-%d'),
            'description': 'Opening Cash Balance',
            'voucher': 'OB',
            'debit': opening_balance if opening_balance > 0 else 0,
            'credit': abs(opening_balance) if opening_balance < 0 else 0,
            'type': 'opening_balance',
            'timestamp': opening_date or '0000-00-00T00:00:00'
        })

    # 2. Fetch Unified Transactions (Payments, Expenses, Income)
    tx_cursor = db.transactions.find({
        "method": {"$regex": "^(cash|cod)$", "$options": "i"}
    })
    
    async for tx in tx_cursor:
        tx_type = tx.get("type", "").lower()
        amount = float(tx.get("amount", 0))
        debit = 0.0
        credit = 0.0
        
        # Logic for mapping
        if tx_type in ["received", "order_payment", "income"]:
            debit = amount
        elif tx_type in ["paid", "expense", "salary"]:
            credit = amount
        elif tx_type == "payment":
            # If it's a payment, check if it's from a customer (In) or to a supplier (Out)
            if tx.get("customer_id") or tx.get("customerId"):
                debit = amount
            elif tx.get("supplier_id") or tx.get("supplierId"):
                credit = amount
            else:
                # Fallback to direction check if IDs are missing
                if tx.get("direction") == "Paid":
                    credit = amount
                else:
                    debit = amount

        final_transactions.append({
            'date': to_date_part(tx.get('date')),
            'timestamp': tx.get('date') or tx.get('createdAt', ''),
            'description': tx.get('description', f"{tx_type.capitalize().replace('_', ' ')}"),
            'voucher': str(tx.get('referenceId', tx.get('_id'))),
            'debit': debit,
            'credit': credit,
            'type': tx_type
        })

    # 3. Fetch Cash Expenses from dedicated collection
    expense_cursor = db.expenses.find({
        "method": {"$regex": "^(cash|cod)$", "$options": "i"}
    })
    async for exp in expense_cursor:
        final_transactions.append({
            'date': to_date_part(exp.get('date')),
            'timestamp': exp.get('date') or exp.get('createdAt', ''),
            'description': exp.get('description', 'Expense'),
            'voucher': str(exp.get('_id')),
            'debit': 0.0,
            'credit': float(exp.get('amount', 0)),
            'type': 'expense'
        })

    # 4. Fetch Cash Purchases
    purchase_cursor = db.purchases.find({
        "paymentMethod": {"$regex": "^cash$", "$options": "i"}
    })
    
    async for p in purchase_cursor:
        # For purchases, we track the 'paidAmount' as the cash outflow
        amount = float(p.get("paidAmount", 0))
        if amount > 0:
            final_transactions.append({
                'date': to_date_part(p.get('date')),
                'timestamp': p.get('date') or p.get('createdAt', ''),
                'description': f"Purchase - {p.get('supplierName', 'General')}",
                'voucher': p.get('poNo', str(p.get('_id'))),
                'debit': 0.0,
                'credit': amount,
                'type': 'purchase'
            })

    # 5. Merge, Sort, and Running Balance
    # Sort by timestamp to ensure chronological order
    final_transactions.sort(key=lambda x: x.get('timestamp', ''))
    
    balance = 0.0
    for tx in final_transactions:
        balance += (tx['debit'] - tx['credit'])
        tx['balanceAfter'] = balance
        # Cleanup timestamp for output if preferred
        tx.pop('timestamp', None)

    # Mandatory Debug Logs (Step 9)
    print(f"[CASHBOOK DEBUG] Total Entries: {len(final_transactions)}")
    print(f"[CASHBOOK DEBUG] Closing Balance: {balance}")
    
    return {
        "transactions": final_transactions,
        "totalCashIn": sum(t['debit'] for t in final_transactions),
        "totalCashOut": sum(t['credit'] for t in final_transactions),
        "closingBalance": balance
    }
