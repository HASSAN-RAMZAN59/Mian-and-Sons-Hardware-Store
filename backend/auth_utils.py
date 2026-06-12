import os
import secrets
import jwt
from fastapi import Request, HTTPException, Depends
from typing import List, Optional

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    SECRET_KEY = secrets.token_hex(32)
ALGORITHM = "HS256"

def get_token_from_request(request: Request):
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.split(" ")[1]
    return request.cookies.get("access_token")

async def get_current_user(request: Request):
    token = get_token_from_request(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if username is None or role is None:
            raise HTTPException(status_code=401, detail="Invalid token claims")
        return {"username": username, "role": role}
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

class PermissionChecker:
    def __init__(self, module: str, action: str):
        self.module = module
        self.action = action

    def __call__(self, current_user: dict = Depends(get_current_user)):
        role = current_user.get("role")
        
        # Superadmin has all permissions
        if role == 'superadmin':
            return current_user
            
        # Admin has most permissions
        if role == 'admin':
            # Admin cannot delete critical data
            if self.action == 'delete' and self.module in ['users', 'settings']:
                raise HTTPException(status_code=403, detail="Permission denied")
            return current_user
            
        # Manager permissions
        if role == 'manager':
            manager_permissions = {
                'dashboard': ['read'],
                'products': ['read', 'create', 'update'],
                'categories': ['read', 'create', 'update'],
                'inventory': ['read', 'update'],
                'customers': ['read', 'create', 'update'],
                'suppliers': ['read', 'create', 'update'],
                'sales': ['read', 'create'],
                'pos': ['read', 'create'],
                'purchases': ['read', 'create'],
                'returns': ['read', 'create'],
                'payments': ['read', 'create'],
                'discounts': ['read'],
                'damaged': ['read'],
                'expenses': ['read'],
                'warranties': ['read'],
                'attendance': ['read'],
                'leaves': ['read'],
                'branches': ['read'],
                'accounts': ['read'],
                'cashbook': ['read'],
                'daybook': ['read']
            }
            allowed_actions = manager_permissions.get(self.module, [])
            if self.action in allowed_actions:
                return current_user
            raise HTTPException(status_code=403, detail="Permission denied")
            
        # Cashier permissions
        if role == 'cashier':
            cashier_permissions = {
                'pos': ['read', 'create'],
                'sales': ['read'],
                'customers': ['read']
            }
            allowed_actions = cashier_permissions.get(self.module, [])
            if self.action in allowed_actions:
                return current_user
            raise HTTPException(status_code=403, detail="Permission denied")
            
        raise HTTPException(status_code=403, detail="Permission denied")
