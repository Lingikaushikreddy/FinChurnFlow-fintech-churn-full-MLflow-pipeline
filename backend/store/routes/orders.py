"""Order management routes."""

from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Header, Query
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from shared.auth import get_merchant_from_token
from shared.config import settings
from shared.database import get_db, Merchant, Product, Order
from shared.schemas.order import (
    OrderCreate,
    OrderUpdate,
    OrderResponse,
    OrderListResponse,
    OrderItem,
    OrderSummary,
    QuickOrderCreate,
)

router = APIRouter()


@router.post("/", response_model=OrderResponse)
async def create_order(
    request: OrderCreate,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Create a new order."""
    merchant = await get_merchant_from_token(authorization, db)

    # Calculate totals
    subtotal = Decimal("0.00")
    items_data = []

    for item in request.items:
        subtotal += item.total
        items_data.append(item.model_dump(mode="json"))

    # Calculate tax (if applicable)
    tax = Decimal("0.00")  # No tax for now, can be configured

    total = subtotal + tax

    order = Order(
        merchant_id=merchant.id,
        customer_phone=request.customer_phone,
        customer_name=request.customer_name,
        items=items_data,
        subtotal=subtotal,
        tax=tax,
        total=total,
        notes=request.notes,
    )
    db.add(order)
    await db.flush()

    return OrderResponse.model_validate(order)


@router.post("/quick", response_model=OrderResponse)
async def create_quick_order(
    request: QuickOrderCreate,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Create order from product IDs and quantities."""
    merchant = await get_merchant_from_token(authorization, db)

    if len(request.product_ids) != len(request.quantities):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product IDs and quantities must have same length",
        )

    # Fetch products
    result = await db.execute(
        select(Product).where(
            and_(
                Product.id.in_(request.product_ids),
                Product.merchant_id == merchant.id,
                Product.is_active == True,
            )
        )
    )
    products = {p.id: p for p in result.scalars().all()}

    items = []
    subtotal = Decimal("0.00")

    for product_id, quantity in zip(request.product_ids, request.quantities):
        product = products.get(product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {product_id} not found",
            )

        item_total = product.price * quantity
        items.append({
            "product_id": str(product_id),
            "name": product.name,
            "price": float(product.price),
            "quantity": quantity,
            "total": float(item_total),
        })
        subtotal += item_total

    order = Order(
        merchant_id=merchant.id,
        customer_phone=request.customer_phone,
        customer_name=request.customer_name,
        items=items,
        subtotal=subtotal,
        tax=Decimal("0.00"),
        total=subtotal,
    )
    db.add(order)
    await db.flush()

    return OrderResponse.model_validate(order)


@router.get("/", response_model=OrderListResponse)
async def list_orders(
    authorization: str = Header(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    payment_status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List all orders."""
    merchant = await get_merchant_from_token(authorization, db)

    # Build query
    query = select(Order).where(Order.merchant_id == merchant.id)

    if status_filter:
        query = query.where(Order.status == status_filter)
    if payment_status:
        query = query.where(Order.payment_status == payment_status)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    offset = (page - 1) * page_size
    query = query.order_by(Order.created_at.desc()).offset(offset).limit(page_size)

    result = await db.execute(query)
    orders = result.scalars().all()

    return OrderListResponse(
        items=[OrderResponse.model_validate(o) for o in orders],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/summary", response_model=OrderSummary)
async def get_order_summary(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Get order summary statistics."""
    merchant = await get_merchant_from_token(authorization, db)

    result = await db.execute(
        select(Order).where(Order.merchant_id == merchant.id)
    )
    orders = result.scalars().all()

    total_orders = len(orders)
    total_revenue = Decimal("0.00")
    pending_orders = 0
    completed_orders = 0
    cancelled_orders = 0

    for order in orders:
        if order.payment_status == "paid":
            total_revenue += order.total

        if order.status == "pending":
            pending_orders += 1
        elif order.status == "completed":
            completed_orders += 1
        elif order.status == "cancelled":
            cancelled_orders += 1

    average_order_value = total_revenue / total_orders if total_orders > 0 else Decimal("0.00")

    return OrderSummary(
        total_orders=total_orders,
        total_revenue=total_revenue,
        pending_orders=pending_orders,
        completed_orders=completed_orders,
        cancelled_orders=cancelled_orders,
        average_order_value=average_order_value,
    )


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: UUID,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific order."""
    merchant = await get_merchant_from_token(authorization, db)

    result = await db.execute(
        select(Order).where(
            and_(
                Order.id == order_id,
                Order.merchant_id == merchant.id,
            )
        )
    )
    order = result.scalars().first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    return OrderResponse.model_validate(order)


@router.put("/{order_id}", response_model=OrderResponse)
async def update_order(
    order_id: UUID,
    request: OrderUpdate,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Update order status."""
    merchant = await get_merchant_from_token(authorization, db)

    result = await db.execute(
        select(Order).where(
            and_(
                Order.id == order_id,
                Order.merchant_id == merchant.id,
            )
        )
    )
    order = result.scalars().first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    # Update fields
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(order, field, value)

    await db.flush()

    return OrderResponse.model_validate(order)


@router.post("/{order_id}/cancel")
async def cancel_order(
    order_id: UUID,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Cancel an order."""
    merchant = await get_merchant_from_token(authorization, db)

    result = await db.execute(
        select(Order).where(
            and_(
                Order.id == order_id,
                Order.merchant_id == merchant.id,
            )
        )
    )
    order = result.scalars().first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    if order.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel completed order",
        )

    order.status = "cancelled"

    return {"message": "Order cancelled successfully"}
