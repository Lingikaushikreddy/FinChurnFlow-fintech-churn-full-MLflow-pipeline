"""Chat and NLU routes."""

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel, Field
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from shared.auth import get_merchant_from_token
from shared.config import settings
from shared.database import get_db, Merchant, ChatSession, CreditEntry, PaymentLink
from ..services.gemini_client import SarvamClient, get_sarvam_client
from ..services.intent_classifier import IntentClassifier, Intent

router = APIRouter()


class ChatMessage(BaseModel):
    """Chat message schema."""
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: Optional[str] = None


class ChatRequest(BaseModel):
    """Chat request schema."""
    message: str = Field(..., min_length=1, max_length=1000)
    session_id: Optional[UUID] = None
    context: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    """Chat response schema."""
    message: str
    intent: Optional[str] = None
    entities: Optional[Dict[str, Any]] = None
    action: Optional[Dict[str, Any]] = None
    session_id: UUID
    suggestions: List[str] = Field(default_factory=list)


class SuggestionResponse(BaseModel):
    """Proactive suggestions response."""
    suggestions: List[Dict[str, str]]


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
    sarvam: SarvamClient = Depends(get_sarvam_client),
):
    """Process chat message and return response with intent."""
    merchant = await get_merchant_from_token(authorization, db)

    # Get or create chat session
    session = None
    if request.session_id:
        result = await db.execute(
            select(ChatSession).where(
                and_(
                    ChatSession.id == request.session_id,
                    ChatSession.merchant_id == merchant.id,
                )
            )
        )
        session = result.scalars().first()

    if not session:
        session = ChatSession(
            merchant_id=merchant.id,
            messages=[],
            context=request.context or {},
        )
        db.add(session)
        await db.flush()

    # Get existing message history (do NOT append user message yet)
    messages = session.messages or []

    # Classify intent
    classifier = IntentClassifier()
    intent_result = classifier.classify(request.message)

    # Generate response using Sarvam AI
    # NOTE: generate_response() adds the user message internally,
    # so we pass history WITHOUT the current message to avoid duplicates.
    response_text, action = await sarvam.generate_response(
        message=request.message,
        intent=intent_result,
        merchant_context={
            "name": merchant.name,
            "business_name": merchant.business_name,
            "upi_id": merchant.upi_id,
        },
        conversation_history=messages[-10:],  # Last 10 messages for context
    )

    # Now append both user message and assistant response to history
    messages.append({
        "role": "user",
        "content": request.message,
    })
    messages.append({
        "role": "assistant",
        "content": response_text,
    })

    # Update session
    session.messages = messages
    session.context = {
        **session.context,
        "last_intent": intent_result.intent if intent_result else None,
    }
    await db.flush()

    # Generate suggestions based on context
    suggestions = classifier.get_suggestions(intent_result)

    return ChatResponse(
        message=response_text,
        intent=intent_result.intent if intent_result else None,
        entities=intent_result.entities if intent_result else None,
        action=action,
        session_id=session.id,
        suggestions=suggestions,
    )


