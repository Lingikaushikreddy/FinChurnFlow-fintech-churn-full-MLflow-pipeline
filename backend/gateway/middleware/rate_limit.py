"""Rate limiting middleware using Redis."""

import time
from typing import Callable, Optional

from fastapi import Request, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response, JSONResponse
import redis.asyncio as redis

from shared.config import settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware using sliding window algorithm.
    Limits requests per IP/merchant to prevent abuse.
    """

    def __init__(self, app, redis_client: Optional[redis.Redis] = None):
        super().__init__(app)
        self.redis_client = redis_client
        self.requests_limit = settings.rate_limit_requests
        self.window_seconds = settings.rate_limit_window_seconds

    async def get_redis(self) -> Optional[redis.Redis]:
        """Get or create Redis connection."""
        if self.redis_client:
            return self.redis_client

        try:
            self.redis_client = redis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True,
            )
            return self.redis_client
        except Exception:
            return None

    def get_client_identifier(self, request: Request) -> str:
        """Get unique identifier for the client."""
        # Try to get merchant_id from request state (set by AuthMiddleware)
        merchant_id = getattr(request.state, "merchant_id", None)

        if merchant_id:
            return f"merchant:{merchant_id}"

        # Fall back to IP address
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown"

        return f"ip:{client_ip}"

    async def is_rate_limited(self, identifier: str) -> tuple[bool, int, int]:
        """
        Check if the client is rate limited.
        Returns: (is_limited, remaining_requests, retry_after_seconds)
        """
        redis_client = await self.get_redis()

        if not redis_client:
            # If Redis is unavailable, allow the request
            return False, self.requests_limit, 0

        try:
            key = f"{settings.redis_prefix}:rate:{identifier}"
            current_time = int(time.time())
            window_start = current_time - self.window_seconds

            # Use Redis pipeline for atomic operations
            async with redis_client.pipeline(transaction=True) as pipe:
                # Remove old entries
                await pipe.zremrangebyscore(key, 0, window_start)
                # Count current entries
                await pipe.zcard(key)
                # Add current request
                await pipe.zadd(key, {str(current_time): current_time})
                # Set expiry
                await pipe.expire(key, self.window_seconds)

                results = await pipe.execute()

            request_count = results[1]

            if request_count >= self.requests_limit:
                # Get oldest request timestamp to calculate retry-after
                oldest = await redis_client.zrange(key, 0, 0, withscores=True)
                if oldest:
                    retry_after = int(oldest[0][1]) + self.window_seconds - current_time
                else:
                    retry_after = self.window_seconds

                return True, 0, max(1, retry_after)

            remaining = self.requests_limit - request_count - 1
            return False, remaining, 0

        except Exception:
            # On Redis error, allow the request
            return False, self.requests_limit, 0

    async def dispatch(
        self,
        request: Request,
        call_next: Callable,
    ) -> Response:
        # Skip rate limiting for health checks
        if request.url.path in ["/health", "/services/health"]:
            return await call_next(request)

        identifier = self.get_client_identifier(request)
        is_limited, remaining, retry_after = await self.is_rate_limited(identifier)

        if is_limited:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Rate limit exceeded",
                    "retry_after": retry_after,
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(self.requests_limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time()) + retry_after),
                },
            )

        # Process request
        response = await call_next(request)

        # Add rate limit headers to response
        response.headers["X-RateLimit-Limit"] = str(self.requests_limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(
            int(time.time()) + self.window_seconds
        )

        return response
