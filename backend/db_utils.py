from typing import Any, Dict, Iterable, List, Optional
from bson import ObjectId
from fastapi import HTTPException


def parse_object_id(value: Optional[str], field_name: str) -> Optional[ObjectId]:
    if value is None:
        return None
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=400, detail=f"Invalid {field_name}")
    return ObjectId(value)


def parse_object_id_list(values: Optional[Iterable[str]], field_name: str) -> List[ObjectId]:
    if not values:
        return []
    parsed: List[ObjectId] = []
    for value in values:
        parsed.append(parse_object_id(value, field_name))
    return parsed


def normalize_object_ids(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, list):
        return [normalize_object_ids(item) for item in value]
    if isinstance(value, dict):
        return {key: normalize_object_ids(val) for key, val in value.items()}
    return value
