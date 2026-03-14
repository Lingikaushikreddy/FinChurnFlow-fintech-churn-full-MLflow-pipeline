"""Public catalog routes (no auth required)."""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db, Merchant, Product, Category
from shared.schemas.product import ProductResponse, CatalogResponse, CategoryWithProducts

router = APIRouter()


@router.get("/{merchant_id}", response_model=CatalogResponse)
async def get_public_catalog(
    merchant_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get public catalog for a merchant (customer-facing view)."""
    # Get merchant
    result = await db.execute(
        select(Merchant).where(
            and_(
                Merchant.id == merchant_id,
                Merchant.is_active == True,
            )
        )
    )
    merchant = result.scalars().first()

    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Merchant not found",
        )

    # Get categories with products
    result = await db.execute(
        select(Category)
        .where(Category.merchant_id == merchant_id)
        .order_by(Category.name)
    )
    categories = result.scalars().all()

    # Get all active products
    result = await db.execute(
        select(Product)
        .where(
            and_(
                Product.merchant_id == merchant_id,
                Product.is_active == True,
            )
        )
        .order_by(Product.name)
    )
    products = result.scalars().all()

    # Group products by category
    products_by_category = {}
    uncategorized = []

    for product in products:
        if product.category_id:
            if product.category_id not in products_by_category:
                products_by_category[product.category_id] = []
            products_by_category[product.category_id].append(
                ProductResponse.model_validate(product)
            )
        else:
            uncategorized.append(ProductResponse.model_validate(product))

    # Build category response
    categories_with_products = []
    for category in categories:
        cat_products = products_by_category.get(category.id, [])
        categories_with_products.append(CategoryWithProducts(
            id=category.id,
            merchant_id=category.merchant_id,
            name=category.name,
            parent_id=category.parent_id,
            created_at=category.created_at,
            products=cat_products,
        ))

    return CatalogResponse(
        merchant_name=merchant.name or "Merchant",
        business_name=merchant.business_name,
        categories=categories_with_products,
        products=uncategorized,  # Products without category
    )


@router.get("/{merchant_id}/products", response_model=List[ProductResponse])
async def get_catalog_products(
    merchant_id: UUID,
    category_id: UUID = None,
    db: AsyncSession = Depends(get_db),
):
    """Get products from a merchant's catalog."""
    # Verify merchant exists
    result = await db.execute(
        select(Merchant).where(
            and_(
                Merchant.id == merchant_id,
                Merchant.is_active == True,
            )
        )
    )
    merchant = result.scalars().first()

    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Merchant not found",
        )

    # Build query
    query = select(Product).where(
        and_(
            Product.merchant_id == merchant_id,
            Product.is_active == True,
        )
    )

    if category_id:
        query = query.where(Product.category_id == category_id)

    query = query.order_by(Product.name)

    result = await db.execute(query)
    products = result.scalars().all()

    return [ProductResponse.model_validate(p) for p in products]


@router.get("/{merchant_id}/product/{product_id}", response_model=ProductResponse)
async def get_catalog_product(
    merchant_id: UUID,
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific product from a merchant's catalog."""
    result = await db.execute(
        select(Product).where(
            and_(
                Product.id == product_id,
                Product.merchant_id == merchant_id,
                Product.is_active == True,
            )
        )
    )
    product = result.scalars().first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    return ProductResponse.model_validate(product)
