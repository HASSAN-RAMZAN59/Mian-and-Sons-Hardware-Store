from fastapi import APIRouter, HTTPException, Request, Depends
from auth_utils import PermissionChecker
from typing import Optional

from db_utils import normalize_object_ids, parse_object_id
from bson import ObjectId
from models import Employee
from audit_logger import log_activity

router = APIRouter()

@router.get("/employees", dependencies=[Depends(PermissionChecker("employees", "read"))])
async def get_employees(request: Request, branchId: Optional[str] = None):
    db = request.app.state.db
    employees = []
    query = {}
    if branchId:
        try:
            query["branch_id"] = parse_object_id(branchId, "branchId")
        except Exception:
            query["branch_id"] = branchId
    cursor = db.employees.find(query)
    async for emp in cursor:
        e = normalize_object_ids(emp)
        # populate branch object if available
        branch_ref = emp.get("branch_id") or emp.get("branchId") or emp.get("branch")
        try:
            if branch_ref:
                branch_obj = None
                try:
                    branch_obj = parse_object_id(branch_ref, "branchId")
                except Exception:
                    branch_obj = None
                if branch_obj:
                    branch = await db.branches.find_one({"_id": branch_obj})
                    if branch:
                        e["branchId"] = normalize_object_ids(branch)
        except Exception:
            pass
        employees.append(e)
    return employees

@router.post("/employees", dependencies=[Depends(PermissionChecker("employees", "create"))])
async def add_employee(employee: Employee, request: Request):
    db = request.app.state.db
    emp = employee.dict(exclude_unset=True)
    print("[POST /employees] db:", db.name)
    print("[POST /employees] payload:", emp)
    try:
        branch_id = emp.get("branch_id") or emp.get("branchId")
        branch_name = emp.get("branch")
        if branch_name and ObjectId.is_valid(branch_name):
            branch_id = branch_name
            branch_name = None

        if branch_id:
            try:
                emp["branch_id"] = parse_object_id(branch_id, "branch_id")
                branch = await db.branches.find_one({"_id": emp["branch_id"]})
                if not branch:
                    raise HTTPException(status_code=400, detail="Branch not found")
                emp["branchId"] = emp["branch_id"]
            except HTTPException:
                if branch_name:
                    branch = await db.branches.find_one({"name": branch_name})
                    if not branch:
                        raise HTTPException(status_code=400, detail="Branch not found")
                    emp["branch_id"] = branch["_id"]
                    emp["branchId"] = branch["_id"]
                else:
                    raise
        elif branch_name:
            branch = await db.branches.find_one({"name": branch_name})
            if not branch:
                raise HTTPException(status_code=400, detail="Branch not found")
            emp["branch_id"] = branch["_id"]
            emp["branchId"] = branch["_id"]

        result = await db.employees.insert_one(emp)
        emp["_id"] = result.inserted_id
        print("[POST /employees] inserted:", emp)
        await log_activity(request, action="Created", module="Employees", description=f"Added employee: {emp.get('name') or emp.get('fullName')}")
        return normalize_object_ids(emp)
    except HTTPException as exc:
        print("[POST /employees] error:", exc.detail)
        raise
    except Exception as exc:
        print("[POST /employees] unexpected error:", str(exc))
        raise HTTPException(status_code=500, detail=str(exc))

@router.put("/employees/{employee_id}", dependencies=[Depends(PermissionChecker("employees", "update"))])
async def update_employee(employee_id: str, employee: Employee, request: Request):
    db = request.app.state.db
    try:
        emp_id = parse_object_id(employee_id, "employee_id")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid employee ID format")
        
    existing = await db.employees.find_one({"_id": emp_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    emp = employee.dict(exclude_unset=True)
    
    branch_id = emp.get("branch_id") or emp.get("branchId")
    branch_name = emp.get("branch")
    if branch_name and ObjectId.is_valid(branch_name):
        branch_id = branch_name
        branch_name = None

    if branch_id:
        try:
            emp["branch_id"] = parse_object_id(branch_id, "branch_id")
            branch = await db.branches.find_one({"_id": emp["branch_id"]})
            if not branch:
                raise HTTPException(status_code=400, detail="Branch not found")
            emp["branchId"] = emp["branch_id"]
        except HTTPException:
            if branch_name:
                branch = await db.branches.find_one({"name": branch_name})
                if not branch:
                    raise HTTPException(status_code=400, detail="Branch not found")
                emp["branch_id"] = branch["_id"]
                emp["branchId"] = branch["_id"]
            else:
                raise
    elif branch_name:
        branch = await db.branches.find_one({"name": branch_name})
        if not branch:
            raise HTTPException(status_code=400, detail="Branch not found")
        emp["branch_id"] = branch["_id"]
        emp["branchId"] = branch["_id"]

    await db.employees.update_one({"_id": emp_id}, {"$set": emp})
    updated_emp = await db.employees.find_one({"_id": emp_id})
    await log_activity(request, action="Updated", module="Employees", description=f"Updated employee profile for: {updated_emp.get('name') or updated_emp.get('fullName')}")
    return normalize_object_ids(updated_emp)

@router.delete("/employees/{employee_id}", dependencies=[Depends(PermissionChecker("employees", "delete"))])
async def delete_employee(employee_id: str, request: Request):
    db = request.app.state.db
    try:
        emp_id = parse_object_id(employee_id, "employee_id")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid employee ID format")
        
    existing = await db.employees.find_one({"_id": emp_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    await db.employees.delete_one({"_id": emp_id})
    await log_activity(request, action="Deleted", module="Employees", description=f"Deleted employee: {existing.get('name') or existing.get('fullName')}")
    return {"message": "Employee deleted successfully"}

@router.get("/employees/{employee_id}/salary-slip", dependencies=[Depends(PermissionChecker("employees", "read"))])
async def get_employee_salary_slip(employee_id: str, month: int, year: int, request: Request):
    db = request.app.state.db
    try:
        emp_id = parse_object_id(employee_id, "employee_id")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid employee ID format")
        
    employee = await db.employees.find_one({"_id": emp_id})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    month_query = f"{int(year)}-{int(month):02d}"
    
    payroll_record = await db.payroll.find_one({
        "$or": [
            {"employeeId": emp_id, "month": month_query},
            {"employeeId": employee_id, "month": month_query}
        ]
    })
    
    if payroll_record:
        return {
            "basicSalary": float(payroll_record.get("basicSalary") or 0),
            "allowances": float(payroll_record.get("allowances") or 0),
            "deductions": float(payroll_record.get("deductions") or 0),
            "netPay": float(payroll_record.get("netSalary") or payroll_record.get("amount") or 0),
            "netSalary": float(payroll_record.get("netSalary") or payroll_record.get("amount") or 0),
            "status": payroll_record.get("status", "Pending")
        }
        
    basic_salary = float(employee.get("basicSalary") or 0)
    allowances = float(employee.get("allowances") or 0)
    net_pay = basic_salary + allowances
    
    return {
        "basicSalary": basic_salary,
        "allowances": allowances,
        "deductions": 0.0,
        "netPay": net_pay,
        "netSalary": net_pay,
        "status": "Draft"
    }
