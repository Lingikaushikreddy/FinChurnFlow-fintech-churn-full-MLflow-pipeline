"""
Mock Payout Service - Simulates payout APIs for development.
"""

import asyncio
import random
from datetime import datetime
from typing import Dict, Any, Optional

from shared.utils.helpers import generate_gateway_id


class MockPayoutService:
    """
    Mock implementation of payout APIs.
    Used for development and testing without actual money transfers.
    """

    def __init__(self):
        self.contacts: Dict[str, Dict[str, Any]] = {}
        self.fund_accounts: Dict[str, Dict[str, Any]] = {}
        self.payouts: Dict[str, Dict[str, Any]] = {}

    async def create_contact(
        self,
        name: str,
        email: Optional[str] = None,
        contact: Optional[str] = None,
        contact_type: str = "customer",
        reference_id: Optional[str] = None,
        notes: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Create a contact.
        Simulates: POST /v1/contacts
        """
        contact_id = generate_gateway_id("cont")
        timestamp = int(datetime.utcnow().timestamp())

        contact_obj = {
            "id": contact_id,
            "entity": "contact",
            "name": name,
            "contact": contact,
            "email": email,
            "type": contact_type,
            "reference_id": reference_id,
            "batch_id": None,
            "active": True,
            "notes": notes or {},
            "created_at": timestamp,
        }

        self.contacts[contact_id] = contact_obj
        return contact_obj

    async def create_fund_account(
        self,
        contact_id: str,
        account_type: str,  # 'bank_account' or 'vpa'
        account_details: Dict[str, str],
    ) -> Dict[str, Any]:
        """
        Create a fund account for a contact.
        Simulates: POST /v1/fund_accounts
        """
        if contact_id not in self.contacts:
            raise ValueError(f"Contact {contact_id} not found")

        fa_id = generate_gateway_id("fa")
        timestamp = int(datetime.utcnow().timestamp())

        fund_account = {
            "id": fa_id,
            "entity": "fund_account",
            "contact_id": contact_id,
            "account_type": account_type,
            "active": True,
            "created_at": timestamp,
        }

        if account_type == "vpa":
            fund_account["vpa"] = {
                "address": account_details.get("address"),
            }
        elif account_type == "bank_account":
            fund_account["bank_account"] = {
                "ifsc": account_details.get("ifsc"),
                "bank_name": self._get_bank_name(account_details.get("ifsc", "")),
                "name": account_details.get("name"),
                "notes": [],
                "account_number": account_details.get("account_number"),
            }

        self.fund_accounts[fa_id] = fund_account
        return fund_account

    async def create_payout(
        self,
        account_number: str,
        amount: int,  # Amount in paise
        mode: str = "UPI",  # UPI, IMPS, NEFT, RTGS
        purpose: str = "payout",
        reference_id: Optional[str] = None,
        narration: Optional[str] = None,
        notes: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Create a payout.
        Simulates: POST /v1/payouts
        """
        payout_id = generate_gateway_id("pout")
        timestamp = int(datetime.utcnow().timestamp())

        # Simulate processing (95% success rate)
        success = random.random() < 0.95

        payout = {
            "id": payout_id,
            "entity": "payout",
            "fund_account_id": None,  # Would be linked in real implementation
            "amount": amount,
            "currency": "INR",
            "fees": int(amount * 0.005),  # 0.5% fee
            "tax": 0,
            "status": "processed" if success else "failed",
            "purpose": purpose,
            "utr": str(random.randint(100000000000, 999999999999)) if success else None,
            "mode": mode,
            "reference_id": reference_id,
            "narration": narration,
            "batch_id": None,
            "failure_reason": None if success else "INSUFFICIENT_BALANCE",
            "notes": notes or {},
            "created_at": timestamp,
        }

        self.payouts[payout_id] = payout
        return payout

    async def get_payout(self, payout_id: str) -> Dict[str, Any]:
        """
        Get payout details.
        Simulates: GET /v1/payouts/{id}
        """
        if payout_id not in self.payouts:
            raise ValueError(f"Payout {payout_id} not found")

        return self.payouts[payout_id]

    async def cancel_payout(self, payout_id: str) -> Dict[str, Any]:
        """
        Cancel a payout.
        Simulates: POST /v1/payouts/{id}/cancel
        """
        if payout_id not in self.payouts:
            raise ValueError(f"Payout {payout_id} not found")

        payout = self.payouts[payout_id]

        if payout["status"] not in ["queued", "pending"]:
            raise ValueError("Payout cannot be cancelled")

        payout["status"] = "cancelled"
        return payout

    async def get_account_balance(self) -> Dict[str, Any]:
        """
        Get account balance.
        Simulates: GET /v1/balance
        """
        # Return mock balance
        return {
            "id": "bal_mock123456",
            "entity": "balance",
            "type": "primary",
            "balance": 10000000,  # 1 lakh rupees in paise
            "currency": "INR",
        }

    async def simulate_payout_webhook(
        self,
        payout_id: str,
        event: str = "payout.processed",
    ) -> Dict[str, Any]:
        """Generate a webhook payload for payout events."""
        if payout_id not in self.payouts:
            raise ValueError(f"Payout {payout_id} not found")

        payout = self.payouts[payout_id]
        timestamp = int(datetime.utcnow().timestamp())

        return {
            "entity": "event",
            "account_id": "acc_mock123456",
            "event": event,
            "contains": ["payout"],
            "payload": {
                "payout": {
                    "entity": payout,
                }
            },
            "created_at": timestamp,
        }

    def _get_bank_name(self, ifsc: str) -> str:
        """Get bank name from IFSC code."""
        bank_prefixes = {
            "HDFC": "HDFC Bank",
            "ICIC": "ICICI Bank",
            "SBIN": "State Bank of India",
            "AXIS": "Axis Bank",
            "KKBK": "Kotak Mahindra Bank",
            "UTIB": "Axis Bank",
            "BARB": "Bank of Baroda",
            "PUNB": "Punjab National Bank",
            "IOBA": "Indian Overseas Bank",
            "YESB": "Yes Bank",
        }

        prefix = ifsc[:4].upper()
        return bank_prefixes.get(prefix, "Unknown Bank")


# Singleton instance
mock_payout_service = MockPayoutService()


async def get_mock_payout_service() -> MockPayoutService:
    """Dependency to get mock payout service."""
    return mock_payout_service
