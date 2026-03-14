"""
Payouts Service - Handles money transfers and contact management.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from shared.config import settings
from shared.database.connection import init_db, close_db

from .routes import transfers, contacts


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    await init_db()
    yield
    await close_db()


app = FastAPI(
    title="Nano - Payouts Service",
    description="Money transfers and beneficiary management",
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
app.include_router(transfers.router, prefix="/payouts", tags=["Transfers"])
app.include_router(contacts.router, prefix="/payouts/contacts", tags=["Contacts"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "payouts",
        "version": "1.0.0",
    }
