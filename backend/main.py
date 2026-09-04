# Trigger reload 2
from routes_dashboard import router as dashboard_router
from routes_damaged import router as damaged_router
from fastapi import FastAPI
from fastapi import Request, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from routes_products import router as products_router
from routes_cashbook import router as cashbook_router
from routes_daybook import router as daybook_router
from routes_ledger import router as ledger_router
from routes_users import router as users_router
from routes_categories import router as categories_router
from routes_orders import router as orders_router
from routes_customers import router as customers_router
from routes_cart import router as cart_router
from routes_wishlist import router as wishlist_router
from routes_inventory import router as inventory_router
from routes_reports import router as reports_router
from routes_employees import router as employees_router
from routes_expenses import router as expenses_router
from routes_notifications import router as notifications_router
from routes_audit import router as audit_router
from routes_payments import router as payments_router
from routes_branches import router as branches_router
from routes_discounts import router as discounts_router
from routes_hr import router as hr_router
from routes_returns import router as returns_router
from routes_suppliers import router as suppliers_router
from routes_warranties import router as warranties_router
from routes_brands import router as brands_router
from routes_compare import router as compare_router
from routes_static_pages import router as static_pages_router
from routes_checkout_config import router as checkout_config_router
from routes_purchases import router as purchases_router
from routes_password_reset import router as password_reset_router
from routes_system import router as system_router
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os
import urllib.request
from dotenv import load_dotenv

load_dotenv(override=True)

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]
env_origins = os.getenv("ALLOWED_ORIGINS")
if env_origins:
    ALLOWED_ORIGINS.extend([origin.strip() for origin in env_origins.split(",") if origin.strip()])

app = FastAPI()


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    # CSRF check: verify Origin or Referer for cookie-authenticated write actions
    if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
        has_cookies = len(request.cookies) > 0
        if has_cookies:
            origin = request.headers.get("origin")
            referer = request.headers.get("referer")
            trusted = False
            for allowed in ALLOWED_ORIGINS:
                if origin and origin.startswith(allowed):
                    trusted = True
                    break
                if referer and referer.startswith(allowed):
                    trusted = True
                    break
            if not trusted and (origin or referer):
                print(f"[CSRF BLOCKED] Suspicious request from Origin: {origin}, Referer: {referer}")
                return JSONResponse(status_code=403, content={"detail": "CSRF verification failed"})

    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.middleware("http")
async def log_requests(request: Request, call_next):
    body = await request.body()
    print(f"[HTTP] incoming {request.method} {request.url.path}")
    print(f"[HTTP] full_url: {request.url}")
    print(f"[HTTP] base_url: {request.base_url}")
    print(f"[HTTP] db_name: {getattr(getattr(request.app.state, 'db', None), 'name', None)}")
    if request.method.upper() == "POST":
        try:
            print(f"[HTTP] raw_body: {body.decode('utf-8')}")
        except Exception:
            print(f"[HTTP] raw_body_bytes: {body}")

    response = await call_next(request)
    print(f"[HTTP] response {response.status_code} for {request.method} {request.url.path}")
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    print(f"[ValidationError] {request.method} {request.url.path}")
    print("[ValidationError] errors:", exc.errors())
    print("[ValidationError] body:", exc.body)
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    print(f"[HTTPException] {request.method} {request.url.path} -> {exc.status_code}")
    print("[HTTPException] detail:", exc.detail)
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    traceback.print_exc()
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    schema = get_openapi(
        title="Hardware Store API",
        version="1.0.0",
        description="API documentation for Mian & Sons Hardware backend",
        routes=app.routes,
    )

    # Remove default 422 docs entries to avoid confusion in Swagger UI.
    for path_item in schema.get("paths", {}).values():
        for operation in path_item.values():
            if isinstance(operation, dict) and "responses" in operation:
                operation["responses"].pop("422", None)

    app.openapi_schema = schema
    return app.openapi_schema


