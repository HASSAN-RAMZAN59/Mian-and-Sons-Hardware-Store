from fastapi import APIRouter, HTTPException, Request, Depends
from auth_utils import PermissionChecker
from pydantic import BaseModel, ConfigDict
from typing import Any, Dict, Optional

from bson import ObjectId

from db_utils import normalize_object_ids, parse_object_id

router = APIRouter()

class Attendance(BaseModel):
    employeeId: str
    branchId: Optional[str] = None
    date: str
    status: str
    timeIn: Optional[str] = None
    timeOut: Optional[str] = None
    notes: Optional[str] = None

    model_config = ConfigDict(extra="allow")

class Leave(BaseModel):
    employeeId: str
    branchId: Optional[str] = None
    leaveType: Optional[str] = None
    fromDate: Optional[str] = None
    toDate: Optional[str] = None
    reason: Optional[str] = None
    days: Optional[int] = None
    status: Optional[str] = None
    appliedOn: Optional[str] = None
    approvedBy: Optional[str] = None
    rejectedBy: Optional[str] = None

    model_config = ConfigDict(extra="allow")

class Payroll(BaseModel):
    employeeId: str
    month: str
    amount: float
    branchId: Optional[str] = None

    model_config = ConfigDict(extra="allow")


def _legacy_employee_match(employee_object_id: ObjectId) -> Dict[str, Any]:
    return {
        "$or": [
            {"employeeId": employee_object_id},
            {"employeeId": str(employee_object_id)},
            {"employee_id": employee_object_id},
            {"employee_id": str(employee_object_id)},
        ]
    }


async def _populate_employee_reference(db, record: Dict[str, Any]) -> Dict[str, Any]:
    employee_ref = record.pop("employeeId", None)
    legacy_ref = record.pop("employee_id", None)
    raw_ref = employee_ref if employee_ref is not None else legacy_ref

    if isinstance(raw_ref, dict):
        record["employeeId"] = normalize_object_ids(raw_ref)
        return normalize_object_ids(record)

    if raw_ref is None:
        return normalize_object_ids(record)

    employee_object_id = None
    if isinstance(raw_ref, ObjectId):
        employee_object_id = raw_ref
    elif isinstance(raw_ref, str) and ObjectId.is_valid(raw_ref):
        employee_object_id = ObjectId(raw_ref)
    else:
        record["employeeId"] = raw_ref
        return normalize_object_ids(record)

    employee = await db.employees.find_one({"_id": employee_object_id})
    if employee:
        record["employeeId"] = normalize_object_ids(employee)
    else:
        record["employeeId"] = str(employee_object_id)

    return normalize_object_ids(record)


async def _populate_branch_reference(db, record: Dict[str, Any]) -> Dict[str, Any]:
    branch_ref = record.get("branchId")
    if branch_ref is None:
        return record

    if isinstance(branch_ref, dict):
        record["branchId"] = normalize_object_ids(branch_ref)
        return normalize_object_ids(record)

    branch_object_id = None
    if isinstance(branch_ref, ObjectId):
        branch_object_id = branch_ref
    elif isinstance(branch_ref, str) and ObjectId.is_valid(branch_ref):
        branch_object_id = ObjectId(branch_ref)
    else:
        record["branchId"] = branch_ref
        return normalize_object_ids(record)

    branch = await db.branches.find_one({"_id": branch_object_id})
    if branch:
        record["branchId"] = normalize_object_ids(branch)
    else:
        record["branchId"] = str(branch_object_id)

    return normalize_object_ids(record)


async def _fetch_records_for_employee(collection, db, employee_id: str):
    employee_object_id = parse_object_id(employee_id, "employeeId")
    records = []
    cursor = collection.find(_legacy_employee_match(employee_object_id))
    async for record in cursor:
        rec = await _populate_employee_reference(db, record)
        rec = await _populate_branch_reference(db, rec)
        records.append(rec)
    return records

@router.get("/attendance", dependencies=[Depends(PermissionChecker("attendance", "read"))])
async def get_attendance(request: Request, branchId: Optional[str] = None):
    db = request.app.state.db
    records = []
    query = {}
    if branchId:
        branch_obj = parse_object_id(branchId, "branchId")
        query["branchId"] = branch_obj
    cursor = db.attendance.find(query)
    async for rec in cursor:
        r = await _populate_employee_reference(db, rec)
        r = await _populate_branch_reference(db, r)
        records.append(r)
    return records


@router.get("/attendance/{employee_id}", dependencies=[Depends(PermissionChecker("attendance", "read"))])
async def get_attendance_by_employee(employee_id: str, request: Request, branchId: Optional[str] = None):
    db = request.app.state.db
    if branchId:
        branch_obj = parse_object_id(branchId, "branchId")
        # build combined query inside helper
        employee_object_id = parse_object_id(employee_id, "employeeId")
        records = []
        cursor = db.attendance.find({"$and": [_legacy_employee_match(employee_object_id), {"branchId": branch_obj}]})
        async for record in cursor:
            r = await _populate_employee_reference(db, record)
            r = await _populate_branch_reference(db, r)
            records.append(r)
        return records
    return await _fetch_records_for_employee(db.attendance, db, employee_id)

