"""
AI Service - Handles natural language understanding and voice commands.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from shared.config import settings
from shared.database.connection import init_db, close_db

from .routes import chat, khaata, translate, voice


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    await init_db()
    yield
    await close_db()


app = FastAPI(
    title="Nano - AI Service",
    description="Natural language understanding and voice assistant",
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
app.include_router(chat.router, prefix="/ai", tags=["Chat"])
app.include_router(translate.router, prefix="/ai", tags=["Translation"])
app.include_router(voice.router, prefix="/ai/voice", tags=["Voice"])
app.include_router(khaata.router, prefix="/ai/khaata", tags=["Khaata"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "ai",
        "version": "1.0.0",
    }
