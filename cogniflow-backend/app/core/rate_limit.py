"""
Simple in-memory rate limiter middleware.

Limits are applied per client IP:
  - AI endpoints  (/api/ai/* POST, /api/integrations/Core/InvokeLLM):
      20 requests / minute  +  200 requests / day
  - Paper endpoints (/api/papers/*):
      60 requests / minute
  - Everything else: unlimited
"""
import time
from collections import defaultdict, deque

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

# (window_seconds, max_requests)
_AI_MINUTE   = (60,        20)
_AI_DAY      = (86_400,   200)
_PAPER_MINUTE = (60,       60)

# { (ip, bucket_key): deque of timestamps }
_buckets: dict[tuple, deque] = defaultdict(deque)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _check(ip: str, key: str, window: int, limit: int) -> bool:
    """Return True if the request is allowed, False if rate-limited."""
    now = time.time()
    bucket = _buckets[(ip, key)]
    cutoff = now - window
    while bucket and bucket[0] < cutoff:
        bucket.popleft()
    if len(bucket) >= limit:
        return False
    bucket.append(now)
    return True


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path   = request.url.path
        method = request.method
        ip     = _client_ip(request)

        is_ai = (
            (path.startswith("/api/ai/") and method == "POST")
            or path == "/api/integrations/Core/InvokeLLM"
        )
        is_paper = path.startswith("/api/papers/")

        if is_ai:
            if not _check(ip, "ai_min", *_AI_MINUTE):
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Rate limit exceeded: 20 AI requests per minute. Please wait before trying again."
                    },
                )
            if not _check(ip, "ai_day", *_AI_DAY):
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Daily AI limit reached: 200 requests per day. Resets at midnight UTC."
                    },
                )

        elif is_paper:
            if not _check(ip, "paper_min", *_PAPER_MINUTE):
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Rate limit exceeded: 60 paper search requests per minute."
                    },
                )

        return await call_next(request)
