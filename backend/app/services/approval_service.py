"""
IntelliProcure AI – Multi-Tiered Approval Workflow Engine
Evaluates threshold policies, constructs approval chains, and manages sign-offs.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from uuid import UUID


class ApprovalWorkflowEngine:
    """Multi-tiered procurement approval policy evaluator."""

    # Default Enterprise Threshold Rules
    APPROVAL_POLICIES = [
        {
            "tier": 1,
            "max_amount": 5000.0,
            "auto_approve": True,
            "required_roles": [],
            "description": "Auto-Approved (Under $5,000 Threshold)"
        },
        {
            "tier": 2,
            "max_amount": 50000.0,
            "auto_approve": False,
            "required_roles": ["procurement_manager"],
            "description": "Single Approval (Procurement Manager)"
        },
        {
            "tier": 3,
            "max_amount": 250000.0,
            "auto_approve": False,
            "required_roles": ["procurement_manager", "finance"],
            "description": "Dual Approval (Manager + Finance Director)"
        },
        {
            "tier": 4,
            "max_amount": float("inf"),
            "auto_approve": False,
            "required_roles": ["procurement_manager", "finance", "admin"],
            "description": "Executive Approval (Manager + Finance + CPO/Admin)"
        }
    ]

    @classmethod
    def evaluate_pr_approval_chain(cls, amount: float) -> Dict[str, Any]:
        """
        Determines the required approval steps for a given requisition amount.
        """
        matching_policy = None
        for policy in cls.APPROVAL_POLICIES:
            if amount <= policy["max_amount"]:
                matching_policy = policy
                break

        if not matching_policy:
            matching_policy = cls.APPROVAL_POLICIES[-1]

        if matching_policy["auto_approve"]:
            return {
                "auto_approved": True,
                "tier": matching_policy["tier"],
                "policy_description": matching_policy["description"],
                "steps": []
            }

        steps = []
        for idx, role in enumerate(matching_policy["required_roles"], start=1):
            steps.append({
                "step_number": idx,
                "required_role": role,
                "status": "pending" if idx == 1 else "waiting",
                "notes": None,
            })

        return {
            "auto_approved": False,
            "tier": matching_policy["tier"],
            "policy_description": matching_policy["description"],
            "total_steps": len(steps),
            "steps": steps
        }
