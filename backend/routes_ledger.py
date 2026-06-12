from fastapi import APIRouter, Request, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

router = APIRouter()

class LedgerEntry(BaseModel):
    date: str
    account: str
    description: str
    debit: float
    credit: float
    balance: float

@router.get("/ledger", response_model=List[LedgerEntry])
async def get_ledger(request: Request, from_date: Optional[str] = Query(None), to_date: Optional[str] = Query(None)):
    db = request.app.state.db
    query = {}
    if from_date and to_date:
        query["date"] = {"$gte": from_date, "$lte": to_date}
    elif from_date:
        query["date"] = {"$gte": from_date}
    elif to_date:
        query["date"] = {"$lte": to_date}
    entries = []
    cursor = db.ledger.find(query)
    async for entry in cursor:
        entry["_id"] = str(entry["_id"])
        entries.append(entry)
    return entries
