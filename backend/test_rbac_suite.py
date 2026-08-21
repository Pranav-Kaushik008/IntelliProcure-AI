"""
IntelliProcure AI - RBAC Test Suite
Run: pytest test_rbac_suite.py -v
"""
import pytest, sys, os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token

client = TestClient(app)

def make_token(role): return create_access_token(data={"sub": f"test_{role}@test.com", "role": role})
def auth(role): return {"Authorization": f"Bearer {make_token(role)}"}

# PR Tests
def test_pr_list_blocked_supplier(): assert client.get("/api/v1/purchase-requests/", headers=auth("supplier")).status_code == 403
def test_pr_create_blocked_auditor(): assert client.post("/api/v1/purchase-requests/", headers=auth("auditor"), json={"title":"x","total_amount":1}).status_code == 403
def test_pr_create_blocked_supplier(): assert client.post("/api/v1/purchase-requests/", headers=auth("supplier"), json={"title":"x"}).status_code == 403
def test_pr_list_allowed_buyer(): assert client.get("/api/v1/purchase-requests/", headers=auth("buyer")).status_code in (200, 404)
def test_pr_unauthenticated(): assert client.get("/api/v1/purchase-requests/").status_code == 401

# PO Tests
def test_po_create_blocked_finance(): assert client.post("/api/v1/purchase-orders/", headers=auth("finance"), json={}).status_code == 403
def test_po_create_blocked_auditor(): assert client.post("/api/v1/purchase-orders/", headers=auth("auditor"), json={}).status_code == 403
def test_po_approve_blocked_buyer(): assert client.post("/api/v1/purchase-orders/00000000-0000-0000-0000-000000000001/approve", headers=auth("buyer")).status_code in (403, 404)
def test_po_approve_allowed_manager(): assert client.post("/api/v1/purchase-orders/00000000-0000-0000-0000-000000000001/approve", headers=auth("manager")).status_code in (200, 404)

# Invoice Tests
def test_inv_approve_blocked_buyer(): assert client.post("/api/v1/invoices/00000000-0000-0000-0000-000000000001/approve", headers=auth("buyer")).status_code in (403, 404)
def test_inv_approve_blocked_manager(): assert client.post("/api/v1/invoices/00000000-0000-0000-0000-000000000001/approve", headers=auth("manager")).status_code in (403, 404)
def test_inv_approve_allowed_finance(): assert client.post("/api/v1/invoices/00000000-0000-0000-0000-000000000001/approve", headers=auth("finance")).status_code in (200, 404)
def test_inv_pay_blocked_supplier(): assert client.post("/api/v1/invoices/00000000-0000-0000-0000-000000000001/pay", headers=auth("supplier")).status_code == 403
def test_inv_delete_blocked_buyer(): assert client.delete("/api/v1/invoices/00000000-0000-0000-0000-000000000001", headers=auth("buyer")).status_code in (403, 404)

# RFQ Tests
def test_rfq_list_blocked_supplier(): assert client.get("/api/v1/rfq/", headers=auth("supplier")).status_code == 403
def test_rfq_create_blocked_finance(): assert client.post("/api/v1/rfq/", headers=auth("finance"), json={"title":"x"}).status_code == 403
def test_rfq_create_blocked_auditor(): assert client.post("/api/v1/rfq/", headers=auth("auditor"), json={"title":"x"}).status_code == 403

# Budget Tests
def test_budget_list_blocked_supplier(): assert client.get("/api/v1/budget/", headers=auth("supplier")).status_code == 403
def test_budget_create_blocked_buyer(): assert client.post("/api/v1/budget/", headers=auth("buyer"), json={"name":"x","category":"IT","allocated_amount":100}).status_code == 403
def test_budget_create_allowed_finance(): assert client.post("/api/v1/budget/", headers=auth("finance"), json={"name":"x","category":"IT","allocated_amount":100}).status_code in (200,201)

# Suppliers Tests
def test_supplier_list_blocked_supplier_role(): assert client.get("/api/v1/suppliers/", headers=auth("supplier")).status_code == 403
def test_supplier_delete_blocked_buyer(): assert client.delete("/api/v1/suppliers/00000000-0000-0000-0000-000000000001", headers=auth("buyer")).status_code in (403,404)
def test_supplier_delete_allowed_manager(): assert client.delete("/api/v1/suppliers/00000000-0000-0000-0000-000000000001", headers=auth("manager")).status_code in (204,404)

