from fastapi import APIRouter, Request, Query
from datetime import datetime
from typing import Optional
from db_utils import normalize_object_ids

router = APIRouter()

def to_date_prefix(dt_str):
    if not dt_str: return None
    return dt_str[:10] # YYYY-MM-DD

@router.get("/reports/financial-summary")
async def financial_summary(
    request: Request, 
    start_date: Optional[str] = Query(None), 
    end_date: Optional[str] = Query(None)
):
    db = request.app.state.db
    
    def is_in_range(date_val):
        if not date_val:
            return False
        # Normalize date format (YYYY-MM-DD)
        date_str = str(date_val)[:10]
        if start_date and date_str < start_date:
            return False
        if end_date and date_str > end_date:
            return False
        return True

    # 1. Total Sales (Orders)
    total_sales = 0.0
    orders_cursor = db.orders.find({})
    async for o in orders_cursor:
        if is_in_range(o.get("createdAt") or o.get("date")):
            val = o.get("grandTotal") or o.get("total") or o.get("amount") or 0
            total_sales += float(val)

    # 2. Total Purchases
    total_purchases = 0.0
    purchases_cursor = db.purchases.find({})
    async for p in purchases_cursor:
        if is_in_range(p.get("date") or p.get("createdAt")):
            val = p.get("totalAmount") or p.get("total") or 0
            total_purchases += float(val)

    # 3. Total Expenses (from dedicated collection)
    total_expenses = 0.0
    expenses_cursor = db.expenses.find({})
    async for e in expenses_cursor:
        if is_in_range(e.get("date") or e.get("createdAt")):
            val = e.get("amount") or e.get("total") or 0
            total_expenses += float(val)

    # 4. Payments (Transactions)
    total_customer_payments = 0.0
    total_supplier_payments = 0.0
    tx_cursor = db.transactions.find({})
    async for tx in tx_cursor:
        if is_in_range(tx.get("date") or tx.get("createdAt")):
            tx_type = tx.get("type", "").lower()
            amount = float(tx.get("amount", 0))
            if tx_type in ["received", "order_payment", "income"]:
                total_customer_payments += amount
            elif tx_type in ["paid", "supplier_payment"]:
                total_supplier_payments += amount
            elif tx_type == "payment":
                if tx.get("customer_id") or tx.get("customerId"):
                    total_customer_payments += amount
                elif tx.get("supplier_id") or tx.get("supplierId"):
                    total_supplier_payments += amount

    # 5. Total Returns
    total_returns = 0.0
    returns_cursor = db.returns.find({})
    async for r in returns_cursor:
        if is_in_range(r.get("createdAt") or r.get("date")):
            total_returns += float(r.get("refundAmount") or r.get("refund") or 0)

    # Fallback/default logic for payments
    if total_customer_payments == 0.0:
        total_customer_payments = total_sales
    if total_supplier_payments == 0.0:
        total_supplier_payments = total_purchases

    # 6. Profit Calculation (User Formula: Sales - Expenses - Purchases)
    profit = total_sales - total_expenses - total_purchases

    summary = {
        "totalSales": total_sales,
        "totalPurchases": total_purchases,
        "totalExpenses": total_expenses,
        "totalCustomerPayments": total_customer_payments,
        "totalSupplierPayments": total_supplier_payments,
        "totalReturns": total_returns,
        "profit": profit,
        "period": {
            "start": start_date,
            "end": end_date
        }
    }

    # Mandatory Debug Logs (Step 8)
    print(f"[REPORTS DEBUG] Financial Summary: {summary}")
    
    return summary

