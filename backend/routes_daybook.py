from fastapi import APIRouter, Request, Query, Depends
from auth_utils import PermissionChecker
from db_utils import normalize_object_ids
from datetime import datetime, timedelta
from typing import Optional

router = APIRouter()

def to_date_part(dt):
    if not dt: return None
    if isinstance(dt, str):
        try: dt = datetime.fromisoformat(dt)
        except Exception: return dt
    return dt.strftime('%Y-%m-%d')

def to_time_part(dt):
    if not dt: return ""
    if isinstance(dt, str):
        try: dt = datetime.fromisoformat(dt)
        except Exception: return ""
    return dt.strftime('%H:%M:%S')

@router.get("/daybook/transactions", dependencies=[Depends(PermissionChecker("daybook", "read"))])
async def get_daybook_transactions(request: Request, date: Optional[str] = Query(None)):
    db = request.app.state.db
    
    # 1. Date range calculation (Step 1)
    if not date:
        date = datetime.utcnow().strftime('%Y-%m-%d')
    
    # We use string matching or range matching depending on field format
    # Many fields are ISO strings, so we can match the prefix 'YYYY-MM-DD'
    date_prefix = date
    
    final_transactions = []

    # 2. Fetch Sales (Orders)
    # Search in createdAt or date field
    orders_cursor = db.orders.find({
        "$or": [
            {"createdAt": {"$regex": f"^{date_prefix}"}},
            {"date": {"$regex": f"^{date_prefix}"}}
        ]
    })
    async for o in orders_cursor:
        final_transactions.append({
            'time': to_time_part(o.get('createdAt') or o.get('date')),
            'module': 'Sales',
            'type': 'Sale',
            'description': f"Order - {str(o.get('_id'))[-6:].upper()}",
            'voucher': str(o.get('_id')),
            'cashIn': float(o.get('total', 0)),
            'cashOut': 0.0,
            'timestamp': o.get('createdAt') or o.get('date', '')
        })

    # 3. Fetch Purchases
    purchases_cursor = db.purchases.find({
        "$or": [
            {"createdAt": {"$regex": f"^{date_prefix}"}},
            {"date": {"$regex": f"^{date_prefix}"}}
        ]
    })
    async for p in purchases_cursor:
        final_transactions.append({
            'time': to_time_part(p.get('createdAt') or p.get('date')),
            'module': 'Purchases',
            'type': 'Purchase',
            'description': f"Purchase - {p.get('supplierName', 'General')}",
            'voucher': p.get('poNo', str(p.get('_id'))),
            'cashIn': 0.0,
            'cashOut': float(p.get('paidAmount', 0)),
            'timestamp': p.get('createdAt') or p.get('date', '')
        })

    # 4. Fetch Transactions (Payments & Expenses)
    tx_cursor = db.transactions.find({
        "$or": [
            {"createdAt": {"$regex": f"^{date_prefix}"}},
            {"date": {"$regex": f"^{date_prefix}"}}
        ]
    })
    async for tx in tx_cursor:
        tx_type = tx.get("type", "").lower()
        amount = float(tx.get("amount", 0))
        cash_in = 0.0
        cash_out = 0.0
        
        module = 'Accounts'
        desc_type = tx_type.capitalize()

        if tx_type in ["received", "order_payment", "income"]:
            cash_in = amount
        elif tx_type in ["paid", "expense", "salary"]:
            cash_out = amount
            if tx_type == "expense": module = "Expenses"
        elif tx_type == "payment":
            if tx.get("customer_id") or tx.get("customerId"):
                cash_in = amount
                desc_type = "Customer Payment"
            elif tx.get("supplier_id") or tx.get("supplierId"):
                cash_out = amount
                desc_type = "Supplier Payment"
            else:
                if tx.get("direction") == "Paid":
                    cash_out = amount
                else:
                    cash_in = amount

        final_transactions.append({
            'time': to_time_part(tx.get('date') or tx.get('createdAt')),
            'module': module,
            'type': desc_type,
            'description': tx.get('description', f"{desc_type}"),
            'voucher': str(tx.get('referenceId', tx.get('_id'))),
            'cashIn': cash_in,
            'cashOut': cash_out,
            'timestamp': tx.get('date') or tx.get('createdAt', '')
        })

    # 5. Fetch Expenses from dedicated collection
    expenses_cursor = db.expenses.find({
        "$or": [
            {"createdAt": {"$regex": f"^{date_prefix}"}},
            {"date": {"$regex": f"^{date_prefix}"}}
        ]
    })
    async for exp in expenses_cursor:
        final_transactions.append({
            'time': to_time_part(exp.get('date') or exp.get('createdAt')),
            'module': 'Expenses',
            'type': 'Expense',
            'description': exp.get('description', 'Expense'),
            'voucher': str(exp.get('_id')),
            'cashIn': 0.0,
            'cashOut': float(exp.get('amount', 0)),
            'timestamp': exp.get('date') or exp.get('createdAt', '')
        })

    # 6. Fetch Returns
    returns_cursor = db.returns.find({
        "createdAt": {"$regex": f"^{date_prefix}"}
    })
    async for r in returns_cursor:
        # Customer return -> we refund money (Cash Out)
        # Supplier return -> they refund us (Cash In) - if implemented
        amount = float(r.get('refundAmount', 0))
        final_transactions.append({
            'time': to_time_part(r.get('createdAt')),
            'module': 'Returns',
            'type': 'Return',
            'description': f"Return - {r.get('productName', 'Item')}",
            'voucher': str(r.get('_id')),
            'cashIn': 0.0,
            'cashOut': amount,
            'timestamp': r.get('createdAt', '')
        })

    # 6. Merge, Sort, and Calculate (Step 5 & 6)
    final_transactions.sort(key=lambda x: x.get('timestamp', ''))
    
    total_in = sum(t['cashIn'] for t in final_transactions)
    total_out = sum(t['cashOut'] for t in final_transactions)
    
    # Mandatory Debug Logs (Step 9)
    print(f"[DAYBOOK DEBUG] Date: {date}")
    print(f"[DAYBOOK DEBUG] Sales: {len([t for t in final_transactions if t['module'] == 'Sales'])}")
    print(f"[DAYBOOK DEBUG] Transactions: {len(final_transactions)}")

    return {
        "date": date,
        "transactions": final_transactions,
        "totalIn": total_in,
        "totalOut": total_out,
        "netBalance": total_in - total_out
    }
