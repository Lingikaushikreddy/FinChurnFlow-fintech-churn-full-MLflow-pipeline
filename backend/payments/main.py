"""
Payments Service - Handles QR codes, payment links, and transaction processing.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from shared.config import settings
from shared.database.connection import init_db, close_db

from .routes import qr, links, transactions


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    await init_db()
    yield
    await close_db()


app = FastAPI(
    title="Nano - Payments Service",
    description="QR codes, payment links, and transaction processing",
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

# Include routers
app.include_router(qr.router, prefix="/payments/qr", tags=["QR Codes"])
app.include_router(links.router, prefix="/payments/links", tags=["Payment Links"])
app.include_router(transactions.router, prefix="/payments/transactions", tags=["Transactions"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "payments",
        "version": "1.0.0",
    }


@app.post("/payments/webhook")
async def payment_webhook():
    """Handle payment webhooks (mock)."""
    # This will be implemented to handle mock payment callbacks
    return {"status": "received"}