@router.get("/suggestions", response_model=SuggestionResponse)
async def get_suggestions(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Get proactive suggestions based on merchant activity."""
    merchant = await get_merchant_from_token(authorization, db)

    # Get recent activity to generate contextual suggestions
    from shared.database import Transaction

    result = await db.execute(
        select(Transaction)
        .where(Transaction.merchant_id == merchant.id)
        .order_by(Transaction.created_at.desc())
        .limit(10)
    )
    recent_transactions = result.scalars().all()

    suggestions = []

    # Always include common actions
    suggestions.append({
        "text": "Create payment link",
        "action": "create_payment_link",
    })

    suggestions.append({
        "text": "Check today's collection",
        "action": "check_balance",
    })

    # Context-based suggestions
    if not recent_transactions:
        suggestions.append({
            "text": "Set up your UPI ID",
            "action": "setup_upi",
        })
    else:
        suggestions.append({
            "text": "View recent transactions",
            "action": "view_transactions",
        })

    # Check if any employees need salary
    from datetime import datetime
    if datetime.utcnow().day >= 25:
        suggestions.append({
            "text": "Process monthly salaries",
            "action": "process_salary",
        })

    return SuggestionResponse(suggestions=suggestions[:5])


@router.delete("/session/{session_id}")
async def clear_session(
    session_id: UUID,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Clear a chat session."""
    merchant = await get_merchant_from_token(authorization, db)

    result = await db.execute(
        select(ChatSession).where(
            and_(
                ChatSession.id == session_id,
                ChatSession.merchant_id == merchant.id,
            )
        )
    )
    session = result.scalars().first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    session.messages = []
    session.context = {}

    return {"message": "Session cleared"}


# =============================================================================
# ACTION CONFIRM ENDPOINT
# =============================================================================


class ActionConfirmRequest(BaseModel):
    """Request to confirm and execute an AI-suggested action."""
    action: str = Field(..., description="Action type: 'add_credit' or 'create_and_share_whatsapp'")
    params: Dict[str, Any] = Field(default_factory=dict)


class ActionConfirmResponse(BaseModel):
    """Response after executing a confirmed action."""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None


@router.post("/action/confirm", response_model=ActionConfirmResponse)
async def confirm_action(
    request: ActionConfirmRequest,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Execute a confirmed AI action (add_credit or create_and_share_whatsapp)."""
    merchant = await get_merchant_from_token(authorization, db)

    try:
        if request.action == "add_credit":
            return await _handle_add_credit(merchant, request.params, db)
        elif request.action == "create_and_share_whatsapp":
            return await _handle_create_and_share_whatsapp(merchant, request.params, db)
        else:
            return ActionConfirmResponse(
                success=False,
                message=f"Unknown action: {request.action}",
            )
    except Exception as e:
        await db.rollback()
        return ActionConfirmResponse(
            success=False,
            message=f"Kuch gadbad ho gayi: {str(e)}",
        )


async def _handle_add_credit(
    merchant: Merchant,
    params: Dict[str, Any],
    db: AsyncSession,
) -> ActionConfirmResponse:
    """Create a credit entry from confirmed action."""
    customer_name = params.get("customer_name")
    amount = params.get("amount")

    if not customer_name:
        return ActionConfirmResponse(
            success=False,
            message="Customer ka naam chahiye. Kiske khaate mein likhna hai?",
        )

    if not amount or float(amount) <= 0:
        return ActionConfirmResponse(
            success=False,
            message="Amount sahi nahi hai. Kitna likhna hai?",
        )

    if float(amount) > 10000000:
        return ActionConfirmResponse(
            success=False,
            message="Amount ₹1 crore se zyada nahi ho sakta.",
        )

    entry = CreditEntry(
        merchant_id=merchant.id,
        customer_name=str(customer_name).strip().title(),
        customer_phone=params.get("customer_phone"),
        amount=Decimal(str(amount)),
        direction=params.get("direction", "debit"),
        description=params.get("description"),
        item=params.get("item"),
        source="ai",
    )
    db.add(entry)
    await db.flush()
    await db.refresh(entry)

    direction_text = "diya" if entry.direction == "credit" else "ka udhaar"
    return ActionConfirmResponse(
        success=True,
        message=f"Haanji, ₹{int(entry.amount)} {entry.customer_name} ke khaate mein likh diya ({direction_text}).",
        data={
            "entry_id": str(entry.id),
            "customer_name": entry.customer_name,
            "amount": float(entry.amount),
            "direction": entry.direction,
        },
    )


async def _handle_create_and_share_whatsapp(
    merchant: Merchant,
    params: Dict[str, Any],
    db: AsyncSession,
) -> ActionConfirmResponse:
    """Create a payment link and return WhatsApp share URL."""
    amount = params.get("amount")
    phone = params.get("phone", "")
    recipient_name = params.get("recipient_name", "")

    # Create a payment link if amount is specified
    link_url = None
    if amount and float(amount) > 0:
        import secrets
        short_code = secrets.token_urlsafe(8)
        link = PaymentLink(
            merchant_id=merchant.id,
            amount=Decimal(str(amount)),
            description=f"Payment from {recipient_name}" if recipient_name else "Payment",
            short_code=short_code,
            short_url=f"https://pay.nano.app/{short_code}",
            status="active",
        )
        db.add(link)
        await db.flush()
        link_url = link.short_url

    # Build WhatsApp message
    message = params.get("message", "")
    if link_url and message:
        message = f"{message}\n\nPay here: {link_url}"
    elif link_url:
        merchant_name = merchant.name or merchant.business_name or "Merchant"
        message = (
            f"Namaste! Aapka payment pending hai. "
            f"Pay here: {link_url}\n- {merchant_name}"
        )

    # Clean phone number
    clean_phone = phone.replace(" ", "").replace("-", "")
    if clean_phone and not clean_phone.startswith("91") and not clean_phone.startswith("+"):
        clean_phone = "91" + clean_phone

    return ActionConfirmResponse(
        success=True,
        message=f"WhatsApp pe bhej raha hoon{' ' + recipient_name if recipient_name else ''}.",
        data={
            "phone": clean_phone,
            "message": message,
            "link_url": link_url,
            "whatsapp_url": f"whatsapp://send?phone={clean_phone}&text={message}",
        },
    )
