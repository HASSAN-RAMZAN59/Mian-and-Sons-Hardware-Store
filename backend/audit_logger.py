import datetime
import os
import jwt
from fastapi import Request

SECRET_KEY = os.getenv("SECRET_KEY", "mysecretkey")
ALGORITHM = "HS256"

async def log_activity(
    request: Request,
    action: str,      # e.g., 'Created', 'Updated', 'Deleted', 'Login', 'Logout'
    module: str,      # e.g., 'Employees', 'Inventory', 'Sales', 'Purchases', 'Branches', 'Discounts', 'Returns', 'Expenses', 'Auth'
    description: str,
    is_suspicious: bool = False,
    override_username: str = None,
    override_role: str = None
):
    try:
        db = request.app.state.db
        
        # Parse user name and role from Authorization header token
        user_name = override_username or "Guest"
        user_role = override_role or "N/A"
        
        if not override_username:
            token = request.cookies.get("access_token")
            if not token:
                auth_header = request.headers.get("authorization")
                if auth_header and auth_header.startswith("Bearer "):
                    token = auth_header.split(" ")[1]
            
            if token:
                if token.startswith("demo-jwt-token-"):
                    user_name = "superadmin"
                    user_role = "superadmin"
                else:
                    try:
                        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                        user_name = payload.get("sub", "System")
                        user_role = payload.get("role", "cashier")
                    except Exception:
                        user_name = "Invalid User"
                        user_role = "N/A"
                        is_suspicious = True
        
        # Get client IP and User-Agent
        ip_address = request.client.host if request.client else "127.0.0.1"
        user_agent = request.headers.get("user-agent", "Unknown Device")
        
        # Clean user-agent to a friendly device name
        device = "Desktop/Browser"
        if "Mobi" in user_agent:
            device = "Mobile"
        elif "Tablet" in user_agent:
            device = "Tablet"
            
        log_entry = {
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "userName": user_name,
            "userRole": user_role,
            "action": action,
            "module": module,
            "description": description,
            "ipAddress": ip_address,
            "device": f"{device} ({user_agent[:40]}...)" if len(user_agent) > 40 else f"{device} ({user_agent})",
            "isSuspicious": is_suspicious
        }
        
        await db.audit.insert_one(log_entry)
        print(f"[AUDIT LOG SUCCESS] {action} in {module} by {user_name} ({user_role}): {description}")
    except Exception as e:
        print(f"[AUDIT LOGGER ERROR] Failed to log activity: {e}")
