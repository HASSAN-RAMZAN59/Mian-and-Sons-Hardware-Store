from fastapi import APIRouter, HTTPException, status, Depends, Request, Response
from models import User, UserUpdate
from audit_logger import log_activity
from rate_limiter import login_limiter
from bson import ObjectId
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import jwt
import os
from datetime import datetime, timedelta

router = APIRouter()

SECRET_KEY = os.getenv("SECRET_KEY", "mysecretkey")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

try:
    # prefer argon2 if available for stronger hashing
    import argon2  # type: ignore
    _schemes = ["argon2", "pbkdf2_sha256", "bcrypt"]
except Exception:
    # fallback path avoids bcrypt as default to prevent 72-byte limit errors
    _schemes = ["pbkdf2_sha256", "bcrypt"]

pwd_context = CryptContext(
    schemes=_schemes,
    deprecated="auto",
    bcrypt__truncate_error=False,
)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login")

def verify_password(plain_password, hashed_password):
    try:
        scheme = pwd_context.identify(hashed_password) if hashed_password else None
    except Exception:
        scheme = None

    # If the stored hash uses bcrypt, bcrypt truncates passwords to 72 bytes.
    # Truncate the plain password bytes the same way before verifying.
    if scheme == 'bcrypt' and isinstance(plain_password, str):
        b = plain_password.encode('utf-8')
        if len(b) > 72:
            plain_password = b[:72].decode('utf-8', errors='ignore')

    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    # When the context's default scheme is bcrypt, ensure password is truncated to 72 bytes
    try:
        default_scheme = _schemes[0] if isinstance(_schemes, (list, tuple)) and len(_schemes) > 0 else None
    except Exception:
        default_scheme = None

    if default_scheme == 'bcrypt' and isinstance(password, str):
        b = password.encode('utf-8')
        if len(b) > 72:
            password = b[:72].decode('utf-8', errors='ignore')

    try:
        return pwd_context.hash(password)
    except ValueError:
        # Extra hard fallback: if bcrypt backend still raises length errors,
        # hash with pbkdf2 to keep signup/create-user path stable.
        if isinstance(password, str):
            return pwd_context.hash(password, scheme='pbkdf2_sha256')
        raise

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_token_from_request(request: Request):
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.split(" ")[1]
    return request.cookies.get("access_token")

@router.post("/users/signup")
async def signup(user: User, request: Request):
    if user.username:
        user.username = user.username.strip()
    db = request.app.state.db
    print("[POST /users/signup] db:", db.name)
    print("[POST /users/signup] payload:", {"username": user.username, "role": user.role})
    try:
        existing = await db.users.find_one({"username": user.username})
        if existing:
            print("[POST /users/signup] username exists")
            raise HTTPException(status_code=400, detail="Username already exists")
        user.password = get_password_hash(user.password)
        # Prepare dict and remove any keys with None to avoid inserting _id: None
        payload = {k: v for k, v in user.dict(by_alias=True).items() if v is not None}
        # Force-remove any id fields that might still be present to avoid _id: null insert
        payload.pop('_id', None)
        payload.pop('id', None)
        print("[POST /users/signup] payload to insert:", payload)
        result = await db.users.insert_one(payload)
        inserted_id = getattr(result, 'inserted_id', None)
        # If driver didn't return inserted_id for some reason, re-query by username
        if not inserted_id:
            doc = await db.users.find_one({"username": user.username})
            if doc and doc.get("_id"):
                inserted_id = doc.get("_id")

        user.id = str(inserted_id) if inserted_id is not None else None
        response = {"id": user.id, "username": user.username, "role": user.role}
        print("[POST /users/signup] inserted:", response)
        await log_activity(request, action="Created", module="Users", description=f"Signed up new user: {user.username} with role {user.role}", override_username=user.username, override_role=user.role)
        return response
    except HTTPException:
        raise
    except Exception as exc:
        print("[POST /users/signup] error:", str(exc))
        raise HTTPException(status_code=500, detail=str(exc))

async def seed_default_users(db):
    default_users = [
        {"username": "superadmin", "password": "super123", "role": "superadmin", "name": "Super Admin"},
        {"username": "admin", "password": "admin123", "role": "admin", "name": "Admin User"},
        {"username": "manager", "password": "manager123", "role": "manager", "name": "Store Manager"},
        {"username": "cashier", "password": "cashier123", "role": "cashier", "name": "Cashier"}
    ]
    for u in default_users:
        existing = await db.users.find_one({"username": u["username"]})
        if not existing:
            hashed_pwd = get_password_hash(u["password"])
            payload = {
                "username": u["username"],
                "password": hashed_pwd,
                "role": u["role"],
                "name": u["name"],
                "email": f"{u['username']}@miansons.com"
            }
            await db.users.insert_one(payload)
            print(f"[Seed] Created default user: {u['username']}")

