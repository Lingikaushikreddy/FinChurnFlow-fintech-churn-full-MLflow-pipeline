"""
API Gateway Service - Central entry point for all API requests.
Handles routing, authentication, and rate limiting.
"""

from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from shared.config import settings
from shared.database.connection import init_db, close_db

from .middleware.auth import AuthMiddleware
from .middleware.rate_limit import RateLimitMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    await init_db()
    # Create HTTP client for proxying requests
    app.state.http_client = httpx.AsyncClient(timeout=30.0, follow_redirects=True)
    yield
    await app.state.http_client.aclose()
    await close_db()


app = FastAPI(
    title="Nano - API Gateway",
    description="Central API Gateway for all Nano services",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom middleware
app.add_middleware(RateLimitMiddleware)
app.add_middleware(AuthMiddleware)


# Service routing configuration
SERVICE_ROUTES = {
    "/auth": settings.auth_service_url,
    "/payments": settings.payments_service_url,
    "/payouts": settings.payouts_service_url,
    "/store": settings.store_service_url,
    "/payroll": settings.payroll_service_url,
    "/ai": settings.ai_service_url,
    "/notifications": settings.notifications_service_url,
    "/reports": settings.reports_service_url,
}

# Public routes that don't require authentication
PUBLIC_ROUTES = [
    "/health",
    "/auth/otp/send",
    "/auth/otp/verify",
    "/auth/refresh",
    "/payments/links/public/",
]


@app.get("/health")
async def health_check():
    """Gateway health check."""
    return {
        "status": "healthy",
        "service": "gateway",
        "version": "1.0.0",
    }


@app.get("/services/health")
async def check_all_services(request: Request):
    """Check health of all backend services."""
    client = request.app.state.http_client
    results = {}

    for prefix, url in SERVICE_ROUTES.items():
        service_name = prefix.strip("/")
        try:
            response = await client.get(f"{url}/health", timeout=5.0)
            results[service_name] = {
                "status": "healthy" if response.status_code == 200 else "unhealthy",
                "response_time_ms": response.elapsed.total_seconds() * 1000,
            }
        except Exception as e:
            results[service_name] = {
                "status": "unreachable",
                "error": str(e),
            }

    return {
        "gateway": "healthy",
        "services": results,
    }


async def proxy_request(request: Request, target_url: str) -> JSONResponse:
    """Proxy request to target service."""
    client = request.app.state.http_client

    # Build target URL
    path = request.url.path
    query = str(request.url.query) if request.url.query else ""
    full_url = f"{target_url}{path}"
    if query:
        full_url += f"?{query}"

    # Forward headers
    headers = dict(request.headers)
    headers.pop("host", None)  # Remove host header

    # Get body if present
    body = await request.body() if request.method in ["POST", "PUT", "PATCH"] else None

    try:
        response = await client.request(
            method=request.method,
            url=full_url,
            headers=headers,
            content=body,
        )

        # Parse response
        try:
            data = response.json()
        except Exception:
            data = {"message": response.text}

        return JSONResponse(
            status_code=response.status_code,
            content=data,
        )

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Service timeout",
        )
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service unavailable",
        )


# Route all requests to appropriate services
@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def route_request(request: Request, path: str):
    """Route requests to appropriate backend service."""
    full_path = f"/{path}"

    # Find matching service
    target_url = None
    for prefix, url in SERVICE_ROUTES.items():
        if full_path.startswith(prefix):
            target_url = url
            break

    if not target_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Route not found",
        )

    return await proxy_request(request, target_url)
