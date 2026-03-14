"""
Notifications Service - Handles SMS, WhatsApp, and push notifications.
"""

import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Depends, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.auth import get_merchant_from_token
from shared.config import settings
from shared.database.connection import init_db, close_db, get_db
from shared.database import Merchant, Notification

# Notification Templates for Indian Merchants
NOTIFICATION_TEMPLATES = {
    "payment_received": {
        "sms": "Namaste! ₹{amount} received from {customer_name}. Total today: ₹{daily_total}. - Nano",
        "whatsapp": "🎉 *Payment Received!*\n\n₹{amount} from {customer_name}\nMethod: {method}\nTotal today: ₹{daily_total}\n\n_Powered by Nano_",
        "push": {"title": "₹{amount} Received!", "body": "Payment from {customer_name} via {method}"},
    },
    "payout_sent": {
        "sms": "₹{amount} sent to {recipient}. Ref: {reference_id}. Balance: ₹{balance}. - Nano",
        "whatsapp": "💸 *Payout Sent*\n\n₹{amount} to {recipient}\nMode: {mode}\nRef: {reference_id}\nBalance: ₹{balance}",
        "push": {"title": "₹{amount} Sent", "body": "Payout to {recipient} successful"},
    },
    "salary_processed": {
        "sms": "Salary ₹{amount} sent to {employee_name} for {month}. - Nano",
        "whatsapp": "💰 *Salary Processed*\n\n{employee_name}: ₹{amount}\nMonth: {month}\nStatus: ✅ Completed",
        "push": {"title": "Salary Processed", "body": "₹{amount} sent to {employee_name}"},
    },
    "order_received": {
        "sms": "New order #{order_id} from {customer_name}! Amount: ₹{amount}. - Nano",
        "whatsapp": "📦 *New Order!*\n\nOrder #{order_id}\nCustomer: {customer_name}\nItems: {item_count}\nTotal: ₹{amount}\n\nOpen app to confirm.",
        "push": {"title": "New Order!", "body": "#{order_id} from {customer_name} - ₹{amount}"},
    },
    "low_stock_alert": {
        "sms": "Low stock alert: {product_name} has only {stock} left. Restock soon! - Nano",
        "whatsapp": "⚠️ *Low Stock Alert*\n\n{product_name}: {stock} remaining\nAvg daily sales: {avg_sales}\n\nRestock soon!",
        "push": {"title": "Low Stock", "body": "{product_name}: only {stock} left"},
    },
    "daily_summary": {
        "sms": "Today: ₹{collection} collected, ₹{payouts} paid out. Net: ₹{net}. - Nano",
        "whatsapp": "📊 *Daily Summary*\n\n💰 Collection: ₹{collection}\n💸 Payouts: ₹{payouts}\n📈 Net: ₹{net}\n📦 Orders: {order_count}\n\n_Good {time_of_day}!_",
        "push": {"title": "Daily Summary", "body": "Collection: ₹{collection} | Net: ₹{net}"},
    },
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    await init_db()
    yield
    await close_db()


app = FastAPI(
    title="Nano - Notifications Service",
    description="SMS, WhatsApp, and push notification management",
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


class SMSRequest(BaseModel):
    """SMS send request."""
    phone: str = Field(..., min_length=10, max_length=15)
    message: str = Field(..., max_length=160)
    template_id: Optional[str] = None


class WhatsAppRequest(BaseModel):
    """WhatsApp message request."""
    phone: str = Field(..., min_length=10, max_length=15)
    template: str
    params: dict = Field(default_factory=dict)


class PushRequest(BaseModel):
    """Push notification request."""
    title: str = Field(..., max_length=100)
    body: str = Field(..., max_length=200)
    data: dict = Field(default_factory=dict)


class NotificationResponse(BaseModel):
    """Notification response."""
    id: UUID
    status: str
    channel: str
    message: str


class TemplateNotificationRequest(BaseModel):
    """Template-based notification request."""
    template_name: str = Field(..., description="Template name from NOTIFICATION_TEMPLATES")
    channel: str = Field(..., description="Channel: sms, whatsapp, or push")
    recipient_phone: str = Field(..., min_length=10, max_length=15)
    params: dict = Field(default_factory=dict, description="Template parameters")


class BulkNotificationRequest(BaseModel):
    """Bulk notification request."""
    notifications: List[TemplateNotificationRequest] = Field(..., min_length=1, max_length=100)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "notifications",
        "version": "1.0.0",
    }


@app.post("/notifications/sms", response_model=NotificationResponse)
async def send_sms(
    request: SMSRequest,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Send SMS notification."""
    merchant = await get_merchant_from_token(authorization, db)

    # Create notification record
    notification = Notification(
        merchant_id=merchant.id,
        type="custom_sms",
        channel="sms",
        recipient=request.phone,
        content={"message": request.message, "template_id": request.template_id},
        status="pending",
    )
    db.add(notification)
    await db.flush()

    # Mock SMS sending
    logger = logging.getLogger(__name__)
    logger.info(f"[SMS] To: {request.phone} | Message: {request.message}")
    notification.status = "sent"
    notification.sent_at = datetime.now(timezone.utc)

    return NotificationResponse(
        id=notification.id,
        status="sent",
        channel="sms",
        message="SMS sent successfully",
    )


@app.post("/notifications/whatsapp", response_model=NotificationResponse)
async def send_whatsapp(
    request: WhatsAppRequest,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Send WhatsApp message."""
    merchant = await get_merchant_from_token(authorization, db)

    # Create notification record
    notification = Notification(
        merchant_id=merchant.id,
        type="whatsapp_template",
        channel="whatsapp",
        recipient=request.phone,
        content={"template": request.template, "params": request.params},
        status="pending",
    )
    db.add(notification)
    await db.flush()

    # Mock WhatsApp sending
    logger = logging.getLogger(__name__)
    logger.info(f"[WHATSAPP] To: {request.phone} | Template: {request.template} | Params: {request.params}")
    notification.status = "sent"
    notification.sent_at = datetime.now(timezone.utc)

    return NotificationResponse(
        id=notification.id,
        status="sent",
        channel="whatsapp",
        message="WhatsApp message sent successfully",
    )


@app.post("/notifications/push", response_model=NotificationResponse)
async def send_push(
    request: PushRequest,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Send push notification."""
    merchant = await get_merchant_from_token(authorization, db)

    # Create notification record
    notification = Notification(
        merchant_id=merchant.id,
        type="push",
        channel="push",
        recipient=str(merchant.id),
        content={"title": request.title, "body": request.body, "data": request.data},
        status="pending",
    )
    db.add(notification)
    await db.flush()

    # Mock push notification
    logger = logging.getLogger(__name__)
    logger.info(f"[PUSH] To: {merchant.id} | Title: {request.title} | Body: {request.body}")
    notification.status = "sent"
    notification.sent_at = datetime.now(timezone.utc)

    return NotificationResponse(
        id=notification.id,
        status="sent",
        channel="push",
        message="Push notification sent successfully",
    )


@app.get("/notifications/history")
async def get_notification_history(
    authorization: str = Header(...),
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """Get notification history."""
    merchant = await get_merchant_from_token(authorization, db)

    result = await db.execute(
        select(Notification)
        .where(Notification.merchant_id == merchant.id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    notifications = result.scalars().all()

    return [
        {
            "id": str(n.id),
            "type": n.type,
            "channel": n.channel,
            "recipient": n.recipient,
            "status": n.status,
            "created_at": n.created_at.isoformat(),
        }
        for n in notifications
    ]


@app.post("/notifications/template", response_model=NotificationResponse)
async def send_template_notification(
    request: TemplateNotificationRequest,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Send a template-based notification."""
    merchant = await get_merchant_from_token(authorization, db)

    logger = logging.getLogger(__name__)

    template = NOTIFICATION_TEMPLATES.get(request.template_name)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown template: {request.template_name}. Available: {list(NOTIFICATION_TEMPLATES.keys())}",
        )

    channel_template = template.get(request.channel)
    if not channel_template:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Template '{request.template_name}' not available for channel '{request.channel}'",
        )

    # Format message from template
    try:
        if isinstance(channel_template, dict):
            message_content = {k: v.format(**request.params) for k, v in channel_template.items()}
        else:
            message_content = channel_template.format(**request.params)
    except KeyError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing template parameter: {e}",
        )

    notification = Notification(
        merchant_id=merchant.id,
        type=request.template_name,
        channel=request.channel,
        recipient=request.recipient_phone,
        content={"template": request.template_name, "params": request.params, "rendered": message_content},
        status="pending",
    )
    db.add(notification)
    await db.flush()

    # Send via appropriate channel (mock for now, ready for real integration)
    logger.info(
        f"[{request.channel.upper()}] Template: {request.template_name} | "
        f"To: {request.recipient_phone} | Content: {message_content}"
    )
    notification.status = "sent"
    notification.sent_at = datetime.now(timezone.utc)

    return NotificationResponse(
        id=notification.id,
        status="sent",
        channel=request.channel,
        message=f"{request.channel.upper()} notification sent via template '{request.template_name}'",
    )