@router.post("/attendance", dependencies=[Depends(PermissionChecker("attendance", "create"))])
async def add_attendance(record: Attendance, request: Request):
    db = request.app.state.db
    rec = record.model_dump(exclude_unset=True)
    print("[POST /attendance] req.body:", rec)
    employee_object_id = parse_object_id(rec.get("employeeId"), "employeeId")
    employee = await db.employees.find_one({"_id": employee_object_id})
    if not employee:
        raise HTTPException(status_code=400, detail="Employee not found")
    rec["employeeId"] = employee_object_id
    # handle branchId if provided
    if rec.get("branchId") is not None:
        branch_obj = parse_object_id(rec.get("branchId"), "branchId")
        branch = await db.branches.find_one({"_id": branch_obj})
        if not branch:
            raise HTTPException(status_code=400, detail="Branch not found")
        rec["branchId"] = branch_obj
    else:
        # Fallback to employee's branch
        emp_branch = employee.get("branch_id") or employee.get("branchId") or employee.get("branch")
        if emp_branch:
            try:
                branch_obj = parse_object_id(emp_branch, "branchId")
                rec["branchId"] = branch_obj
            except Exception:
                pass
    result = await db.attendance.insert_one(rec)
    saved = await db.attendance.find_one({"_id": result.inserted_id})
    populated = await _populate_employee_reference(db, saved or rec)
    populated = await _populate_branch_reference(db, populated)
    print("[POST /attendance] saved document:", populated)
    return populated

@router.get("/leaves", dependencies=[Depends(PermissionChecker("leaves", "read"))])
async def get_leaves(request: Request, branchId: Optional[str] = None):
    db = request.app.state.db
    leaves = []
    query = {}
    if branchId:
        query["branchId"] = parse_object_id(branchId, "branchId")
    cursor = db.leaves.find(query)
    async for leave in cursor:
        l = await _populate_employee_reference(db, leave)
        l = await _populate_branch_reference(db, l)
        leaves.append(l)
    return leaves


@router.get("/leaves/{employee_id}", dependencies=[Depends(PermissionChecker("leaves", "read"))])
async def get_leaves_by_employee(employee_id: str, request: Request):
    db = request.app.state.db
    return await _fetch_records_for_employee(db.leaves, db, employee_id)

@router.post("/leaves", dependencies=[Depends(PermissionChecker("leaves", "create"))])
async def add_leave(leave: Leave, request: Request):
    db = request.app.state.db
    lv = leave.model_dump(exclude_unset=True)
    print("[POST /leaves] req.body:", lv)
    employee_object_id = parse_object_id(lv.get("employeeId"), "employeeId")
    employee = await db.employees.find_one({"_id": employee_object_id})
    if not employee:
        raise HTTPException(status_code=400, detail="Employee not found")
    lv["employeeId"] = employee_object_id
    if lv.get("branchId") is not None:
        branch_obj = parse_object_id(lv.get("branchId"), "branchId")
        branch = await db.branches.find_one({"_id": branch_obj})
        if not branch:
            raise HTTPException(status_code=400, detail="Branch not found")
        lv["branchId"] = branch_obj
    result = await db.leaves.insert_one(lv)
    saved = await db.leaves.find_one({"_id": result.inserted_id})
    populated = await _populate_employee_reference(db, saved or lv)
    populated = await _populate_branch_reference(db, populated)
    print("[POST /leaves] saved document:", populated)
    return populated