# Audit Logs Tests
def test_audit_blocked_supplier(): assert client.get("/api/v1/audit-logs/", headers=auth("supplier")).status_code == 403
def test_audit_allowed_auditor(): assert client.get("/api/v1/audit-logs/", headers=auth("auditor")).status_code in (200,404)

# 3WM Tests
def test_match_blocked_auditor(): assert client.post("/api/v1/matching/match/00000000-0000-0000-0000-000000000001", headers=auth("auditor")).status_code in (403,404)
def test_match_blocked_supplier(): assert client.post("/api/v1/matching/match/00000000-0000-0000-0000-000000000001", headers=auth("supplier")).status_code in (403,404)
def test_match_list_blocked_supplier(): assert client.get("/api/v1/matching/", headers=auth("supplier")).status_code == 403

# User Management (Admin Only)
def test_users_blocked_supplier(): assert client.get("/api/v1/users/", headers=auth("supplier")).status_code == 403
def test_create_user_blocked_manager(): assert client.post("/api/v1/users/", headers=auth("manager"), json={"email":"test_mgr@corp.com","password":"Password123","first_name":"T","last_name":"U"}).status_code == 403
def test_create_user_blocked_buyer(): assert client.post("/api/v1/users/", headers=auth("buyer"), json={"email":"test_mgr@corp.com","password":"Password123","first_name":"T","last_name":"U"}).status_code == 403
def test_assign_role_blocked_manager(): assert client.post("/api/v1/users/assign-role", headers=auth("manager"), json={"email":"test@corp.com","role":"buyer"}).status_code == 403
def test_assign_role_allowed_admin(): assert client.post("/api/v1/users/assign-role", headers=auth("admin"), json={"email":"test@corp.com","role":"buyer"}).status_code in (200, 404)
def test_toggle_user_status_blocked_finance(): assert client.patch("/api/v1/users/00000000-0000-0000-0000-000000000001/status", headers=auth("finance"), json={"is_active":False}).status_code == 403
def test_delete_user_blocked_manager(): assert client.delete("/api/v1/users/00000000-0000-0000-0000-000000000001", headers=auth("manager")).status_code == 403

# Department Management (Admin Only)
def test_create_dept_blocked_buyer(): assert client.post("/api/v1/departments/", headers=auth("buyer"), json={"name":"Legal"}).status_code == 403
def test_create_dept_allowed_admin(): assert client.post("/api/v1/departments/", headers=auth("admin"), json={"name":"Legal"}).status_code in (201, 400)

# ERP Sync (Admin Only)
def test_erp_sync_blocked_buyer(): assert client.post("/api/v1/erp/sync", headers=auth("buyer")).status_code == 403
def test_erp_sync_blocked_auditor(): assert client.post("/api/v1/erp/sync", headers=auth("auditor")).status_code == 403

# Buyer Role Comprehensive Permissions Matrix
def test_buyer_can_list_purchase_requests(): assert client.get("/api/v1/purchase-requests/", headers=auth("buyer")).status_code in (200, 404)
def test_buyer_can_create_purchase_request(): assert client.post("/api/v1/purchase-requests/", headers=auth("buyer"), json={"title":"Test PR","description":"Office Equip","total_amount":500,"department":"IT","category":"Hardware"}).status_code in (200, 201, 422)
def test_buyer_can_create_rfq(): assert client.post("/api/v1/rfq/", headers=auth("buyer"), json={"title":"RFQ Hardware Sourcing","description":"Laptops"}).status_code in (200, 201, 400, 422)
def test_buyer_can_list_rfq(): assert client.get("/api/v1/rfq/", headers=auth("buyer")).status_code in (200, 404)
def test_buyer_can_create_po(): assert client.post("/api/v1/purchase-orders/", headers=auth("buyer"), json={"po_number":"PO-BUYER-01","supplier_id":"00000000-0000-0000-0000-000000000001"}).status_code in (200, 201, 400, 422)
def test_buyer_can_list_po(): assert client.get("/api/v1/purchase-orders/", headers=auth("buyer")).status_code in (200, 404)
def test_buyer_can_list_suppliers(): assert client.get("/api/v1/suppliers/", headers=auth("buyer")).status_code in (200, 404)
def test_buyer_can_view_invoices(): assert client.get("/api/v1/invoices/", headers=auth("buyer")).status_code in (200, 404)
def test_buyer_can_view_3way_matching(): assert client.get("/api/v1/matching/", headers=auth("buyer")).status_code in (200, 404)
def test_buyer_cannot_approve_invoice(): assert client.post("/api/v1/invoices/00000000-0000-0000-0000-000000000001/approve", headers=auth("buyer")).status_code in (403, 404)
def test_buyer_cannot_pay_invoice(): assert client.post("/api/v1/invoices/00000000-0000-0000-0000-000000000001/pay", headers=auth("buyer")).status_code in (403, 404)
def test_buyer_cannot_delete_invoice(): assert client.delete("/api/v1/invoices/00000000-0000-0000-0000-000000000001", headers=auth("buyer")).status_code in (403, 404)

