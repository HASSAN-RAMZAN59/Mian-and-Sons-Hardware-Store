from fastapi import APIRouter, HTTPException, Request, Depends
from auth_utils import PermissionChecker

from db_utils import normalize_object_ids, parse_object_id
from models import Branch
from audit_logger import log_activity

router = APIRouter()

@router.get("/branches", dependencies=[Depends(PermissionChecker("branches", "read"))])
async def get_branches(request: Request):
    db = request.app.state.db
    branches = []
    # Fetch only active branches by default
    cursor = db.branches.find({"status": {"$in": ["Active", None]}})
    async for branch in cursor:
        br = normalize_object_ids(branch)
        br["status"] = br.get("status", "Active")
        if not br.get("openingDate"):
            br["openingDate"] = "2024-01-01"
        # Compute employee count for this branch
        try:
            branch_id_str = str(branch.get("_id"))
            branch_id_obj = branch.get("_id")
            emp_count = await db.employees.count_documents({
                "$or": [
                    {"branch_id": branch_id_obj},
                    {"branch_id": branch_id_str},
                    {"branchId": branch_id_obj},
                    {"branchId": branch_id_str}
                ]
            })
        except Exception:
            emp_count = 0
        br["employeeCount"] = int(emp_count or 0)

        # Compute stock value: sum(quantity * product.purchasePrice) for inventory items of this branch
        try:
            pipeline = [
                {"$match": {"branch_id": branch.get("_id")}},
                {"$lookup": {
                    "from": "products",
                    "localField": "product_id",
                    "foreignField": "_id",
                    "as": "product"
                }},
                {"$unwind": {"path": "$product", "preserveNullAndEmptyArrays": True}},
                {"$project": {"value": {"$multiply": [{"$ifNull": ["$quantity", 0]}, {"$ifNull": ["$product.purchasePrice", 0]}]}}},
                {"$group": {"_id": None, "total": {"$sum": "$value"}}}
            ]
            agg = await db.inventory.aggregate(pipeline).to_list(length=1)
            stock_value = float(agg[0]["total"]) if agg and agg[0].get("total") is not None else 0.0
        except Exception:
            stock_value = 0.0
        br["stockValue"] = stock_value

        # Preserve any existing totalSales field or default to 0
        br["totalSales"] = float(br.get("totalSales") or 0)

        # Provide convenient `id` field for frontend (mirror of _id)
        if br.get("_id"):
            br["id"] = br.get("_id")

        branches.append(br)
    print(f"[DEBUG] Fetched {len(branches)} active branches. Sample: {branches[0] if branches else 'None'}")
    return branches

@router.post("/branches", dependencies=[Depends(PermissionChecker("branches", "create"))])
async def add_branch(branch: Branch, request: Request):
    db = request.app.state.db
    br = branch.dict(exclude_unset=True)
    if br.get("manager_employee_id"):
        br["manager_employee_id"] = parse_object_id(br.get("manager_employee_id"), "manager_employee_id")
        manager = await db.employees.find_one({"_id": br["manager_employee_id"]})
        if not manager:
            raise HTTPException(status_code=400, detail="Manager not found")
    
    print(f"[DEBUG] Incoming branch data for POST: {br}")
    result = await db.branches.insert_one(br)
    br["_id"] = result.inserted_id
    br["id"] = str(result.inserted_id)
    await log_activity(request, action="Created", module="Branches", description=f"Created new branch: {br.get('name')}")
    return normalize_object_ids(br)

@router.put("/branches/{id}", dependencies=[Depends(PermissionChecker("branches", "update"))])
async def update_branch(id: str, branch: Branch, request: Request):
    db = request.app.state.db
    br = branch.dict(exclude_unset=True)
    
    if br.get("manager_employee_id"):
        br["manager_employee_id"] = parse_object_id(br.get("manager_employee_id"), "manager_employee_id")
        manager = await db.employees.find_one({"_id": br["manager_employee_id"]})
        if not manager:
            raise HTTPException(status_code=400, detail="Manager not found")
            
    print(f"[DEBUG] Incoming branch data for PUT (id={id}): {br}")
    result = await db.branches.update_one(
        {"_id": parse_object_id(id, "branch_id")},
        {"$set": br}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Branch not found")
        
    br["_id"] = parse_object_id(id, "branch_id")
    br["id"] = str(br["_id"]) if br.get("_id") else None
    await log_activity(request, action="Updated", module="Branches", description=f"Updated branch profile: {br.get('name')}")
    return normalize_object_ids(br)


@router.get("/branches/{id}", dependencies=[Depends(PermissionChecker("branches", "read"))])
async def get_branch_by_id(id: str, request: Request):
    db = request.app.state.db
    try:
        oid = parse_object_id(id, "branch_id")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid branch id")
    branch = await db.branches.find_one({"_id": oid})
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    br = normalize_object_ids(branch)
    br["id"] = br.get("_id")
    # compute counts and stock similarly to list
    try:
        branch_id_str = str(branch.get("_id"))
        branch_id_obj = branch.get("_id")
        emp_count = await db.employees.count_documents({
            "$or": [
                {"branch_id": branch_id_obj},
                {"branch_id": branch_id_str},
                {"branchId": branch_id_obj},
                {"branchId": branch_id_str}
            ]
        })
    except Exception:
        emp_count = 0
    br["employeeCount"] = int(emp_count or 0)
    try:
        pipeline = [
            {"$match": {"branch_id": branch.get("_id")}},
            {"$lookup": {
                "from": "products",
                "localField": "product_id",
                "foreignField": "_id",
                "as": "product"
            }},
            {"$unwind": {"path": "$product", "preserveNullAndEmptyArrays": True}},
            {"$project": {"value": {"$multiply": [{"$ifNull": ["$quantity", 0]}, {"$ifNull": ["$product.purchasePrice", 0]}]}}},
            {"$group": {"_id": None, "total": {"$sum": "$value"}}}
        ]
        agg = await db.inventory.aggregate(pipeline).to_list(length=1)
        stock_value = float(agg[0]["total"]) if agg and agg[0].get("total") is not None else 0.0
    except Exception:
        stock_value = 0.0
    br["stockValue"] = stock_value
    br["totalSales"] = float(br.get("totalSales") or 0)
    return br


@router.delete("/branches/{id}", dependencies=[Depends(PermissionChecker("branches", "delete"))])
async def delete_branch(id: str, request: Request):
    db = request.app.state.db
    try:
        oid = parse_object_id(id, "branch_id")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid branch id")
    branch = await db.branches.find_one({"_id": oid})
    result = await db.branches.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Branch not found")
    branch_name = branch.get("name") if branch else id
    await log_activity(request, action="Deleted", module="Branches", description=f"Deleted branch: {branch_name}")
    return {"success": True}