@router.put("/leaves/{leave_id}", dependencies=[Depends(PermissionChecker("leaves", "update"))])
async def update_leave(leave_id: str, payload: Dict[str, Any], request: Request):
    db = request.app.state.db
    update_doc = dict(payload or {})
    print("[PUT /leaves/{leave_id}] req.body:", update_doc)
    update_doc.pop("_id", None)
    update_doc.pop("employee", None)
    update_doc.pop("employeeName", None)
    
    if "employeeId" in update_doc and update_doc["employeeId"] is not None:
        emp_ref = update_doc["employeeId"]
        if isinstance(emp_ref, dict):
            emp_ref = emp_ref.get("_id")
        employee_object_id = parse_object_id(emp_ref, "employeeId")
        employee = await db.employees.find_one({"_id": employee_object_id})
        if not employee:
            raise HTTPException(status_code=400, detail="Employee not found")
        update_doc["employeeId"] = employee_object_id
        
    if "branchId" in update_doc and update_doc["branchId"] is not None:
        branch_ref = update_doc["branchId"]
        if isinstance(branch_ref, dict):
            branch_ref = branch_ref.get("_id")
        branch_obj = parse_object_id(branch_ref, "branchId")
        branch = await db.branches.find_one({"_id": branch_obj})
        if not branch:
            raise HTTPException(status_code=400, detail="Branch not found")
        update_doc["branchId"] = branch_obj

    result = await db.leaves.update_one(
        {"_id": parse_object_id(leave_id, "leave_id")},
        {"$set": update_doc},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Leave not found")

    saved = await db.leaves.find_one({"_id": parse_object_id(leave_id, "leave_id")})
    populated = await _populate_employee_reference(db, saved or update_doc)
    print("[PUT /leaves/{leave_id}] saved document:", populated)
    return populated

@router.get("/payroll", dependencies=[Depends(PermissionChecker("payroll", "read"))])
async def get_payroll(request: Request, branchId: Optional[str] = None):
    db = request.app.state.db
    payrolls = []
    query = {}
    if branchId:
        query["branchId"] = parse_object_id(branchId, "branchId")
    cursor = db.payroll.find(query)
    async for pr in cursor:
        p = await _populate_employee_reference(db, pr)
        p = await _populate_branch_reference(db, p)
        payrolls.append(p)
    return payrolls


@router.get("/payroll/{employee_id}", dependencies=[Depends(PermissionChecker("payroll", "read"))])
async def get_payroll_by_employee(employee_id: str, request: Request):
    db = request.app.state.db
    return await _fetch_records_for_employee(db.payroll, db, employee_id)

@router.post("/payroll", dependencies=[Depends(PermissionChecker("payroll", "create"))])
async def add_payroll(payroll: Payroll, request: Request):
    db = request.app.state.db
    pr = payroll.model_dump(exclude_unset=True)
    print("[POST /payroll] req.body:", pr)
    employee_object_id = parse_object_id(pr.get("employeeId"), "employeeId")
    employee = await db.employees.find_one({"_id": employee_object_id})
    if not employee:
        raise HTTPException(status_code=400, detail="Employee not found")
    pr["employeeId"] = employee_object_id
    if pr.get("branchId") is not None:
        branch_obj = parse_object_id(pr.get("branchId"), "branchId")
        branch = await db.branches.find_one({"_id": branch_obj})
        if not branch:
            raise HTTPException(status_code=400, detail="Branch not found")
        pr["branchId"] = branch_obj

    month = pr.get("month")
    if not month:
        raise HTTPException(status_code=400, detail="month is required")

    existing = await db.payroll.find_one({"employeeId": employee_object_id, "month": month})
    if existing:
        await db.payroll.update_one(
            {"_id": existing["_id"]},
            {"$set": pr},
        )
        saved = await db.payroll.find_one({"_id": existing["_id"]})
    else:
        result = await db.payroll.insert_one(pr)
        saved = await db.payroll.find_one({"_id": result.inserted_id})

        # Inject Unified Transaction for Salary
        from datetime import datetime
        tx = {
            "type": "salary",
            "amount": float(pr.get("amount", 0)),
            "method": "cash", # Defaulting to cash for salaries unless expanded
            "referenceId": str(employee_object_id),
            "referenceType": "Employee",
            "date": datetime.utcnow().isoformat(),
            "description": f"Salary payment for month: {month}",
            "status": "Completed"
        }
        await db.transactions.insert_one(tx)
        print(f"[DEBUG TRANSACTION] Created unified transaction for salary. Linked reference -> employeeId: {tx['referenceId']}")

    populated = await _populate_employee_reference(db, saved or pr)
    print("[POST /payroll] saved document:", populated)
    return populated


@router.put("/payroll/{payroll_id}", dependencies=[Depends(PermissionChecker("payroll", "update"))])
async def update_payroll(payroll_id: str, payload: Dict[str, Any], request: Request):
    db = request.app.state.db
    update_doc = dict(payload or {})
    print("[PUT /payroll/{payroll_id}] req.body:", update_doc)
    update_doc.pop("_id", None)

    if "employeeId" in update_doc and update_doc["employeeId"] is not None:
        employee_object_id = parse_object_id(update_doc["employeeId"], "employeeId")
        employee = await db.employees.find_one({"_id": employee_object_id})
        if not employee:
            raise HTTPException(status_code=400, detail="Employee not found")
        update_doc["employeeId"] = employee_object_id

    payroll_object_id = parse_object_id(payroll_id, "payroll_id")
    result = await db.payroll.update_one(
        {"_id": payroll_object_id},
        {"$set": update_doc},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Payroll record not found")

    saved = await db.payroll.find_one({"_id": payroll_object_id})
    populated = await _populate_employee_reference(db, saved or update_doc)
    print("[PUT /payroll/{payroll_id}] saved document:", populated)
    return populated