app.openapi = custom_openapi

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# MongoDB client - Single Database Connection
DATABASE_NAME = os.getenv("DATABASE_NAME", "Mian_Sons_hardware_db")
client = AsyncIOMotorClient(MONGODB_URL, minPoolSize=10, maxPoolSize=100)
app.state.db = client[DATABASE_NAME]

app.mount("/images", StaticFiles(directory=os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "public", "images"))), name="images")

async def keep_alive_task():
    """
    Render Free Tier Spin-Down Preventer:
    Pings the service's public URL every 14 minutes.
    On Render, `RENDER_EXTERNAL_URL` is automatically set (e.g., https://your-service.onrender.com).
    Alternatively, you can set `SELF_PING_URL` in environment variables.
    """
    # Wait 60 seconds after server starts before the first self-ping
    await asyncio.sleep(60)

    url = os.getenv("RENDER_EXTERNAL_URL") or os.getenv("SELF_PING_URL")
    if not url:
        print("[KEEP-ALIVE] Notice: Neither RENDER_EXTERNAL_URL nor SELF_PING_URL is defined.")
        print("[KEEP-ALIVE] Self-ping is inactive in local development (activates automatically on Render).")
        return

    target_url = f"{url.rstrip('/')}/ping"
    print(f"[KEEP-ALIVE] Self-ping active! Targeting {target_url} every 14 minutes.")

    while True:
        try:
            loop = asyncio.get_running_loop()

            def do_ping():
                req = urllib.request.Request(
                    target_url,
                    headers={"User-Agent": "Render-KeepAlive/1.0"}
                )
                with urllib.request.urlopen(req, timeout=15) as resp:
                    return resp.getcode()

            status_code = await loop.run_in_executor(None, do_ping)
            print(f"[KEEP-ALIVE] Ping sent successfully -> {target_url} [HTTP {status_code}]")
        except Exception as e:
            print(f"[KEEP-ALIVE] Ping notice: {e}")

        # Sleep for 14 minutes (840 seconds)
        await asyncio.sleep(840)


# Verify database connection on startup
@app.on_event("startup")
async def startup_event():
    """Verify MongoDB connection and log active database"""
    try:
        await app.state.db.command('ping')
        print("------------------------------------------")
        print(f"Successfully connected to MongoDB: {app.state.db.name}")
        print("------------------------------------------")
        # Seed default users
        from routes_users import seed_default_users
        await seed_default_users(app.state.db)
        # Ensure database indexes
        from db_config import ensure_indexes
        await ensure_indexes(app.state.db)
        # Start background self-ping task to prevent Render free tier sleep
        asyncio.create_task(keep_alive_task())
    except Exception as e:
        print("------------------------------------------")
        print(f"Error connecting to MongoDB: {e}")
        print("------------------------------------------")

@app.get("/")
async def root():
    return {"message": "Backend running!"}

@app.get("/ping")
async def ping():
    return {"status": "ok", "message": "pong"}

# Include all routers (no duplicates)
app.include_router(brands_router)
app.include_router(compare_router)
app.include_router(static_pages_router)
app.include_router(checkout_config_router)
app.include_router(products_router)
app.include_router(users_router)
app.include_router(categories_router)
app.include_router(orders_router)
app.include_router(customers_router)
app.include_router(cart_router)
app.include_router(wishlist_router)
app.include_router(inventory_router)
app.include_router(reports_router)
app.include_router(employees_router)
app.include_router(expenses_router)
app.include_router(notifications_router)
app.include_router(audit_router)
app.include_router(payments_router)
app.include_router(branches_router)
app.include_router(discounts_router)
app.include_router(hr_router)
app.include_router(returns_router)
app.include_router(suppliers_router)
app.include_router(warranties_router)
app.include_router(cashbook_router)
app.include_router(daybook_router)
app.include_router(ledger_router)
app.include_router(damaged_router)
app.include_router(dashboard_router)
app.include_router(purchases_router)
app.include_router(password_reset_router)
app.include_router(system_router)