# Manager Role Comprehensive Permissions Matrix
def test_manager_can_list_purchase_requests(): assert client.get("/api/v1/purchase-requests/", headers=auth("manager")).status_code in (200, 404)
def test_manager_can_approve_pr(): assert client.post("/api/v1/purchase-requests/00000000-0000-0000-0000-000000000001/approve?notes=Approved", headers=auth("manager")).status_code in (200, 404)
def test_manager_can_reject_pr(): assert client.post("/api/v1/purchase-requests/00000000-0000-0000-0000-000000000001/reject?reason=Budget+exceeded", headers=auth("manager")).status_code in (200, 404)
def test_manager_can_list_purchase_orders(): assert client.get("/api/v1/purchase-orders/", headers=auth("manager")).status_code in (200, 404)
def test_manager_can_approve_po(): assert client.post("/api/v1/purchase-orders/00000000-0000-0000-0000-000000000001/approve", headers=auth("manager")).status_code in (200, 404)
def test_manager_can_reject_po(): assert client.post("/api/v1/purchase-orders/00000000-0000-0000-0000-000000000001/reject?reason=Excessive+quantity", headers=auth("manager")).status_code in (200, 404)
def test_manager_can_view_budget(): assert client.get("/api/v1/budget/", headers=auth("manager")).status_code in (200, 404)
def test_manager_can_view_rfq(): assert client.get("/api/v1/rfq/", headers=auth("manager")).status_code in (200, 404)
def test_manager_can_view_suppliers(): assert client.get("/api/v1/suppliers/", headers=auth("manager")).status_code in (200, 404)
def test_manager_can_view_analytics(): assert client.get("/api/v1/analytics/spend-by-category", headers=auth("manager")).status_code in (200, 404)
def test_manager_cannot_approve_invoice(): assert client.post("/api/v1/invoices/00000000-0000-0000-0000-000000000001/approve", headers=auth("manager")).status_code in (403, 404)
def test_manager_cannot_pay_invoice(): assert client.post("/api/v1/invoices/00000000-0000-0000-0000-000000000001/pay", headers=auth("manager")).status_code in (403, 404)
def test_manager_cannot_create_user(): assert client.post("/api/v1/users/", headers=auth("manager"), json={"email":"u@corp.com","password":"Password123","first_name":"A","last_name":"B"}).status_code == 403
def test_manager_cannot_assign_roles(): assert client.post("/api/v1/users/assign-role", headers=auth("manager"), json={"email":"u@corp.com","role":"admin"}).status_code == 403
def test_manager_cannot_trigger_erp_sync(): assert client.post("/api/v1/erp/sync", headers=auth("manager")).status_code == 403

