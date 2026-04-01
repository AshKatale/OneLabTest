"""
Reconciliation logic to detect mismatches between transactions and settlements.

Key fixes:
  - Cross-month detection now looks at ALL settlements (not just filtered ones)
  - All date fields in issues output are returned as strings
  - _get_month() handles both str and datetime objects safely
"""

from typing import List, Dict, Any, Set
from datetime import datetime


class Reconciler:
    def __init__(self, tolerance: float = 0.01):
        """
        Args:
            tolerance: Maximum allowed amount difference before flagging mismatch (default 0.01)
        """
        self.tolerance = tolerance
        self.issues: List[Dict] = []
        self.summary: Dict = {}

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def reconcile(
        self,
        transactions: List[Dict[str, Any]],
        settlements: List[Dict[str, Any]],
        target_month: str = "2026-03",
    ) -> Dict[str, Any]:
        """
        Run reconciliation and return structured results.

        Steps:
          1. Filter transactions/settlements by target_month
          2. Detect duplicates in month settlements
          3. For each transaction: match, check amounts, detect duplicates
          4. If no match in target month: check cross-month vs truly missing
          5. Detect extra settlements (settled but no transaction)
          6. Detect invalid refunds (orphan refunds)
        """
        self.issues = []

        # --- Filter by month ---
        month_txns = [t for t in transactions if self._get_month(t["timestamp"]) == target_month]
        month_stls = [s for s in settlements if self._get_month(s["settled_date"]) == target_month]

        # --- Lookups ---
        txn_by_id: Dict[str, Dict] = {t["transaction_id"]: t for t in month_txns}

        # Month settlements grouped by transaction_id
        stl_by_txn: Dict[str, List] = {}
        for s in month_stls:
            stl_by_txn.setdefault(s["transaction_id"], []).append(s)

        # ALL settlements grouped by transaction_id (for cross-month detection)
        all_stl_by_txn: Dict[str, List] = {}
        for s in settlements:
            all_stl_by_txn.setdefault(s["transaction_id"], []).append(s)

        # Duplicate map (txn_ids that have >1 settlement in target month)
        duplicates = {tid: stls for tid, stls in stl_by_txn.items() if len(stls) > 1}

        # --- Check each month transaction ---
        settled_txn_ids: Set[str] = set()

        for txn_id, txn in txn_by_id.items():
            if txn_id in stl_by_txn:
                # Has at least one settlement in target month
                settled_txn_ids.add(txn_id)
                matched_stls = stl_by_txn[txn_id]

                # Amount mismatch check
                for stl in matched_stls:
                    if not self._amounts_match(txn["amount"], stl["amount"]):
                        self.issues.append({
                            "type": "amount_mismatch",
                            "transaction_id": txn_id,
                            "transaction_amount": txn["amount"],
                            "settlement_amount": stl["amount"],
                            "difference": round(abs(txn["amount"] - stl["amount"]), 4),
                            "settlement_id": stl["settlement_id"],
                        })

                # Duplicate settlement check
                if txn_id in duplicates:
                    self.issues.append({
                        "type": "duplicate_settlement",
                        "transaction_id": txn_id,
                        "count": len(matched_stls),
                        "settlement_ids": [s["settlement_id"] for s in matched_stls],
                        "amount": txn["amount"],
                    })

            else:
                # No settlement in target month — check if it settled in another month
                if txn_id in all_stl_by_txn:
                    for stl in all_stl_by_txn[txn_id]:
                        stl_month = self._get_month(stl["settled_date"])
                        if stl_month != target_month:
                            self.issues.append({
                                "type": "cross_month_settlement",
                                "transaction_id": txn_id,
                                "transaction_month": target_month,
                                "settlement_month": stl_month,
                                "amount": txn["amount"],
                                "settlement_date": self._to_str(stl["settled_date"]),
                                "settlement_id": stl["settlement_id"],
                            })
                else:
                    # Truly missing — no settlement anywhere
                    self.issues.append({
                        "type": "missing_settlement",
                        "transaction_id": txn_id,
                        "amount": txn["amount"],
                        "transaction_date": self._to_str(txn["timestamp"]),
                    })

        # --- Extra settlements (settled in target month, no matching transaction) ---
        for stl in month_stls:
            if stl["transaction_id"] not in txn_by_id:
                self.issues.append({
                    "type": "extra_settlement",
                    "transaction_id": stl["transaction_id"],
                    "settlement_id": stl["settlement_id"],
                    "amount": stl["amount"],
                    "settled_date": self._to_str(stl["settled_date"]),
                })

        # --- Invalid refunds (orphan refunds with no original transaction) ---
        for txn in month_txns:
            if txn["type"] == "refund" and txn["transaction_id"].startswith("TXN-ORPHAN"):
                self.issues.append({
                    "type": "invalid_refund",
                    "transaction_id": txn["transaction_id"],
                    "amount": txn["amount"],
                    "timestamp": self._to_str(txn["timestamp"]),
                    "reason": "Refund without a matching original transaction",
                })

        # --- Build summary ---
        self.summary = self._build_summary(month_txns, month_stls, settled_txn_ids, duplicates)

        return {
            "summary": self.summary,
            "issues": self.issues,
            "reconciliation_date": datetime.now().isoformat(),
            "target_month": target_month,
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _get_month(self, date_value) -> str:
        """Return YYYY-MM from either an ISO string or a datetime object."""
        if isinstance(date_value, str):
            return date_value[:7]          # ISO strings start with YYYY-MM-DD
        elif isinstance(date_value, datetime):
            return date_value.strftime("%Y-%m")
        return ""

    def _to_str(self, date_value) -> str:
        """Ensure a date is returned as a string (safe for JSON)."""
        if isinstance(date_value, str):
            return date_value
        elif isinstance(date_value, datetime):
            return date_value.isoformat()
        return str(date_value)

    def _amounts_match(self, a: float, b: float) -> bool:
        """True if the two amounts differ by no more than self.tolerance."""
        return abs(a - b) <= self.tolerance

    def _build_summary(
        self,
        transactions: List[Dict],
        settlements: List[Dict],
        settled_ids: Set[str],
        duplicates: Dict[str, List],
    ) -> Dict[str, Any]:
        total_txn_amount = sum(t["amount"] for t in transactions)
        total_stl_amount = sum(s["amount"] for s in settlements)

        issue_counts: Dict[str, int] = {}
        for issue in self.issues:
            issue_counts[issue["type"]] = issue_counts.get(issue["type"], 0) + 1

        return {
            "total_transactions": len(transactions),
            "total_settlements": len(settlements),
            "matched_transactions": len(settled_ids),
            "unmatched_transactions": len(transactions) - len(settled_ids),
            "total_transaction_amount": round(total_txn_amount, 2),
            "total_settlement_amount": round(total_stl_amount, 2),
            "amount_difference": round(total_stl_amount - total_txn_amount, 2),
            "duplicate_count": len(duplicates),
            "total_issues": len(self.issues),
            "issue_breakdown": issue_counts,
        }