@router.get("/reports/hr-summary")
async def hr_summary(request: Request, month: Optional[str] = None):
    """
    Aggregates HR data for a specific month (YYYY-MM).
    Calculates total employees, attendance stats, payroll, and leaves.
    """
    db = request.app.state.db
    
    if not month:
        from datetime import datetime
        month = datetime.now().strftime("%Y-%m")

    # 1. Fetch all employees
    employees_cursor = db.employees.find({})
    employees = []
    async for emp in employees_cursor:
        employees.append(normalize_object_ids(emp))
    
    total_employees = len(employees)

    # 2. Fetch specific month data for all employees
    # Date filters for different collections
    # Attendance uses 'date': 'YYYY-MM-DD'
    # Payroll uses 'month': 'YYYY-MM'
    # Leaves use 'fromDate'/'toDate': 'YYYY-MM-DD'
    
    attendance_cursor = db.attendance.find({"date": {"$regex": f"^{month}"}})
    attendance_list = []
    async for att in attendance_cursor:
        attendance_list.append(att)
        
    payroll_cursor = db.payroll.find({"month": month})
    payroll_list = []
    async for pr in payroll_cursor:
        payroll_list.append(pr)
        
    leaves_cursor = db.leaves.find({
        "$or": [
            {"fromDate": {"$regex": f"^{month}"}},
            {"toDate": {"$regex": f"^{month}"}}
        ],
        "status": "Approved"
    })
    leaves_list = []
    leaves_by_type = {}
    async for lv in leaves_cursor:
        leaves_list.append(lv)
        ltype = lv.get("leaveType", "Other")
        ldays = int(lv.get("days", 1))
        leaves_by_type[ltype] = leaves_by_type.get(ltype, 0) + ldays

    # 3. Aggregate totals
    present_count = sum(1 for a in attendance_list if a.get("status") in ["Present", "P", "Late", "L", "Half Day", "HD"])
    absent_count = sum(1 for a in attendance_list if a.get("status") in ["Absent", "A"])
    total_salary = sum(float(p.get("amount", p.get("netSalary", 0))) for p in payroll_list)
    total_leaves = sum(int(l.get("days", 1)) for l in leaves_list)

    # 4. Employee-wise breakdown
    emp_report = []
    for emp in employees:
        emp_id = str(emp["_id"])
        emp_obj_id = emp["_id"]
        
        # Filter attendance for this employee
        # Handle both string and ObjectId references
        emp_attendance = [a for a in attendance_list if str(a.get("employeeId")) == emp_id]
        emp_payroll = [p for p in payroll_list if str(p.get("employeeId")) == emp_id]
        emp_leaves = [l for l in leaves_list if str(l.get("employeeId")) == emp_id]
        
        emp_report.append({
            "employeeId": emp_id,
            "name": emp.get("fullName", emp.get("name", "Unknown")),
            "designation": emp.get("designation", ""),
            "department": emp.get("department", ""),
            "present": sum(1 for a in emp_attendance if a.get("status") in ["Present", "P", "Late", "L", "Half Day", "HD"]),
            "absent": sum(1 for a in emp_attendance if a.get("status") in ["Absent", "A"]),
            "salary": sum(float(p.get("amount", p.get("netSalary", 0))) for p in emp_payroll),
            "leaves": sum(int(l.get("days", 1)) for l in emp_leaves)
        })

    # 5. Monthly History (Last 6 months)
    history = []
    from datetime import datetime, timedelta
    current_dt = datetime.strptime(month, "%Y-%m")
    
    for i in range(5, -1, -1):
        # Subtract i months
        # Simplified month subtraction
        year = current_dt.year
        m = current_dt.month - i
        while m <= 0:
            m += 12
            year -= 1
        
        hist_month = f"{year}-{m:02d}"
        month_label = datetime(year, m, 1).strftime("%b")
        
        hist_payroll_cursor = db.payroll.find({"month": hist_month})
        month_salary = 0
        async for pr in hist_payroll_cursor:
            month_salary += float(pr.get("amount", pr.get("netSalary", 0)))
            
        history.append({
            "month": month_label,
            "totalSalary": month_salary
        })

    # Mandatory Debug Logs (Step 8)
    print(f"[HR REPORT] Month: {month}")
    print(f"Employees: {total_employees}")
    print(f"Attendance Records: {len(attendance_list)}")
    print(f"Payroll Records: {len(payroll_list)}")
    print(f"Leaf Records: {len(leaves_list)}")

    return {
        "month": month,
        "totalEmployees": total_employees,
        "present": present_count,
        "absent": absent_count,
        "totalSalary": total_salary,
        "totalLeaves": total_leaves,
        "leavesByType": leaves_by_type,
        "employeeWiseReport": emp_report,
        "history": history
    }

@router.get("/reports/sales")
async def sales_report(request: Request, start_date: str = None, end_date: str = None):
    db = request.app.state.db
    query = {}
    if start_date and end_date:
        query["createdAt"] = {"$gte": start_date, "$lte": end_date}
    sales = []
    cursor = db.orders.find(query)
    async for order in cursor:
        order["_id"] = str(order["_id"])
        sales.append(order)
    return {"sales": sales, "count": len(sales)}

