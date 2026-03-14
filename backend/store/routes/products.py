"""Product management routes."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Header, Query
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from shared.auth import get_merchant_from_token
from shared.config import settings
from shared.database import get_db, Merchant, Product, Category
from shared.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    ProductListResponse,
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse,
    StockUpdate,
    BulkPriceUpdateRequest,
    BulkPriceUpdateResponse,
    PriceUpdateItem,
    DailyRateBoardResponse,
    RateBoardItem,
)

router = APIRouter()


@router.post("/", response_model=ProductResponse)
async def create_product(
    request: ProductCreate,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Create a new product."""
    merchant = await get_merchant_from_token(authorization, db)

    # Validate category if provided
    if request.category_id:
        result = await db.execute(
            select(Category).where(
                and_(
                    Category.id == request.category_id,
                    Category.merchant_id == merchant.id,
                )
            )
        )
        if not result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category not found",
            )

    product = Product(
        merchant_id=merchant.id,
        name=request.name,
        description=request.description,
        price=request.price,
        stock=request.stock,
        sku=request.sku,
        category_id=request.category_id,
        images=request.images,
        is_active=request.is_active,
    )
    db.add(product)
    await db.flush()

    return ProductResponse.model_validate(product)


@router.get("/", response_model=ProductListResponse)
async def list_products(
    authorization: str = Header(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category_id: Optional[UUID] = Query(None),
    active_only: bool = Query(True),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List all products."""
    merchant = await get_merchant_from_token(authorization, db)

    # Build query
    query = select(Product).where(Product.merchant_id == merchant.id)

    if active_only:
        query = query.where(Product.is_active == True)
    if category_id:
        query = query.where(Product.category_id == category_id)
    if search:
        query = query.where(Product.name.ilike(f"%{search}%"))

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    offset = (page - 1) * page_size
    query = query.order_by(Product.created_at.desc()).offset(offset).limit(page_size)

    result = await db.execute(query)
    products = result.scalars().all()

    return ProductListResponse(
        items=[ProductResponse.model_validate(p) for p in products],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: UUID,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific product."""
    merchant = await get_merchant_from_token(authorization, db)

    result = await db.execute(
        select(Product).where(
            and_(
                Product.id == product_id,
                Product.merchant_id == merchant.id,
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


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID,
    request: ProductUpdate,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Update a product."""
    merchant = await get_merchant_from_token(authorization, db)

    result = await db.execute(
        select(Product).where(
            and_(
                Product.id == product_id,
                Product.merchant_id == merchant.id,
            )
        )
    )
    product = result.scalars().first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    # Update fields
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)

    await db.flush()

    return ProductResponse.model_validate(product)


@router.delete("/{product_id}")
async def delete_product(
    product_id: UUID,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Delete a product (soft delete - marks as inactive)."""
    merchant = await get_merchant_from_token(authorization, db)

    result = await db.execute(
        select(Product).where(
            and_(
                Product.id == product_id,
                Product.merchant_id == merchant.id,
            )
        )
    )
    product = result.scalars().first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    product.is_active = False

    return {"message": "Product deleted successfully"}


@router.post("/{product_id}/stock", response_model=ProductResponse)
async def update_stock(
    product_id: UUID,
    request: StockUpdate,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Update product stock."""
    merchant = await get_merchant_from_token(authorization, db)

    result = await db.execute(
        select(Product).where(
            and_(
                Product.id == product_id,
                Product.merchant_id == merchant.id,
            )
        )
    )
    product = result.scalars().first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    new_stock = product.stock + request.quantity
    if new_stock < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient stock",
        )

    product.stock = new_stock
    await db.flush()

    return ProductResponse.model_validate(product)


# Category endpoints
@router.post("/categories", response_model=CategoryResponse)
async def create_category(
    request: CategoryCreate,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Create a new category."""
    merchant = await get_merchant_from_token(authorization, db)

    category = Category(
        merchant_id=merchant.id,
        name=request.name,
        parent_id=request.parent_id,
    )
    db.add(category)
    await db.flush()

    return CategoryResponse.model_validate(category)


@router.get("/categories", response_model=List[CategoryResponse])
async def list_categories(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """List all categories."""
    merchant = await get_merchant_from_token(authorization, db)

    result = await db.execute(
        select(Category)
        .where(Category.merchant_id == merchant.id)
        .order_by(Category.name)
    )
    categories = result.scalars().all()

    return [CategoryResponse.model_validate(c) for c in categories]


# ==================== FLEXIBLE PRICING ENDPOINTS ====================

@router.post("/prices/bulk", response_model=BulkPriceUpdateResponse)
async def bulk_update_prices(
    request: BulkPriceUpdateRequest,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Bulk update product prices.
    Designed for merchants who need to update prices daily (vegetables, fruits, etc.)
    """
    merchant = await get_merchant_from_token(authorization, db)

    # Get all product IDs from the request
    product_ids = [item.product_id for item in request.updates]

    # Fetch products
    result = await db.execute(
        select(Product).where(
            and_(
                Product.id.in_(product_ids),
                Product.merchant_id == merchant.id,
            )
        )
    )
    products = {p.id: p for p in result.scalars().all()}

    updated_products = []
    updated_count = 0
    failed_count = 0

    now = datetime.utcnow()

    for item in request.updates:
        product = products.get(item.product_id)

        if not product:
            failed_count += 1
            continue

        # Store old price in history
        if product.price_history is None:
            product.price_history = []
        
        history_entry = {
            "price": float(product.price),
            "updated_at": product.last_price_update.isoformat() if product.last_price_update else now.isoformat(),
        }
        product.price_history = product.price_history + [history_entry]

        # Keep only last 30 price changes
        if len(product.price_history) > 30:
            product.price_history = product.price_history[-30:]

        # Update price
        product.price = item.price
        product.last_price_update = now

        updated_products.append(ProductResponse.model_validate(product))
        updated_count += 1

    await db.flush()

    return BulkPriceUpdateResponse(
        updated=updated_count,
        failed=failed_count,
        products=updated_products,
    )


@router.get("/prices/rate-board", response_model=DailyRateBoardResponse)
async def get_daily_rate_board(
    authorization: str = Header(...),
    category_id: Optional[UUID] = Query(None, description="Filter by category"),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate daily rate board for sharing on WhatsApp.
    Returns formatted text ready for sharing.
    """
    merchant = await get_merchant_from_token(authorization, db)

    # Build query for active products
    query = select(Product).where(
        and_(
            Product.merchant_id == merchant.id,
            Product.is_active == True,
        )
    )

    if category_id:
        query = query.where(Product.category_id == category_id)

    query = query.order_by(Product.name)

    result = await db.execute(query)
    products = result.scalars().all()

    # Build rate board items
    items = []
    for product in products:
        items.append(RateBoardItem(
            name=product.name,
            price=product.price,
            price_unit=product.price_unit or "per_piece",
            price_type=product.price_type or "fixed",
        ))

    # Generate share text
    today = datetime.utcnow().strftime("%d %b %Y")
    business_name = merchant.business_name or merchant.name or "My Store"

    share_lines = [
        f"🏪 *{business_name}*",
        f"📅 Today's Rates - {today}",
        "",
    ]

    unit_labels = {
        "per_kg": "/kg",
        "per_500g": "/500g",
        "per_250g": "/250g",
        "per_piece": "/pc",
        "per_dozen": "/dz",
        "per_bunch": "/bunch",
        "per_packet": "/pkt",
    }

    for item in items:
        unit = unit_labels.get(item.price_unit, "")
        if item.price_type == "market_rate":
            share_lines.append(f"• {item.name} ... Market Rate")
        elif item.price_type == "call_for_price":
            share_lines.append(f"• {item.name} ... Call for Price")
        else:
            share_lines.append(f"• {item.name} ... ₹{item.price}{unit}")

    share_lines.extend([
        "",
        "📞 Contact for orders",
        "_Prices subject to change_",
    ])

    share_text = "\n".join(share_lines)

    return DailyRateBoardResponse(
        merchant_name=merchant.name or "Merchant",
        business_name=merchant.business_name,
        date=today,
        items=items,
        share_text=share_text,
    )


@router.get("/prices/quick-update", response_model=List[ProductResponse])
async def get_products_for_quick_update(
    authorization: str = Header(...),
    category_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Get products formatted for quick price update screen.
    Returns only essential fields needed for the quick update UI.
    """
    merchant = await get_merchant_from_token(authorization, db)

    query = select(Product).where(
        and_(
            Product.merchant_id == merchant.id,
            Product.is_active == True,
        )
    )

    if category_id:
        query = query.where(Product.category_id == category_id)

    # Sort by name for easy scanning
    query = query.order_by(Product.name)

    result = await db.execute(query)
    products = result.scalars().all()

    return [ProductResponse.model_validate(p) for p in products]