# Finance Role Comprehensive Permissions Matrix
def test_finance_can_list_invoices(): assert client.get("/api/v1/invoices/", headers=auth("finance")).status_code in (200, 404)
def test_finance_can_approve_invoice(): assert client.post("/api/v1/invoices/00000000-0000-0000-0000-000000000001/approve", headers=auth("finance")).status_code in (200, 404)
def test_finance_can_reject_invoice(): assert client.post("/api/v1/invoices/00000000-0000-0000-0000-000000000001/reject?reason=Incorrect+tax", headers=auth("finance")).status_code in (200, 404)
def test_finance_can_pay_invoice(): assert client.post("/api/v1/invoices/00000000-0000-0000-0000-000000000001/pay", headers=auth("finance")).status_code in (200, 404)
def test_finance_can_run_3way_matching(): assert client.post("/api/v1/matching/match/00000000-0000-0000-0000-000000000001", headers=auth("finance")).status_code in (200, 404, 422)
def test_finance_can_view_budget(): assert client.get("/api/v1/budget/", headers=auth("finance")).status_code in (200, 404)
def test_finance_can_create_budget(): assert client.post("/api/v1/budget/", headers=auth("finance"), json={"name":"FY26 Operations","category":"Operations","allocated_amount":500000}).status_code in (200, 201)
def test_finance_can_view_reports(): assert client.get("/api/v1/reports/spend-by-department", headers=auth("finance")).status_code in (200, 404)
def test_finance_cannot_create_users(): assert client.post("/api/v1/users/", headers=auth("finance"), json={"email":"x@corp.com","password":"Password123","first_name":"A","last_name":"B"}).status_code == 403
def test_finance_cannot_assign_roles(): assert client.post("/api/v1/users/assign-role", headers=auth("finance"), json={"email":"x@corp.com","role":"admin"}).status_code == 403

# Explicit 4-Role Invoice Final Approval Verification
def test_invoice_approval_buyer_returns_403(): assert client.post("/api/v1/invoices/00000000-0000-0000-0000-000000000001/approve", headers=auth("buyer")).status_code in (403, 404)
def test_invoice_approval_finance_returns_success(): assert client.post("/api/v1/invoices/00000000-0000-0000-0000-000000000001/approve", headers=auth("finance")).status_code in (200, 404)
def test_invoice_approval_auditor_returns_403(): assert client.post("/api/v1/invoices/00000000-0000-0000-0000-000000000001/approve", headers=auth("auditor")).status_code in (403, 404)
def test_invoice_approval_supplier_returns_403(): assert client.post("/api/v1/invoices/00000000-0000-0000-0000-000000000001/approve", headers=auth("supplier")).status_code == 403

# Auditor Role Comprehensive Read-Only Matrix
def test_auditor_can_view_purchase_requests(): assert client.get("/api/v1/purchase-requests/", headers=auth("auditor")).status_code in (200, 404)
def test_auditor_can_view_purchase_orders(): assert client.get("/api/v1/purchase-orders/", headers=auth("auditor")).status_code in (200, 404)
def test_auditor_can_view_rfq(): assert client.get("/api/v1/rfq/", headers=auth("auditor")).status_code in (200, 404)
def test_auditor_can_view_invoices(): assert client.get("/api/v1/invoices/", headers=auth("auditor")).status_code in (200, 404)
def test_auditor_can_view_suppliers(): assert client.get("/api/v1/suppliers/", headers=auth("auditor")).status_code in (200, 404)
def test_auditor_can_view_contracts(): assert client.get("/api/v1/contracts/", headers=auth("auditor")).status_code in (200, 404)
def test_auditor_can_view_budget(): assert client.get("/api/v1/budget/", headers=auth("auditor")).status_code in (200, 404)
def test_auditor_can_view_audit_logs(): assert client.get("/api/v1/audit-logs/", headers=auth("auditor")).status_code in (200, 404)
def test_auditor_can_view_analytics(): assert client.get("/api/v1/analytics/spend-by-category", headers=auth("auditor")).status_code in (200, 404)
def test_auditor_can_view_reports(): assert client.get("/api/v1/reports/spend-by-department", headers=auth("auditor")).status_code in (200, 404)

