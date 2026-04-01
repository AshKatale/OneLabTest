"""
Data generator for synthetic transaction and settlement data.
All dates are stored as ISO 8601 strings to ensure JSON-safe serialization.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any
import random
import uuid


class DataGenerator:
    def __init__(self, seed: int = 42):
        """Initialize with optional seed for reproducibility."""
        random.seed(seed)
        self.base_date = datetime(2026, 3, 1)

    def _iso(self, dt: datetime) -> str:
        """Convert datetime to ISO 8601 string."""
        return dt.isoformat()

    def generate_transactions(self, count: int = 50) -> List[Dict[str, Any]]:
        """
        Generate synthetic transactions with intentional edge cases.
        Edge cases included:
          - TXN-CROSS001: settles in next month
          - TXN-ORPHAN01: refund with no original transaction
          - TXN-ROUND01:  will have rounding mismatch in settlement
          - TXN-NORMAL01: will be duplicated in settlements
        """
        transactions = []

        # Regular transactions
        for _ in range(count - 4):
            transactions.append({
                "transaction_id": f"TXN-{str(uuid.uuid4())[:8].upper()}",
                "amount": round(random.uniform(10, 5000), 2),
                "timestamp": self._iso(self.base_date + timedelta(days=random.randint(0, 27))),
                "type": random.choice(["payment", "refund"]),
                "status": "completed",
            })

        # Edge case 1: transaction that will settle in April
        transactions.append({
            "transaction_id": "TXN-CROSS001",
            "amount": 250.00,
            "timestamp": self._iso(self.base_date + timedelta(days=28)),
            "type": "payment",
            "status": "completed",
        })

        # Edge case 2: orphan refund (no original transaction)
        transactions.append({
            "transaction_id": "TXN-ORPHAN01",
            "amount": 75.50,
            "timestamp": self._iso(self.base_date + timedelta(days=15)),
            "type": "refund",
            "status": "completed",
        })

        # Edge case 3: will have a rounding mismatch in settlement (100.00 vs 100.01)
        transactions.append({
            "transaction_id": "TXN-ROUND01",
            "amount": 100.00,
            "timestamp": self._iso(self.base_date + timedelta(days=10)),
            "type": "payment",
            "status": "completed",
        })

        # Edge case 4: will be duplicated in settlements
        transactions.append({
            "transaction_id": "TXN-NORMAL01",
            "amount": 500.00,
            "timestamp": self._iso(self.base_date + timedelta(days=5)),
            "type": "payment",
            "status": "completed",
        })

        return transactions

    def generate_settlements(self, transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Generate settlements based on transactions.
        Banks settle 1-2 days later. Includes intentional mismatches.
        """
        settlements = []

        # Normal settlements (all except the last 4 edge-case transactions)
        for txn in transactions[: len(transactions) - 4]:
            txn_date = datetime.fromisoformat(txn["timestamp"])
            settlements.append({
                "settlement_id": f"STL-{str(uuid.uuid4())[:8].upper()}",
                "transaction_id": txn["transaction_id"],
                "amount": txn["amount"],
                "settled_date": self._iso(txn_date + timedelta(days=random.randint(1, 2))),
                "status": "settled",
            })

        # Edge case 1: cross-month – TXN-CROSS001 settles in April
        settlements.append({
            "settlement_id": "STL-CROSS001",
            "transaction_id": "TXN-CROSS001",
            "amount": 250.00,
            "settled_date": self._iso(datetime(2026, 4, 2)),
            "status": "settled",
        })

        # Edge case 2: duplicate settlements for TXN-NORMAL01
        for suffix in ["0001", "0002"]:
            settlements.append({
                "settlement_id": f"STL-DUP-{suffix}",
                "transaction_id": "TXN-NORMAL01",
                "amount": 500.00,
                "settled_date": self._iso(datetime(2026, 3, 6)),
                "status": "settled",
            })

        # Edge case 3: rounding mismatch – 100.01 vs 100.00
        settlements.append({
            "settlement_id": "STL-ROUND01",
            "transaction_id": "TXN-ROUND01",
            "amount": 100.01,
            "settled_date": self._iso(datetime(2026, 3, 12)),
            "status": "settled",
        })

        # Note: TXN-ORPHAN01 intentionally has NO settlement

        return settlements

    def get_all_data(self, transaction_count: int = 50) -> Dict[str, Any]:
        """Generate the full dataset."""
        transactions = self.generate_transactions(transaction_count)
        settlements = self.generate_settlements(transactions)
        return {
            "transactions": transactions,
            "settlements": settlements,
            "generated_at": datetime.now().isoformat(),
        }
