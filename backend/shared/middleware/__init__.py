"""Shared middleware utilities for Nano microservices."""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import Merchant


async def get_merchant_from_token(authorization: str, db: AsyncSession) -> Merchant:
    """
    Extract and validate merchant from JWT authorization header.
    Shared across all microservices to avoid code duplication.
    """
    from auth.services.jwt import get_current_merchant_id

    merchant_id = await get_current_merchant_id(authorization, db)

    result = await db.execute(
        select(Merchant).where(Merchant.id == merchant_id)
    )
    merchant = result.scalars().first()

    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Merchant not found",
        )

    return merchant