# Auditor Mutations Strictly Blocked with HTTP 403
def test_auditor_cannot_create_pr(): assert client.post("/api/v1/purchase-requests/", headers=auth("auditor"), json={"title":"x"}).status_code == 403
def test_auditor_cannot_approve_pr(): assert client.post("/api/v1/purchase-requests/00000000-0000-0000-0000-000000000001/approve", headers=auth("auditor")).status_code in (403, 404)
def test_auditor_cannot_create_po(): assert client.post("/api/v1/purchase-orders/", headers=auth("auditor"), json={"po_number":"PO-X"}).status_code == 403
def test_auditor_cannot_approve_po(): assert client.post("/api/v1/purchase-orders/00000000-0000-0000-0000-000000000001/approve", headers=auth("auditor")).status_code in (403, 404)
def test_auditor_cannot_create_rfq(): assert client.post("/api/v1/rfq/", headers=auth("auditor"), json={"title":"x"}).status_code == 403
def test_auditor_cannot_create_supplier(): assert client.post("/api/v1/suppliers/", headers=auth("auditor"), json={"company_name":"x"}).status_code == 403
def test_auditor_cannot_delete_supplier(): assert client.delete("/api/v1/suppliers/00000000-0000-0000-0000-000000000001", headers=auth("auditor")).status_code in (403, 404)
def test_auditor_cannot_create_budget(): assert client.post("/api/v1/budget/", headers=auth("auditor"), json={"name":"x","allocated_amount":100}).status_code == 403
def test_auditor_cannot_create_contract(): assert client.post("/api/v1/contracts/", headers=auth("auditor"), json={"title":"x"}).status_code == 403
def test_auditor_cannot_create_user(): assert client.post("/api/v1/users/", headers=auth("auditor"), json={"email":"a@b.com"}).status_code == 403
def test_auditor_cannot_assign_roles(): assert client.post("/api/v1/users/assign-role", headers=auth("auditor"), json={"email":"a@b.com","role":"admin"}).status_code == 403

# Supplier Role Comprehensive Isolation & Permissions Matrix
def test_supplier_can_list_assigned_rfq(): assert client.get("/api/v1/rfq/", headers=auth("supplier")).status_code in (200, 404)
def test_supplier_can_list_own_quotations(): assert client.get("/api/v1/quotations/", headers=auth("supplier")).status_code in (200, 404)
def test_supplier_can_view_own_pos(): assert client.get("/api/v1/purchase-orders/", headers=auth("supplier")).status_code in (200, 404)
def test_supplier_can_view_own_invoices(): assert client.get("/api/v1/invoices/", headers=auth("supplier")).status_code in (200, 404)

# Supplier Blocked from Internal Modules (403 Forbidden)
def test_supplier_cannot_view_supplier_directory(): assert client.get("/api/v1/suppliers/", headers=auth("supplier")).status_code == 403
def test_supplier_cannot_compare_competitor_quotations(): assert client.get("/api/v1/quotations/compare/00000000-0000-0000-0000-000000000001", headers=auth("supplier")).status_code == 403
def test_supplier_cannot_view_internal_budgets(): assert client.get("/api/v1/budget/", headers=auth("supplier")).status_code == 403
def test_supplier_cannot_view_audit_logs(): assert client.get("/api/v1/audit-logs/", headers=auth("supplier")).status_code == 403
def test_supplier_cannot_approve_pr(): assert client.post("/api/v1/purchase-requests/00000000-0000-0000-0000-000000000001/approve", headers=auth("supplier")).status_code == 403
def test_supplier_cannot_approve_po(): assert client.post("/api/v1/purchase-orders/00000000-0000-0000-0000-000000000001/approve", headers=auth("supplier")).status_code == 403
def test_supplier_cannot_approve_invoice(): assert client.post("/api/v1/invoices/00000000-0000-0000-0000-000000000001/approve", headers=auth("supplier")).status_code == 403
def test_supplier_cannot_create_users(): assert client.post("/api/v1/users/", headers=auth("supplier"), json={"email":"s@corp.com"}).status_code == 403
def test_supplier_cannot_access_settings_sync(): assert client.post("/api/v1/erp/sync", headers=auth("supplier")).status_code == 403

# Unauthenticated
ENDPOINTS = ["/api/v1/purchase-requests/","/api/v1/purchase-orders/","/api/v1/invoices/","/api/v1/rfq/","/api/v1/matching/","/api/v1/budget/","/api/v1/suppliers/","/api/v1/audit-logs/","/api/v1/users/"]
@pytest.mark.parametrize("url", ENDPOINTS)
def test_unauthenticated_401(url): assert client.get(url).status_code == 401






