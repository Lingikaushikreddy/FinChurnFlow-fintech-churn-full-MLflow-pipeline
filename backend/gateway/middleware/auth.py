"""Authentication middleware for the API Gateway."""

from typing import Callable, List
from uuid import UUID

from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response, JSONResponse
from jose import JWTError, jwt

from shared.config import settings


# Routes that don't require authentication
PUBLIC_ROUTES: List[str] = [
    "/health",
    "/services/health",
    "/auth/otp/send",
    "/auth/otp/verify",
    "/auth/refresh",
    "/payments/links/public/",
    "/store/catalog/",
]


def is_public_route(path: str) -> bool:
    """Check if the route is public (doesn't require auth)."""
    for route in PUBLIC_ROUTES:
        if path.startswith(route) or path == route.rstrip("/"):
            return True
    return False


class AuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware to validate JWT tokens for protected routes.
    Adds merchant_id to request state for downstream services.
    """

    async def dispatch(
        self,
        request: Request,
        call_next: Callable,
    ) -> Response:
        path = request.url.path

        # Skip auth for public routes
        if is_public_route(path):
            return await call_next(request)

        # Check for Authorization header
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Authorization header required"},
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Invalid authorization header format"},
                headers={"WWW-Authenticate": "Bearer"},
            )

        token = auth_header[7:]  # Remove "Bearer " prefix

        try:
            # Decode and validate JWT
            payload = jwt.decode(
                token,
                settings.jwt_secret,
                algorithms=[settings.jwt_algorithm],
            )

            # Extract merchant_id
            merchant_id = payload.get("sub")
            token_type = payload.get("type")

            if not merchant_id:
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"detail": "Invalid token payload"},
                    headers={"WWW-Authenticate": "Bearer"},
                )

            if token_type != "access":
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"detail": "Invalid token type"},
                    headers={"WWW-Authenticate": "Bearer"},
                )

            # Add merchant_id to request state
            request.state.merchant_id = UUID(merchant_id)

        except JWTError as e:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": f"Invalid token: {str(e)}"},
                headers={"WWW-Authenticate": "Bearer"},
            )
        except ValueError:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Invalid merchant ID in token"},
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Continue to next middleware/route
        response = await call_next(request)
        return response


def get_merchant_id_from_request(request: Request) -> UUID:
    """
    Helper function to get merchant_id from request state.
    Use this in route handlers after AuthMiddleware has validated the token.
    """
    merchant_id = getattr(request.state, "merchant_id", None)

    if not merchant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    return merchant_id