@app.post("/notifications/bulk")
async def send_bulk_notifications(
    request: BulkNotificationRequest,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Send bulk notifications."""
    merchant = await get_merchant_from_token(authorization, db)

    logger = logging.getLogger(__name__)
    results = {"sent": 0, "failed": 0, "errors": []}

    for idx, notif in enumerate(request.notifications):
        try:
            template = NOTIFICATION_TEMPLATES.get(notif.template_name)
            if not template:
                results["failed"] += 1
                results["errors"].append(f"#{idx}: Unknown template '{notif.template_name}'")
                continue

            channel_template = template.get(notif.channel)
            if not channel_template:
                results["failed"] += 1
                results["errors"].append(f"#{idx}: Channel '{notif.channel}' not in template")
                continue

            try:
                if isinstance(channel_template, dict):
                    message_content = {k: v.format(**notif.params) for k, v in channel_template.items()}
                else:
                    message_content = channel_template.format(**notif.params)
            except KeyError as e:
                results["failed"] += 1
                results["errors"].append(f"#{idx}: Missing param {e}")
                continue

            notification = Notification(
                merchant_id=merchant.id,
                type=notif.template_name,
                channel=notif.channel,
                recipient=notif.recipient_phone,
                content={"template": notif.template_name, "params": notif.params, "rendered": message_content},
                status="sent",
                sent_at=datetime.now(timezone.utc),
            )
            db.add(notification)
            results["sent"] += 1

            logger.info(f"[BULK {notif.channel.upper()}] To: {notif.recipient_phone} | Template: {notif.template_name}")
        except Exception as e:
            results["failed"] += 1
            results["errors"].append(f"#{idx}: {str(e)}")

    await db.flush()

    return {
        "total": len(request.notifications),
        "sent": results["sent"],
        "failed": results["failed"],
        "errors": results["errors"][:10],  # Limit error details
    }


@app.get("/notifications/stats")
async def get_notification_stats(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Get notification statistics."""
    from sqlalchemy import func as sa_func

    merchant = await get_merchant_from_token(authorization, db)

    # Count by channel
    channel_stats = await db.execute(
        select(
            Notification.channel,
            sa_func.count().label("count"),
        )
        .where(Notification.merchant_id == merchant.id)
        .group_by(Notification.channel)
    )

    # Count by status
    status_stats = await db.execute(
        select(
            Notification.status,
            sa_func.count().label("count"),
        )
        .where(Notification.merchant_id == merchant.id)
        .group_by(Notification.status)
    )

    # Recent count (last 24 hours)
    from datetime import timedelta
    recent = await db.execute(
        select(sa_func.count())
        .where(
            Notification.merchant_id == merchant.id,
            Notification.created_at >= datetime.now(timezone.utc) - timedelta(hours=24),
        )
    )

    return {
        "by_channel": {row.channel: row.count for row in channel_stats},
        "by_status": {row.status: row.count for row in status_stats},
        "last_24_hours": recent.scalar() or 0,
        "templates_available": list(NOTIFICATION_TEMPLATES.keys()),
    }


@app.get("/notifications/templates")
async def list_templates():
    """List available notification templates and their required parameters."""
    templates_info = {}
    for name, channels in NOTIFICATION_TEMPLATES.items():
        # Extract parameter names from template strings
        import re
        params = set()
        for channel, template in channels.items():
            if isinstance(template, dict):
                for v in template.values():
                    params.update(re.findall(r'\{(\w+)\}', v))
            else:
                params.update(re.findall(r'\{(\w+)\}', template))

        templates_info[name] = {
            "channels": list(channels.keys()),
            "required_params": sorted(params),
        }

    return {"templates": templates_info}
