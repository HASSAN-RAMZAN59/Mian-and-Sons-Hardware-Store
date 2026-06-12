from fastapi import APIRouter, HTTPException, Request, Depends
from auth_utils import PermissionChecker
from pydantic import BaseModel
from audit_logger import log_activity
from typing import Optional, List, Union
from datetime import datetime
from bson import ObjectId

router = APIRouter()

class Expense(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = ""
    category: Optional[str] = ""
    amount: Union[float, int, None] = 0.0
    date: Optional[str] = None
    description: Optional[str] = ""
    paymentMethod: Optional[str] = "Cash"
    reference: Optional[str] = ""
    paidBy: Optional[str] = ""
    notes: Optional[str] = ""

@router.get("/expenses", dependencies=[Depends(PermissionChecker("expenses", "read"))])
async def get_expenses(request: Request):
    db = request.app.state.db
    expenses = []
    try:
        # User requested to use 'expenses' collection
        cursor = db.expenses.find() 
        async for exp in cursor:
            exp["_id"] = str(exp["_id"])
            exp["id"] = exp["_id"]
            expenses.append(exp)
        return expenses
    except Exception as e:
        print(f"[EXPENSE ERROR] Failed to fetch expenses: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/expenses", dependencies=[Depends(PermissionChecker("expenses", "create"))])
async def add_expense(expense: Expense, request: Request):
    db = request.app.state.db
    try:
        exp = expense.dict(exclude_unset=False)
        if "id" in exp: del exp["id"]
        
        exp["type"] = "expense"
        exp["method"] = exp.get("paymentMethod", "Cash") or "Cash"
        
        if "createdAt" not in exp:
            exp["createdAt"] = exp.get("date") or datetime.utcnow().isoformat()

        # Save to ONLY 'expenses' collection as requested
        result = await db.expenses.insert_one(exp)
        exp["_id"] = str(result.inserted_id)
        exp["id"] = exp["_id"]
        
        # File-based diagnostic log
        try:
            with open("debug_expenses.txt", "a") as f:
                f.write(f"{datetime.utcnow().isoformat()} - SAVED EXPENSE: {exp['id']} to 'expenses' collection in DB: {db.name}\n")
        except:
            pass

        print(f"[EXPENSE SUCCESS] Saved to 'expenses' collection: {exp['id']}")
        await log_activity(request, action="Created", module="Expenses", description=f"Logged expense: {exp.get('title')} (Amount: Rs {exp.get('amount')})")
        return exp
    except Exception as e:
        print(f"[EXPENSE ERROR] Failed to save expense: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/expenses/{id}", dependencies=[Depends(PermissionChecker("expenses", "update"))])
async def update_expense(id: str, expense: Expense, request: Request):
    db = request.app.state.db
    try:
        exp_data = expense.dict(exclude_unset=True)
        if "id" in exp_data: del exp_data["id"]
        
        if "paymentMethod" in exp_data:
            exp_data["method"] = exp_data["paymentMethod"]
        
        result = await db.expenses.update_one(
            {"_id": ObjectId(id)},
            {"$set": exp_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Expense not found")
            
        print(f"[EXPENSE SUCCESS] Updated in 'expenses' collection: {id}")
        await log_activity(request, action="Updated", module="Expenses", description=f"Updated expense record: {exp_data.get('title') or id} (Amount: Rs {exp_data.get('amount')})")
        return {"id": id, "status": "success"}
    except Exception as e:
        print(f"[EXPENSE ERROR] Failed to update expense {id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/expenses/{id}", dependencies=[Depends(PermissionChecker("expenses", "delete"))])
async def delete_expense(id: str, request: Request):
    db = request.app.state.db
    try:
        expense = await db.expenses.find_one({"_id": ObjectId(id)})
        result = await db.expenses.delete_one({"_id": ObjectId(id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Expense not found")
        
        print(f"[EXPENSE SUCCESS] Deleted from 'expenses' collection: {id}")
        expense_title = expense.get("title") if expense else id
        await log_activity(request, action="Deleted", module="Expenses", description=f"Deleted expense record: {expense_title}")
        return {"status": "success"}
    except Exception as e:
        print(f"[EXPENSE ERROR] Failed to delete expense {id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/expenses/monthly-trend", dependencies=[Depends(PermissionChecker("expenses", "read"))])
async def get_monthly_trend(request: Request):
    db = request.app.state.db
    try:
        pipeline = [
            # Now querying 'expenses' collection
            {
                "$project": {
                    "amount": 1,
                    "date": 1,
                    "parsedDate": {
                        "$dateFromString": {
                            "dateString": {"$ifNull": ["$date", datetime.utcnow().isoformat()[:10]]},
                            "onError": datetime.utcnow()
                        }
                    }
                }
            },
            {
                "$group": {
                    "_id": {
                        "year": {"$year": "$parsedDate"},
                        "month": {"$month": "$parsedDate"}
                    },
                    "total": {"$sum": "$amount"}
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "year": "$_id.year",
                    "month": "$_id.month",
                    "total": "$total"
                }
            },
            {"$sort": {"year": -1, "month": -1}},
            {"$limit": 12}
        ]
        
        results = []
        cursor = db.expenses.aggregate(pipeline)
        async for row in cursor:
            month_name = datetime(row['year'], row['month'], 1).strftime('%b %Y')
            results.append({
                "month": month_name,
                "amount": row['total'],
                "sortKey": f"{row['year']}-{row['month']:02d}" 
            })
        
        results.sort(key=lambda x: x['sortKey'])
        return results
    except Exception as e:
        print(f"[EXPENSE ERROR] Trend aggregation failed in 'expenses' collection: {str(e)}")
        return []
