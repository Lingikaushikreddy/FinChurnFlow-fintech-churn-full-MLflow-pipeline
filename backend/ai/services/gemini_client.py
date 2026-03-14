"""Sarvam AI client for natural language understanding."""

import asyncio
from typing import Any, Dict, List, Optional, Tuple

from shared.config import settings
from .intent_classifier import Intent
from ..prompts.system_prompt import get_system_prompt

# Intents that require more reasoning from the model
COMPLEX_INTENTS = {"add_credit", "send_payout", "get_report"}


class SarvamClient:
    """
    Client for Sarvam AI (sarvam-m model).
    Uses OpenAI-compatible API at https://api.sarvam.ai/v1.
    Handles conversation and intent-driven responses for the assistant.
    """

    def __init__(self):
        self.model_name = settings.sarvam_model
        self.api_key = settings.sarvam_api_key
        self._client = None

    def _get_client(self):
        """Get or create AsyncOpenAI client pointing at Sarvam AI."""
        if self._client is None and self.api_key:
            try:
                from openai import AsyncOpenAI

                self._client = AsyncOpenAI(
                    base_url="https://api.sarvam.ai/v1",
                    api_key=self.api_key,
                    default_headers={"api-subscription-key": self.api_key},
                )
            except Exception as e:
                print(f"Failed to initialize Sarvam client: {e}")
                return None
        return self._client

    async def generate_response(
        self,
        message: str,
        intent: Optional[Intent],
        merchant_context: Dict[str, Any],
        conversation_history: List[Dict[str, str]],
    ) -> Tuple[str, Optional[Dict[str, Any]]]:
        """
        Generate a response using Sarvam AI.
        Returns (response_text, action_dict).
        """
        client = self._get_client()

        # If Sarvam is not available, use mock response
        if client is None:
            return self._mock_response(message, intent, merchant_context)

        try:
            # Build prompt with system context
            system_prompt = get_system_prompt(merchant_context)

            # Build messages array for chat completions API
            messages = [{"role": "system", "content": system_prompt}]

            # Add conversation history (last 5 messages)
            for msg in conversation_history[-5:]:
                role = "user" if msg["role"] == "user" else "assistant"
                messages.append({"role": role, "content": msg["content"]})

            # Build the current user message with intent context
            user_content = f"""{message}

[Intent: {intent.intent if intent else 'unknown'}]
[Entities: {intent.entities if intent else {}}]

Respond helpfully and concisely. If an action is needed, describe it clearly."""

            messages.append({"role": "user", "content": user_content})

            # Generate response via Sarvam's OpenAI-compatible endpoint
            response = await client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=0.3,
                max_tokens=512,
            )
            response_text = response.choices[0].message.content

            # Strip <think>...</think> reasoning tags from Sarvam output
            import re
            # First: remove complete <think>...</think> blocks
            response_text = re.sub(r"<think>.*?</think>", "", response_text, flags=re.DOTALL).strip()
            # Then: remove any remaining <think> or </think> tags (unclosed)
            response_text = re.sub(r"</?think>", "", response_text).strip()

            # Determine if action is needed
            action = self._extract_action(intent, response_text)

            return response_text, action

        except Exception as e:
            import traceback
            print(f"Sarvam API error: {e}\n{traceback.format_exc()}")
            return self._mock_response(message, intent, merchant_context)

    def _mock_response(
        self,
        message: str,
        intent: Optional[Intent],
        merchant_context: Dict[str, Any],
    ) -> Tuple[str, Optional[Dict[str, Any]]]:
        """Generate mock response when Sarvam is not available."""
        merchant_name = merchant_context.get("name", "there")
        upi_id = merchant_context.get("upi_id", "your UPI")

        if not intent:
            return (
                f"Namaste {merchant_name} ji! Main aapka Munim Ji hoon. "
                "QR code dikhana ho, payment link banana ho, balance check karna ho, "
                "ya khaata likhna ho - bataiye, kya karna hai?",
                None,
            )

        responses = {
            "show_qr": (
                f"Ji {merchant_name} ji, ye raha aapka QR code ({upi_id}). "
                "Customer scan karke seedha pay kar sakte hain.",
                {
                    "type": "navigate",
                    "screen": "QRCode",
                    "params": {},
                    "label": "Show QR Code",
                },
            ),
            "create_payment_link": self._build_create_link_response(intent, merchant_name),
            "check_balance": (
                "Haanji, aaj ki collection aur balance dikhata hoon.",
                {
                    "type": "navigate",
                    "screen": "Dashboard",
                    "params": {"refresh": True},
                    "label": "View Dashboard",
                },
            ),
            "send_payout": (
                f"{intent.entities.get('recipient', 'Contact')} ko "
                f"₹{intent.entities.get('amount', '')} bhej raha hoon. "
                "PIN se confirm karna hoga.",
                {
                    "type": "navigate",
                    "screen": "SendMoney",
                    "params": {
                        "recipient": intent.entities.get("recipient"),
                        "amount": intent.entities.get("amount"),
                    },
                    "label": "Send Money",
                },
            ),
            "add_product": (
                f"Bilkul, {intent.entities.get('product_name', 'naya product')} "
                "add karte hain. Form khol raha hoon.",
                {
                    "type": "navigate",
                    "screen": "AddProduct",
                    "params": {"name": intent.entities.get("product_name")},
                    "label": "Add Product",
                },
            ),
            "pay_salary": (
                "Ji, salary process karte hain. "
                "Pending salary payments dikhata hoon.",
                {
                    "type": "navigate",
                    "screen": "Payroll",
                    "params": {"action": "process"},
                    "label": "Process Salaries",
                },
            ),
            "get_report": (
                f"Zaroor, {intent.entities.get('report_type', 'summary')} report banata hoon.",
                {
                    "type": "navigate",
                    "screen": "Reports",
                    "params": {"type": intent.entities.get("report_type", "daily")},
                    "label": "View Report",
                },
            ),
            "help": (
                f"Namaste {merchant_name} ji! Main aapki ye madad kar sakta hoon:\n\n"
                "📱 'QR dikhao' - Payment QR code\n"
                "🔗 '₹500 ka link banao' - Payment link\n"
                "💰 'Aaj ki kamai' - Collection summary\n"
                "📒 'Raju ka 500 likho' - Khaata/Udhaar\n"
                "📱 'Sharma ji ko WhatsApp bhejo' - WhatsApp pe bhejo\n\n"
                "Bolo ya type karo, main samajh jaunga!",
                None,
            ),
            "add_credit": self._build_add_credit_response(intent, merchant_name),
            "share_whatsapp": self._build_whatsapp_response(intent, merchant_name),
        }

        return responses.get(
            intent.intent,
            (
                f"Samajh gaya, {intent.intent.replace('_', ' ')} karna hai. "
                "Abhi karta hoon.",
                {
                    "type": "navigate",
                    "screen": "Home",
                    "params": intent.entities,
                    "label": intent.intent.replace("_", " ").title(),
                },
            ),
        )

    def _build_create_link_response(
        self,
        intent: Intent,
        merchant_name: str,
    ) -> Tuple[str, Dict[str, Any]]:
        """Build response for create_payment_link intent."""
        amount = intent.entities.get("amount")

        if amount:
            return (
                f"₹{int(amount)} ka payment link bana raha hoon. "
                "Neeche button dabake share kar sakte hain.",
                {
                    "type": "action",
                    "action": "create_payment_link",
                    "params": {"amount": amount},
                    "label": f"Create ₹{int(amount)} Link",
                    "confirm": False,
                },
            )
        else:
            return (
                "Payment link banana hai? Kitne ka banana hai? "
                "Ya neeche button dabake koi bhi amount ka bana sakte hain.",
                {
                    "type": "navigate",
                    "screen": "CreateLink",
                    "params": {},
                    "label": "Create Payment Link",
                },
            )

    def _build_add_credit_response(
        self,
        intent: Intent,
        merchant_name: str,
    ) -> Tuple[str, Optional[Dict[str, Any]]]:
        """Build response for add_credit intent. Returns None action when info is incomplete."""
        customer_name = intent.entities.get("customer_name")
        amount = intent.entities.get("amount")
        direction = intent.entities.get("direction", "debit")

        # Missing customer name - ask conversationally
        if not customer_name and not amount:
            return (
                "Khaata mein likhna hai? Bilkul! "
                "Bataiye kiska naam hai aur kitna likhna hai?",
                None,
            )

        if not customer_name:
            return (
                f"₹{int(amount)} likhna hai - kiske khaate mein likhna hai?",
                None,
            )

        # Missing amount - ask conversationally
        if not amount:
            return (
                f"{customer_name} ke khaate mein likhna hai - kitna likhna hai?",
                None,
            )

        # Both present - return action with confirm=True
        direction_text = "diya" if direction == "credit" else "liya"
        return (
            f"₹{int(amount)} {customer_name} ke khaate mein likh doon? "
            f"({customer_name} ne ₹{int(amount)} {direction_text})",
            {
                "type": "action",
                "action": "add_credit",
                "params": {
                    "customer_name": customer_name,
                    "amount": amount,
                    "direction": direction,
                    "item": intent.entities.get("item"),
                },
                "label": f"₹{int(amount)} {customer_name} ka Khaata",
                "confirm": True,
            },
        )

    def _build_whatsapp_response(
        self,
        intent: Intent,
        merchant_name: str,
    ) -> Tuple[str, Optional[Dict[str, Any]]]:
        """Build response for share_whatsapp intent. Returns None action when info is incomplete."""
        recipient = intent.entities.get("customer_name") or intent.entities.get("recipient")
        phone = intent.entities.get("phone")
        amount = intent.entities.get("amount")

        # No recipient at all
        if not recipient and not phone:
            return (
                "WhatsApp pe kisko bhejna hai? Naam ya phone number bataiye.",
                None,
            )

        # Build message text
        if amount:
            message_text = (
                f"Namaste! Aapka ₹{int(amount)} ka payment pending hai. "
                f"Please pay using this link. - {merchant_name}"
            )
            label = f"₹{int(amount)} WhatsApp Reminder"
        else:
            message_text = (
                f"Namaste! Payment ke liye ye link use karein. - {merchant_name}"
            )
            label = "WhatsApp Bhejo"

        # Step 1: if no phone, ask for it but keep context
        if not phone and recipient:
            return (
                f"{recipient} ka phone number bataiye, WhatsApp pe bhej doonga.",
                None,
            )

        # Both recipient and phone present - create two-step action
        return (
            f"WhatsApp pe {recipient or phone} ko message bhej raha hoon.",
            {
                "type": "whatsapp",
                "action": "create_and_share_whatsapp",
                "params": {
                    "phone": phone or "",
                    "message": message_text,
                    "recipient_name": recipient,
                    "amount": amount,
                },
                "label": label,
                "confirm": False,
            },
        )

    def _extract_action(
        self,
        intent: Optional[Intent],
        response_text: str,
    ) -> Optional[Dict[str, Any]]:
        """Extract action from intent and response."""
        if not intent:
            return None

        # For add_credit and share_whatsapp, use the builder methods
        # which handle missing entities gracefully
        if intent.intent == "add_credit":
            _, action = self._build_add_credit_response(intent, "")
            return action

        if intent.intent == "share_whatsapp":
            _, action = self._build_whatsapp_response(intent, "")
            return action

        # Map intents to navigation actions
        action_map = {
            "show_qr": {
                "type": "navigate",
                "screen": "QRCode",
                "params": {},
                "label": "Show QR Code",
            },
            "create_payment_link": {
                "type": "navigate",
                "screen": "CreateLink",
                "params": {"amount": intent.entities.get("amount")},
                "label": "Create Payment Link",
            },
            "check_balance": {
                "type": "navigate",
                "screen": "Dashboard",
                "params": {"refresh": True},
                "label": "View Dashboard",
            },
            "send_payout": {
                "type": "navigate",
                "screen": "SendMoney",
                "params": {
                    "recipient": intent.entities.get("recipient"),
                    "amount": intent.entities.get("amount"),
                },
                "label": "Send Money",
            },
            "add_product": {
                "type": "navigate",
                "screen": "AddProduct",
                "params": {"name": intent.entities.get("product_name")},
                "label": "Add Product",
            },
            "pay_salary": {
                "type": "navigate",
                "screen": "Payroll",
                "params": {},
                "label": "Process Salaries",
            },
            "get_report": {
                "type": "navigate",
                "screen": "Reports",
                "params": {"type": intent.entities.get("report_type", "daily")},
                "label": "View Report",
            },
        }

        return action_map.get(intent.intent)


# Backward-compatible alias
GeminiClient = SarvamClient

# Singleton instance
_sarvam_client = None


async def get_sarvam_client() -> SarvamClient:
    """Dependency to get Sarvam client."""
    global _sarvam_client
    if _sarvam_client is None:
        _sarvam_client = SarvamClient()
    return _sarvam_client


# Backward compatibility alias
get_gemini_client = get_sarvam_client