@router.post("/users/login")
async def login(request: Request, response: Response):
    login_limiter.check(request)
    db = request.app.state.db
    content_type = request.headers.get("content-type", "")

    username = None
    password = None
    remember_me = False

    if "application/json" in content_type:
        try:
            payload = await request.json()
        except Exception:
            payload = {}
        username = payload.get("username")
        password = payload.get("password")
        remember_me = bool(payload.get("rememberMe", False))
    else:
        form_data = await request.form()
        username = form_data.get("username")
        password = form_data.get("password")
        remember_raw = form_data.get("rememberMe")
        remember_me = str(remember_raw).lower() in {"1", "true", "yes", "on"}

    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password are required")

    if isinstance(username, str):
        username = username.strip()

    user = await db.users.find_one({"username": username})
    if not user or not verify_password(password, user["password"]):
        await log_activity(request, action="Login", module="Auth", description=f"Failed login attempt for username: {username}", is_suspicious=True, override_username=username, override_role="N/A")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    expiry = timedelta(days=7) if remember_me else timedelta(days=1)
    token = create_access_token({"sub": user["username"], "role": user["role"]}, expires_delta=expiry)
    await log_activity(request, action="Login", module="Auth", description=f"Successful login for user: {username}", override_username=username, override_role=user["role"])
    
    # Set the secure HttpOnly cookie
    is_secure = request.url.scheme == "https"
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=is_secure,
        samesite="lax",
        max_age=int(expiry.total_seconds()),
        path="/"
    )
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user["role"],
        "username": user["username"],
        "id": str(user["_id"]),
        "name": user.get("name", user["username"]),
        "email": user.get("email", f"{user['username']}@miansons.com"),
        "expires_in": int(expiry.total_seconds()),
        "remember_me": remember_me,
    }


@router.post("/users/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", path="/")
    return {"success": True, "message": "Logged out successfully"}


# List all users
@router.get("/users")
async def list_users(request: Request):
    db = request.app.state.db
    users = []
    cursor = db.users.find()
    async for user in cursor:
        # ensure both _id and id fields are present as strings for frontend compatibility
        _id = user.get("_id")
        try:
            user["_id"] = str(_id)
        except Exception:
            user["_id"] = None
        user["id"] = user["_id"]
        user.pop("password", None)
        users.append(user)
    return users

# Update user
@router.put("/users/{user_id}")
async def update_user(user_id: str, user: UserUpdate, request: Request):
    db = request.app.state.db
    update_data = user.dict(exclude_unset=True, by_alias=True)
    
    # Hash password if provided
    if "password" in update_data and update_data["password"]:
        update_data["password"] = get_password_hash(update_data["password"])
    else:
        update_data.pop("password", None)

    # Support both MongoDB ObjectId and legacy string id fields
    query = None
    try:
        query = {"_id": ObjectId(user_id)}
    except Exception:
        query = {"id": user_id}

    result = await db.users.update_one(query, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    updated = await db.users.find_one(query)
    updated["_id"] = str(updated["_id"])
    updated.pop("password", None)
    await log_activity(request, action="Updated", module="Users", description=f"Updated user profile for: {updated.get('username')}")
    return updated

# Delete user
@router.delete("/users/{user_id}")
async def delete_user(user_id: str, request: Request):
    db = request.app.state.db
    target_user = None
    try:
        target_user = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        target_user = await db.users.find_one({"id": user_id})

    try:
        result = await db.users.delete_one({"_id": ObjectId(user_id)})
    except Exception:
        # fallback: match by id field
        result = await db.users.delete_one({"id": user_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
        
    username = target_user.get("username") if target_user else user_id
    await log_activity(request, action="Deleted", module="Users", description=f"Deleted user account: {username}")
    return {"success": True}

from pydantic import BaseModel

class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str

@router.post("/users/change-password")
async def change_password(payload: ChangePasswordRequest, request: Request):
    db = request.app.state.db
    token = get_token_from_request(request)
    if not token:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        token_data = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = token_data.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if not verify_password(payload.currentPassword, user["password"]):
        await log_activity(request, action="Update Password", module="Auth", description=f"Failed password change attempt for user {username}", is_suspicious=True, override_username=username, override_role=user.get("role"))
        raise HTTPException(status_code=400, detail="Incorrect current password")
        
    new_hashed = get_password_hash(payload.newPassword)
    await db.users.update_one({"username": username}, {"$set": {"password": new_hashed}})
    await log_activity(request, action="Update Password", module="Auth", description=f"Successfully changed password for user {username}", override_username=username, override_role=user.get("role"))
    return {"success": True, "message": "Password changed successfully"}
