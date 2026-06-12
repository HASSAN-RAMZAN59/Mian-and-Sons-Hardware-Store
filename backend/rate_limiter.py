import time
import os
import uuid
from collections import defaultdict
from fastapi import HTTPException, Request, status

# Try importing redis and initializing client
try:
    import redis
    REDIS_URL = os.getenv("REDIS_URL")
    if REDIS_URL:
        redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    else:
        redis_client = None
except Exception:
    redis_client = None


class RateLimiter:
    def __init__(self, requests_limit: int, window_seconds: int, name: str = "Limiter"):
        self.requests_limit = requests_limit
        self.window_seconds = window_seconds
        self.name = name
        # Fallback local in-memory store
        self.requests = defaultdict(list)

    def check(self, request: Request):
        client_ip = request.client.host if request.client else "127.0.0.1"
        now = time.time()
        
        if redis_client is not None:
            try:
                # Key format: rate_limit:{name}:{ip}
                key = f"rate_limit:{self.name}:{client_ip}"
                cutoff = now - self.window_seconds
                
                # Transaction pipeline
                pipe = redis_client.pipeline()
                # Remove expired requests
                pipe.zremrangebyscore(key, 0, cutoff)
                # Count remaining requests
                pipe.zcard(key)
                # Execute pipeline
                _, count = pipe.execute()
                
                if count >= self.requests_limit:
                    print(f"[RATE LIMIT] {self.name} triggered (Redis) for IP: {client_ip}")
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Too many requests. Please try again in {self.window_seconds} seconds."
                    )
                
                # Add current request with a unique value to prevent collisions in sorted set
                member = f"{now}:{uuid.uuid4().hex}"
                
                pipe = redis_client.pipeline()
                pipe.zadd(key, {member: now})
                # Auto-expire the key after window duration to prevent memory leakage
                pipe.expire(key, self.window_seconds)
                pipe.execute()
                return
            except Exception as e:
                # Log error and fallback to in-memory limiter
                print(f"[RATE LIMIT WARNING] Redis failed: {str(e)}. Falling back to in-memory rate limiting.")
                pass

        # Fallback to local in-memory sliding window
        self.requests[client_ip] = [t for t in self.requests[client_ip] if now - t < self.window_seconds]
        
        if len(self.requests[client_ip]) >= self.requests_limit:
            print(f"[RATE LIMIT] {self.name} triggered (Local) for IP: {client_ip}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many requests. Please try again in {self.window_seconds} seconds."
            )
            
        self.requests[client_ip].append(now)


# Create limiters for different purposes
login_limiter = RateLimiter(requests_limit=10, window_seconds=60, name="Login Limiter") # Max 10 attempts per minute
checkout_limiter = RateLimiter(requests_limit=5, window_seconds=60, name="Checkout Limiter") # Max 5 checkouts per minute
general_limiter = RateLimiter(requests_limit=100, window_seconds=60, name="General Limiter") # Max 100 requests per minute
