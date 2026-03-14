"""
Mock Payment Gateway Service - Simulates payment APIs for development.
"""

import asyncio
import random
from datetime import datetime
from decimal import Decimal
from typing import Dict, Any, Optional
from uuid import UUID

from shared.utils.helpers import generate_gateway_id


class MockPaymentGatewayService:
    """
    Mock implementation of payment gateway APIs.
    Used for development and testing without actual payment processing.
    """

    def __init__(self):
        self.orders: Dict[str, Dict[str, Any]] = {}
        self.payments: Dict[str, Dict[str, Any]] = {}

    async def create_order(
        self,
        amount: int,  # Amount in paise
        currency: str = "INR",
        receipt: Optional[str] = None,
        notes: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Create a mock order.
        Simulates: POST /v1/orders
        """
        order_id = generate_gateway_id("order")
        timestamp = int(datetime.utcnow().timestamp())

        order = {
            "id": order_id,
            "entity": "order",
            "amount": amount,
            "amount_paid": 0,
            "amount_due": amount,
            "currency": currency,
            "receipt": receipt,
            "offer_id": None,
            "status": "created",
            "attempts": 0,
            "notes": notes or {},
            "created_at": timestamp,
        }

        self.orders[order_id] = order
        return order

    async def capture_payment(
        self,
        payment_id: str,
        amount: int,
    ) -> Dict[str, Any]:
        """
        Capture a payment.
        Simulates: POST /v1/payments/{id}/capture
        """
        if payment_id not in self.payments:
            raise ValueError(f"Payment {payment_id} not found")

        payment = self.payments[payment_id]
        payment["status"] = "captured"
        payment["captured"] = True

        # Update associated order
        order_id = payment.get("order_id")
        if order_id and order_id in self.orders:
            order = self.orders[order_id]
            order["amount_paid"] = amount
            order["amount_due"] = 0
            order["status"] = "paid"

        return payment

    async def get_payment(self, payment_id: str) -> Dict[str, Any]:
        """
        Get payment details.
        Simulates: GET /v1/payments/{id}
        """
        if payment_id not in self.payments:
            raise ValueError(f"Payment {payment_id} not found")

        return self.payments[payment_id]

    async def get_order(self, order_id: str) -> Dict[str, Any]:
        """
        Get order details.
        Simulates: GET /v1/orders/{id}
        """
        if order_id not in self.orders:
            raise ValueError(f"Order {order_id} not found")

        return self.orders[order_id]

    async def simulate_upi_payment(
        self,
        order_id: str,
        payer_vpa: str = "customer@upi",
        delay_seconds: float = 2.0,
    ) -> Dict[str, Any]:
        """
        Simulate a UPI payment for testing.
        This mimics the customer completing payment via UPI.
        """
        if order_id not in self.orders:
            raise ValueError(f"Order {order_id} not found")

        order = self.orders[order_id]

        # Simulate network delay
        await asyncio.sleep(delay_seconds)

        # Simulate payment success (90% success rate for realism)
        success = random.random() < 0.9

        payment_id = generate_gateway_id("pay")
        timestamp = int(datetime.utcnow().timestamp())

        payment = {
            "id": payment_id,
            "entity": "payment",
            "amount": order["amount"],
            "currency": order["currency"],
            "status": "captured" if success else "failed",
            "order_id": order_id,
            "invoice_id": None,
            "international": False,
            "method": "upi",
            "amount_refunded": 0,
            "refund_status": None,
            "captured": success,
            "description": f"Payment for order {order_id}",
            "card_id": None,
            "bank": None,
            "wallet": None,
            "vpa": payer_vpa,
            "email": "",
            "contact": "",
            "fee": int(order["amount"] * 0.02),  # 2% fee
            "tax": 0,
            "error_code": None if success else "PAYMENT_FAILED",
            "error_description": None if success else "Payment was declined",
            "notes": order.get("notes", {}),
            "created_at": timestamp,
        }

        self.payments[payment_id] = payment

        # Update order status
        if success:
            order["amount_paid"] = order["amount"]
            order["amount_due"] = 0
            order["status"] = "paid"
        else:
            order["attempts"] += 1

        return payment

    async def create_refund(
        self,
        payment_id: str,
        amount: Optional[int] = None,
        notes: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Create a refund for a payment.
        Simulates: POST /v1/payments/{id}/refund
        """
        if payment_id not in self.payments:
            raise ValueError(f"Payment {payment_id} not found")

        payment = self.payments[payment_id]

        if payment["status"] != "captured":
            raise ValueError("Payment must be captured before refunding")

        refund_amount = amount or payment["amount"]
        refund_id = generate_gateway_id("rfnd")
        timestamp = int(datetime.utcnow().timestamp())

        refund = {
            "id": refund_id,
            "entity": "refund",
            "amount": refund_amount,
            "currency": payment["currency"],
            "payment_id": payment_id,
            "notes": notes or {},
            "receipt": None,
            "acquirer_data": {"rrn": str(random.randint(100000000000, 999999999999))},
            "created_at": timestamp,
            "batch_id": None,
            "status": "processed",
            "speed_processed": "normal",
            "speed_requested": "normal",
        }

        # Update payment
        payment["amount_refunded"] += refund_amount
        if payment["amount_refunded"] >= payment["amount"]:
            payment["refund_status"] = "full"
        else:
            payment["refund_status"] = "partial"

        return refund

    def generate_webhook_payload(
        self,
        event: str,
        payment: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Generate a webhook payload for testing webhook handlers."""
        timestamp = int(datetime.utcnow().timestamp())

        return {
            "entity": "event",
            "account_id": "acc_mock123456",
            "event": event,
            "contains": ["payment"],
            "payload": {
                "payment": {
                    "entity": payment,
                }
            },
            "created_at": timestamp,
        }


# Singleton instance
mock_payment_gateway = MockPaymentGatewayService()


async def get_mock_payment_gateway() -> MockPaymentGatewayService:
    """Dependency to get mock payment gateway service."""
    return mock_payment_gateway