@router.get("/reports/inventory")
async def inventory_report(request: Request):
    db = request.app.state.db
    
    def to_str_date(date_val):
        if not date_val:
            return ""
        if hasattr(date_val, "isoformat"):
            return date_val.isoformat()[:10]
        return str(date_val)[:10]

    # Fetch all raw data
    products = await db.products.find().to_list(length=None)
    inventory_records = await db.inventory.find().to_list(length=None)
    orders = await db.orders.find().to_list(length=None)
    purchases = await db.purchases.find().to_list(length=None)
    categories = await db.categories.find().to_list(length=None)
    
    # Maps for resolution
    category_map = {str(c["_id"]): c.get("name") for c in categories}
    
    inventory_map = {}
    for item in inventory_records:
        p_id = str(item.get("product_id") or item.get("productId") or "")
        if p_id:
            inventory_map[p_id] = item

    # Aggregate stock out (Sales/Orders)
    out_quantities = {}
    last_sale_dates = {}
    for o in orders:
        order_date = to_str_date(o.get("date") or o.get("createdAt"))
        for item in o.get("items", []):
            p_ref = item.get("product_id") or item.get("productId") or item.get("id")
            if p_ref:
                p_id = str(p_ref)
                qty = float(item.get("quantity") or 0)
                out_quantities[p_id] = out_quantities.get(p_id, 0.0) + qty
                if order_date:
                    if p_id not in last_sale_dates or order_date > last_sale_dates[p_id]:
                        last_sale_dates[p_id] = order_date

    # Aggregate stock in (Purchases)
    in_quantities = {}
    last_purchase_dates = {}
    for p in purchases:
        purchase_date = to_str_date(p.get("date") or p.get("createdAt"))
        for item in p.get("items", []):
            p_ref = item.get("productId") or item.get("product_id") or item.get("id")
            if p_ref:
                p_id = str(p_ref)
                qty = float(item.get("quantity") or 0)
                in_quantities[p_id] = in_quantities.get(p_id, 0.0) + qty
                if purchase_date:
                    if p_id not in last_purchase_dates or purchase_date > last_purchase_dates[p_id]:
                        last_purchase_dates[p_id] = purchase_date

    # Compile report rows
    report_data = []
    for product in products:
        p_id = str(product["_id"])
        
        inv_item = inventory_map.get(p_id) or {}
        current_stock = float(inv_item.get("quantity") or inv_item.get("stock") or 0)
        min_stock = float(inv_item.get("minStock") or product.get("minStock") or 5)
        max_stock = float(inv_item.get("maxStock") or product.get("maxStock") or max(current_stock * 2, 20))
        
        unit_price = float(product.get("salePrice") or product.get("price") or 0)
        
        cat_id_ref = product.get("category_id")
        cat_name = category_map.get(str(cat_id_ref)) if cat_id_ref else product.get("category") or "General"
        
        sku_suffix = p_id[-6:].upper()
        sku = f"PRD-{sku_suffix}"
        
        supplier_name = product.get("brand") or product.get("company") or "Local Supplier"
        
        in_qty = in_quantities.get(p_id, 0.0)
        out_qty = out_quantities.get(p_id, 0.0)
        
        last_purchase = last_purchase_dates.get(p_id) or ""
        last_sale = last_sale_dates.get(p_id) or ""
        
        record = {
            "id": p_id,
            "name": product.get("name") or "Product",
            "category": cat_name,
            "sku": sku,
            "currentStock": current_stock,
            "minStock": min_stock,
            "maxStock": max_stock,
            "unitPrice": unit_price,
            "totalValue": current_stock * unit_price,
            "lastSaleDate": last_sale,
            "lastPurchaseDate": last_purchase,
            "inQuantity": in_qty,
            "outQuantity": out_qty,
            "supplier": supplier_name
        }
        report_data.append(record)

    return {"inventory": report_data, "count": len(report_data)}

@router.get("/reports/leave-allocations")
async def get_leave_allocations(request: Request):
    db = request.app.state.db
    doc = await db.settings.find_one({"key": "leave_allocations"})
    if not doc:
        return {"Annual": 15, "Sick": 10, "Casual": 10, "Other": 0}
    return {
        "Annual": doc.get("Annual", 15),
        "Sick": doc.get("Sick", 10),
        "Casual": doc.get("Casual", 10),
        "Other": doc.get("Other", 0)
    }

@router.post("/reports/leave-allocations")
async def update_leave_allocations(request: Request, payload: dict):
    db = request.app.state.db
    updates = {
        "Annual": int(payload.get("Annual", 15)),
        "Sick": int(payload.get("Sick", 10)),
        "Casual": int(payload.get("Casual", 10)),
        "Other": int(payload.get("Other", 0))
    }
    await db.settings.update_one(
        {"key": "leave_allocations"},
        {"$set": updates},
        upsert=True
    )
    return {"success": True, "allocations": updates}
