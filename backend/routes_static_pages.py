from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel


class StaticPagePayload(BaseModel):
    title: str
    content: str

router = APIRouter()


async def _get_page_doc(request: Request, slug: str):
    db = request.app.state.db
    page = await db.static_pages.find_one({"slug": slug})
    if not page:
        raise HTTPException(status_code=404, detail=f"{slug} page not found")
    page["_id"] = str(page["_id"])
    return page

@router.get("/about")
async def get_about(request: Request):
    return await _get_page_doc(request, "about")

@router.get("/contact")
async def get_contact(request: Request):
    return await _get_page_doc(request, "contact")


@router.put("/static-pages/{slug}")
async def upsert_static_page(slug: str, payload: StaticPagePayload, request: Request):
    db = request.app.state.db
    update_result = await db.static_pages.update_one(
        {"slug": slug},
        {"$set": {"slug": slug, "title": payload.title, "content": payload.content}},
        upsert=True,
    )

    if not update_result.acknowledged:
        raise HTTPException(status_code=500, detail="Failed to update static page")

    return await _get_page_doc(request, slug)
