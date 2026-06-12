import logging

logger = logging.getLogger("db_config")

class DatabaseConfig:
    COLLECTIONS = {
        "users": "users",
        "products": "products",
        "customers": "customers",
        "orders": "orders",
        "expenses": "expenses",
        "purchases": "purchases",
        "branches": "branches",
        "categories": "categories",
        "discounts": "discounts",
        "damaged": "damaged",
        "suppliers": "suppliers",
        "warranties": "warranties",
        "payments": "payments",
        "attendance": "attendance",
        "leaves": "leaves",
        "payroll": "payroll",
        "cashbook": "cashbook",
        "audit": "audit",
        "backups": "backups",
        "customer_auth_accounts": "customer_auth_accounts",
        "otp_resets": "otp_resets",
        "settings": "settings",
        "returns": "returns",
        "transactions": "transactions",
        "brands": "brands",
        "wishlist": "wishlist",
        "cart": "cart",
        "notifications": "notifications"
    }

async def ensure_indexes(db):
    """
    Creates essential indexes on MongoDB collections to optimize lookup performance 
    and prevent full collection scans (COLLSCAN).
    """
    try:
        # customer_auth_accounts indexes for login, registration, password reset, and duplication checks
        await db.customer_auth_accounts.create_index([("email", 1)], unique=True, sparse=True)
        await db.customer_auth_accounts.create_index([("phone", 1)], unique=True, sparse=True)
        await db.customer_auth_accounts.create_index([("id", 1)], unique=True)

        # products indexes for category filtering, sorting, and search queries
        try:
            await db.products.create_index([("id", 1)], unique=True)
        except Exception:
            # If duplicates already exist, create non-unique or log warning
            await db.products.create_index([("id", 1)])
            
        await db.products.create_index([("category", 1)])
        await db.products.create_index([("brand", 1)])
        # Text search index for full-text lookup on product catalogs
        await db.products.create_index([("name", "text"), ("description", "text")])

        # orders indexes for customer history lookup, status reporting, and creation sorting
        try:
            await db.orders.create_index([("id", 1)], unique=True)
        except Exception:
            await db.orders.create_index([("id", 1)])
            
        await db.orders.create_index([("customerPhone", 1)])
        await db.orders.create_index([("status", 1)])
        await db.orders.create_index([("createdAt", -1)])

        # customers indexes for CRM lookups
        try:
            await db.customers.create_index([("phone", 1)], unique=True, sparse=True)
        except Exception:
            await db.customers.create_index([("phone", 1)])
            
        await db.customers.create_index([("email", 1)], sparse=True)


        # audit indexes for activity search and reverse-chronological sorting
        await db.audit.create_index([("timestamp", -1)])
        await db.audit.create_index([("action", 1)])
        await db.audit.create_index([("user_id", 1)])

        # otp_resets indexes for password reset token storage
        await db.otp_resets.create_index([("requestId", 1)], unique=True)
        # Time-To-Live index on createdAt field (600 seconds = 10 minutes expiry)
        await db.otp_resets.create_index([("createdAt", 1)], expireAfterSeconds=600)

        logger.info("[INDEXES] Database indexes validated and created successfully.")
        print("[INDEXES] Database indexes validated and created successfully.")
    except Exception as e:
        logger.error(f"[INDEXES ERROR] Failed to create database indexes: {e}")
        print(f"[INDEXES ERROR] Failed to create database indexes: {e}")
