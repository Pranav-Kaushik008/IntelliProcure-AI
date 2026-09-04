"""
IntelliProcure AI – Demo Data Seeder
Seeds the database with realistic procurement demo data on first run.
"""

import logging
import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.supplier import Supplier
from app.models.purchase_request import PurchaseRequest, PRStatus, PRPriority
from app.models.purchase_order import PurchaseOrder, POStatus
from app.models.invoice import Invoice, InvoiceStatus
from app.models.inventory import Inventory, InventoryStatus
from app.models.ai_recommendation import AIRecommendation

logger = logging.getLogger(__name__)

now = datetime.utcnow()


def _ago(days=0, hours=0):
    return now - timedelta(days=days, hours=hours)


def seed_demo_data():
    """Seed database with realistic demo data if not already seeded."""
    db: Session = SessionLocal()
    try:
        # ── Admin User ─────────────────────────────────────────────────────
        admin = db.query(User).filter(User.email == "pranavkaushikyr@gmail.com").first()
        if admin:
            admin.is_active = True
            admin.is_deleted = False
            admin.is_verified = True
            admin.role = UserRole.ADMIN
            admin.hashed_password = get_password_hash("Admin@1234")
            db.commit()
        else:
            old = db.query(User).filter(User.email == "admin@intelliprocure.ai").first()
            if old:
                old.email = "pranavkaushikyr@gmail.com"
                old.hashed_password = get_password_hash("Admin@1234")
                old.first_name = "Pranav"
                old.last_name = "Kaushik"
                old.is_active = True
                old.is_deleted = False
                old.is_verified = True
                old.role = UserRole.ADMIN
                db.commit()
                admin = old
            else:
                admin = User(
                    email="pranavkaushikyr@gmail.com",
                    hashed_password=get_password_hash("Admin@1234"),
                    first_name="Pranav",
                    last_name="Kaushik",
                    role=UserRole.ADMIN,
                    department="Executive",
                    job_title="Chief Procurement Officer",
                    is_active=True,
                    is_verified=True,
                )
                db.add(admin)
                db.commit()

        # Buyer demo user
        buyer = db.query(User).filter(User.email == "buyer@intelliprocure.ai").first()
        if not buyer:
            buyer = User(
                email="buyer@intelliprocure.ai",
                hashed_password=get_password_hash("Buyer@1234"),
                first_name="Sarah",
                last_name="Johnson",
                role=UserRole.BUYER,
                department="IT & Hardware",
                job_title="Senior Buyer",
                is_active=True,
                is_verified=True,
            )
            db.add(buyer)
            db.commit()

        # Manager demo user
        manager = db.query(User).filter(User.email == "manager@intelliprocure.ai").first()
        if not manager:
            manager = User(
                email="manager@intelliprocure.ai",
                hashed_password=get_password_hash("Manager@1234"),
                first_name="Michael",
                last_name="Chen",
                role=UserRole.PROCUREMENT_MANAGER,
                department="Operations",
                job_title="Procurement Manager",
                is_active=True,
                is_verified=True,
            )
            db.add(manager)
            db.commit()

        # Finance demo user
        finance_user = db.query(User).filter(User.email == "finance@intelliprocure.ai").first()
        if not finance_user:
            finance_user = User(
                email="finance@intelliprocure.ai",
                hashed_password=get_password_hash("Finance@1234"),
                first_name="Emily",
                last_name="Rodriguez",
                role="finance",
                department="Finance & Accounts",
                job_title="Financial Controller",
                is_active=True,
                is_verified=True,
            )
            db.add(finance_user)
            db.commit()

        # Auditor demo user
        auditor_user = db.query(User).filter(User.email == "auditor@intelliprocure.ai").first()
        if not auditor_user:
            auditor_user = User(
                email="auditor@intelliprocure.ai",
                hashed_password=get_password_hash("Auditor@1234"),
                first_name="Arthur",
                last_name="Vance",
                role="auditor",
                department="Internal Audit & Compliance",
                job_title="Senior Compliance Auditor",
                is_active=True,
                is_verified=True,
            )
            db.add(auditor_user)
            db.commit()

        # Supplier demo users
        suppliers_to_seed = [
            ("orders@techcore.com", "David", "Lee", "TechCore Industries", "Account Executive"),
            ("procurement@globalsupply.com", "Emma", "Williams", "GlobalSupply Co.", "Procurement Manager"),
            ("contracts@apexfacilities.com", "James", "Rivera", "Apex Facilities Group", "Contracts Lead")
        ]

        for s_email, s_fname, s_lname, s_dept, s_title in suppliers_to_seed:
            s_user = db.query(User).filter(User.email == s_email).first()
            if not s_user:
                s_user = User(
                    email=s_email,
                    hashed_password=get_password_hash("Supplier@1234"),
                    first_name=s_fname,
                    last_name=s_lname,
                    role="supplier",
                    department=s_dept,
                    job_title=s_title,
                    is_active=True,
                    is_verified=True,
                )
                db.add(s_user)
                db.commit()
            else:
                s_user.is_active = True
                s_user.is_verified = True
                s_user.hashed_password = get_password_hash("Supplier@1234")
                db.commit()


        # ── Suppliers ──────────────────────────────────────────────────────
        if db.query(Supplier).count() < 4:
            suppliers_data = [
                dict(supplier_code="SUP-001", company_name="TechCore Industries",
                     email="orders@techcore.com", category="it", status="active",
                     risk_level="high", overall_rating=3.8, quality_score=4.2,
                     delivery_score=3.1, price_score=3.9, total_orders=142,
                     total_spend=2450000.0, on_time_delivery_rate=72.3, risk_score=78.0,
                     city="San Francisco", country="USA", payment_terms="Net 30",
                     contact_person="David Lee", phone="+1-415-555-0101"),

                dict(supplier_code="SUP-002", company_name="GlobalSupply Co.",
                     email="procurement@globalsupply.com", category="goods", status="active",
                     risk_level="low", overall_rating=4.6, quality_score=4.7,
                     delivery_score=4.8, price_score=4.3, total_orders=287,
                     total_spend=1890000.0, on_time_delivery_rate=96.5, risk_score=18.0,
                     city="Chicago", country="USA", payment_terms="Net 45",
                     contact_person="Emma Williams", phone="+1-312-555-0202"),

                dict(supplier_code="SUP-003", company_name="Apex Facilities Group",
                     email="contracts@apexfacilities.com", category="services", status="active",
                     risk_level="medium", overall_rating=4.1, quality_score=4.0,
                     delivery_score=4.2, price_score=3.8, total_orders=98,
                     total_spend=780000.0, on_time_delivery_rate=88.0, risk_score=42.0,
                     city="New York", country="USA", payment_terms="Net 30",
                     contact_person="James Rivera", phone="+1-212-555-0303"),

                dict(supplier_code="SUP-004", company_name="MediaBrand Solutions",
                     email="billing@mediabrand.com", category="services", status="active",
                     risk_level="low", overall_rating=4.4, quality_score=4.5,
                     delivery_score=4.3, price_score=4.2, total_orders=64,
                     total_spend=420000.0, on_time_delivery_rate=93.2, risk_score=22.0,
                     city="Austin", country="USA", payment_terms="Net 15",
                     contact_person="Linda Park", phone="+1-512-555-0404"),

                dict(supplier_code="SUP-005", company_name="LogiTrans Freight",
                     email="ops@logitrans.com", category="logistics", status="active",
                     risk_level="low", overall_rating=4.3, quality_score=4.1,
                     delivery_score=4.6, price_score=4.0, total_orders=210,
                     total_spend=650000.0, on_time_delivery_rate=91.5, risk_score=25.0,
                     city="Houston", country="USA", payment_terms="Net 30",
                     contact_person="Carlos Mendez", phone="+1-713-555-0505"),
            ]
            existing_codes = {s.supplier_code for s in db.query(Supplier).all()}
            added_suppliers = []
            for sd in suppliers_data:
                if sd["supplier_code"] not in existing_codes:
                    s = Supplier(**sd)
                    db.add(s)
                    added_suppliers.append(s)
            db.commit()

        # ── Fetch users and suppliers for FK references ────────────────────
        admin = db.query(User).filter(User.email == "pranavkaushikyr@gmail.com").first()
        buyer = db.query(User).filter(User.email == "buyer@intelliprocure.ai").first()
        manager = db.query(User).filter(User.email == "manager@intelliprocure.ai").first()
        suppliers = db.query(Supplier).filter(Supplier.is_deleted == False).all()

        if not admin or not buyer or len(suppliers) < 2:
            logger.warning("Skipping PR/PO seed — missing users or suppliers")
            db.commit()
            return

        sup1, sup2, sup3 = suppliers[0], suppliers[1], suppliers[2] if len(suppliers) > 2 else suppliers[1]

        # ── Purchase Requests ──────────────────────────────────────────────
        if db.query(PurchaseRequest).count() < 5:
            prs_data = [
                dict(pr_number="PR-2024-0001", title="Enterprise Laptop Refresh Q4",
                     description="Replace aging developer laptops with M3 MacBook Pros",
                     justification="Current fleet is 4+ years old; impacting productivity",
                     status=PRStatus.APPROVED, priority=PRPriority.HIGH, category="it",
                     department="IT & Hardware", estimated_amount=185000.0,
                     currency="USD", requester_id=buyer.id, approver_id=admin.id,
                     submitted_at=_ago(45), approved_at=_ago(40)),

                dict(pr_number="PR-2024-0002", title="Office Cleaning Services Contract",
                     description="Annual cleaning services for HQ and satellite offices",
                     justification="Current contract expiring; need renewal",
                     status=PRStatus.APPROVED, priority=PRPriority.MEDIUM, category="services",
                     department="Facilities & Operations", estimated_amount=96000.0,
                     currency="USD", requester_id=buyer.id, approver_id=manager.id,
                     submitted_at=_ago(30), approved_at=_ago(25)),

                dict(pr_number="PR-2024-0003", title="Digital Marketing Campaign — Q4",
                     description="Year-end brand awareness and lead gen campaign",
                     justification="Board approved marketing budget increase",
                     status=PRStatus.SUBMITTED, priority=PRPriority.HIGH, category="marketing",
                     department="Marketing & Sales", estimated_amount=75000.0,
                     currency="USD", requester_id=buyer.id,
                     submitted_at=_ago(5)),

                dict(pr_number="PR-2024-0004", title="Warehouse Shelving Units",
                     description="Heavy-duty steel shelving for Warehouse B expansion",
                     justification="Capacity expansion project phase 2",
                     status=PRStatus.PENDING_APPROVAL, priority=PRPriority.MEDIUM, category="goods",
                     department="Logistics & Supply Chain", estimated_amount=42000.0,
                     currency="USD", requester_id=buyer.id,
                     submitted_at=_ago(2)),

                dict(pr_number="PR-2024-0005", title="Cloud Infrastructure — AWS Reserved",
                     description="1-year reserved instance commitments for cost optimization",
                     justification="Switching from on-demand saves 40% annually",
                     status=PRStatus.APPROVED, priority=PRPriority.URGENT, category="it",
                     department="IT & Hardware", estimated_amount=320000.0,
                     currency="USD", requester_id=admin.id, approver_id=admin.id,
                     submitted_at=_ago(60), approved_at=_ago(55)),

                dict(pr_number="PR-2024-0006", title="HR Software Licenses",
                     description="Workday licenses for 200 additional employees",
                     justification="Company headcount growth in Q3",
                     status=PRStatus.APPROVED, priority=PRPriority.MEDIUM, category="it",
                     department="Human Resources", estimated_amount=58000.0,
                     currency="USD", requester_id=buyer.id, approver_id=manager.id,
                     submitted_at=_ago(20), approved_at=_ago(15)),
            ]
            existing_prs = {pr.pr_number for pr in db.query(PurchaseRequest).all()}
            for prd in prs_data:
                if prd["pr_number"] not in existing_prs:
                    db.add(PurchaseRequest(**prd))
            db.commit()

        # ── Purchase Orders ────────────────────────────────────────────────
        if db.query(PurchaseOrder).count() < 4:
            pr1 = db.query(PurchaseRequest).filter(PurchaseRequest.pr_number == "PR-2024-0001").first()
            pr2 = db.query(PurchaseRequest).filter(PurchaseRequest.pr_number == "PR-2024-0002").first()
            pr5 = db.query(PurchaseRequest).filter(PurchaseRequest.pr_number == "PR-2024-0005").first()
            pr6 = db.query(PurchaseRequest).filter(PurchaseRequest.pr_number == "PR-2024-0006").first()

            pos_data = [
                dict(po_number="PO-2024-0001", title="Enterprise Laptop Refresh Q4",
                     supplier_id=sup1.id, created_by=admin.id,
                     purchase_request_id=pr1.id if pr1 else None,
                     status=POStatus.FULLY_RECEIVED,
                     subtotal=180000.0, tax_rate=8.0, tax_amount=14400.0,
                     discount_amount=9000.0, total_amount=185400.0,
                     issued_at=_ago(38), created_at=_ago(40),
                     delivery_address="123 Corporate Drive, San Francisco, CA"),

                dict(po_number="PO-2024-0002", title="Office Cleaning Annual Contract",
                     supplier_id=sup3.id, created_by=manager.id,
                     purchase_request_id=pr2.id if pr2 else None,
                     status=POStatus.ACKNOWLEDGED,
                     subtotal=96000.0, tax_rate=0.0, tax_amount=0.0,
                     discount_amount=4800.0, total_amount=91200.0,
                     issued_at=_ago(22), created_at=_ago(25),
                     delivery_address="456 Business Park, Chicago, IL"),

                dict(po_number="PO-2024-0003", title="AWS Reserved Instances — 1 Year",
                     supplier_id=sup2.id, created_by=admin.id,
                     purchase_request_id=pr5.id if pr5 else None,
                     status=POStatus.PAID,
                     subtotal=320000.0, tax_rate=0.0, tax_amount=0.0,
                     discount_amount=16000.0, total_amount=304000.0,
                     issued_at=_ago(52), created_at=_ago(55),
                     delivery_address="Cloud Deployment — No Physical Address"),

                dict(po_number="PO-2024-0004", title="Workday HR Licenses — 200 Seats",
                     supplier_id=sup2.id, created_by=manager.id,
                     purchase_request_id=pr6.id if pr6 else None,
                     status=POStatus.INVOICED,
                     subtotal=58000.0, tax_rate=8.0, tax_amount=4640.0,
                     discount_amount=2900.0, total_amount=59740.0,
                     issued_at=_ago(12), created_at=_ago(15),
                     delivery_address="Digital License — Corporate Email"),

                dict(po_number="PO-2024-0005", title="Freight Services — Q3 Logistics",
                     supplier_id=suppliers[4].id if len(suppliers) > 4 else sup2.id,
                     created_by=buyer.id,
                     status=POStatus.ISSUED,
                     subtotal=65000.0, tax_rate=0.0, tax_amount=0.0,
                     discount_amount=3250.0, total_amount=61750.0,
                     issued_at=_ago(3), created_at=_ago(5),
                     delivery_address="Warehouse B, 789 Industrial Ave, Houston, TX"),

                dict(po_number="PO-2023-0088", title="Server Hardware Upgrade",
                     supplier_id=sup1.id, created_by=admin.id,
                     status=POStatus.PAID,
                     subtotal=210000.0, tax_rate=8.0, tax_amount=16800.0,
                     discount_amount=10500.0, total_amount=216300.0,
                     issued_at=_ago(120), created_at=_ago(125),
                     delivery_address="Data Center, 321 Tech Blvd"),

                dict(po_number="PO-2023-0065", title="Annual Software Subscriptions",
                     supplier_id=sup2.id, created_by=buyer.id,
                     status=POStatus.PAID,
                     subtotal=95000.0, tax_rate=0.0, tax_amount=0.0,
                     discount_amount=4750.0, total_amount=90250.0,
                     issued_at=_ago(200), created_at=_ago(205),
                     delivery_address="Digital — No Physical Address"),

                dict(po_number="PO-2023-0042", title="Marketing Print Materials",
                     supplier_id=suppliers[3].id if len(suppliers) > 3 else sup2.id,
                     created_by=buyer.id,
                     status=POStatus.PAID,
                     subtotal=38000.0, tax_rate=8.0, tax_amount=3040.0,
                     discount_amount=1900.0, total_amount=39140.0,
                     issued_at=_ago(280), created_at=_ago(285),
                     delivery_address="Marketing Dept, 123 Corporate Drive"),
            ]
            existing_pos = {po.po_number for po in db.query(PurchaseOrder).all()}
            for pod in pos_data:
                if pod["po_number"] not in existing_pos:
                    db.add(PurchaseOrder(**pod))
            db.commit()

        # ── Invoices ───────────────────────────────────────────────────────
        if db.query(Invoice).count() < 3:
            po1 = db.query(PurchaseOrder).filter(PurchaseOrder.po_number == "PO-2024-0001").first()
            po3 = db.query(PurchaseOrder).filter(PurchaseOrder.po_number == "PO-2024-0003").first()
            po4 = db.query(PurchaseOrder).filter(PurchaseOrder.po_number == "PO-2024-0004").first()

            invoices_data = [
                dict(invoice_number="INV-2024-0001", supplier_id=sup1.id,
                     purchase_order_id=po1.id if po1 else None,
                     status=InvoiceStatus.APPROVED,
                     invoice_date=_ago(35), due_date=_ago(5),
                     subtotal=180000.0, tax_amount=14400.0, discount_amount=9000.0,
                     total_amount=185400.0, paid_amount=185400.0,
                     currency="USD", fraud_risk_score=5.0),

                dict(invoice_number="INV-2024-0002", supplier_id=sup2.id,
                     purchase_order_id=po3.id if po3 else None,
                     status=InvoiceStatus.PAID,
                     invoice_date=_ago(50), due_date=_ago(20), paid_date=_ago(22),
                     subtotal=320000.0, tax_amount=0.0, discount_amount=16000.0,
                     total_amount=304000.0, paid_amount=304000.0,
                     currency="USD", fraud_risk_score=2.0),

                dict(invoice_number="INV-2024-0003", supplier_id=sup2.id,
                     purchase_order_id=po4.id if po4 else None,
                     status=InvoiceStatus.UNDER_REVIEW,
                     invoice_date=_ago(10), due_date=_ago(days=-20),
                     subtotal=58000.0, tax_amount=4640.0, discount_amount=2900.0,
                     total_amount=59740.0, paid_amount=0.0,
                     currency="USD", fraud_risk_score=62.0,
                     fraud_flags=["amount_mismatch", "unusual_vendor"]),

                dict(invoice_number="INV-2024-0004", supplier_id=sup3.id,
                     status=InvoiceStatus.RECEIVED,
                     invoice_date=_ago(2), due_date=_ago(days=-28),
                     subtotal=91200.0, tax_amount=0.0, discount_amount=0.0,
                     total_amount=91200.0, paid_amount=0.0,
                     currency="USD", fraud_risk_score=15.0),

                dict(invoice_number="INV-2024-0005", supplier_id=sup1.id,
                     status=InvoiceStatus.MATCHED,
                     invoice_date=_ago(8), due_date=_ago(days=-22),
                     subtotal=65000.0, tax_amount=0.0, discount_amount=3250.0,
                     total_amount=61750.0, paid_amount=0.0,
                     currency="USD", fraud_risk_score=8.0),
            ]
            existing_invs = {i.invoice_number for i in db.query(Invoice).all()}
            for ivd in invoices_data:
                if ivd["invoice_number"] not in existing_invs:
                    db.add(Invoice(**ivd))
            db.commit()

        # ── Inventory ──────────────────────────────────────────────────────
        if db.query(Inventory).count() < 4:
            inventory_data = [
                dict(item_code="INV-IT-001", item_name="Dell XPS 15 Laptop",
                     category="IT Hardware", status=InventoryStatus.IN_STOCK,
                     quantity_on_hand=42, quantity_reserved=8, quantity_on_order=0,
                     reorder_point=10, reorder_quantity=20, unit_of_measure="unit",
                     unit_cost=1850.0, total_value=77700.0,
                     warehouse_location="WH-A", bin_location="A-01-03"),

                dict(item_code="INV-IT-002", item_name="USB-C Docking Station",
                     category="IT Hardware", status=InventoryStatus.LOW_STOCK,
                     quantity_on_hand=4, quantity_reserved=2, quantity_on_order=25,
                     reorder_point=10, reorder_quantity=25, unit_of_measure="unit",
                     unit_cost=320.0, total_value=1280.0,
                     warehouse_location="WH-A", bin_location="A-02-01"),

                dict(item_code="INV-OFF-001", item_name="Office Chair — Ergonomic",
                     category="Facilities", status=InventoryStatus.IN_STOCK,
                     quantity_on_hand=28, quantity_reserved=0, quantity_on_order=0,
                     reorder_point=5, reorder_quantity=15, unit_of_measure="unit",
                     unit_cost=450.0, total_value=12600.0,
                     warehouse_location="WH-B", bin_location="B-01-01"),

                dict(item_code="INV-OFF-002", item_name="A4 Copy Paper (Ream)",
                     category="Office Supplies", status=InventoryStatus.OUT_OF_STOCK,
                     quantity_on_hand=0, quantity_reserved=0, quantity_on_order=200,
                     reorder_point=50, reorder_quantity=200, unit_of_measure="ream",
                     unit_cost=6.5, total_value=0.0,
                     warehouse_location="WH-B", bin_location="B-03-02"),

                dict(item_code="INV-NET-001", item_name="Cisco Network Switch 48-Port",
                     category="IT Hardware", status=InventoryStatus.LOW_STOCK,
                     quantity_on_hand=2, quantity_reserved=1, quantity_on_order=5,
                     reorder_point=3, reorder_quantity=5, unit_of_measure="unit",
                     unit_cost=4200.0, total_value=8400.0,
                     warehouse_location="WH-A", bin_location="A-04-01"),

                dict(item_code="INV-MKT-001", item_name="Branded Promotional Kit",
                     category="Marketing", status=InventoryStatus.IN_STOCK,
                     quantity_on_hand=350, quantity_reserved=50, quantity_on_order=0,
                     reorder_point=100, reorder_quantity=500, unit_of_measure="kit",
                     unit_cost=28.0, total_value=9800.0,
                     warehouse_location="WH-C", bin_location="C-01-01"),

                dict(item_code="INV-FAC-001", item_name="Industrial Cleaning Supplies",
                     category="Facilities", status=InventoryStatus.IN_STOCK,
                     quantity_on_hand=85, quantity_reserved=0, quantity_on_order=0,
                     reorder_point=20, reorder_quantity=100, unit_of_measure="unit",
                     unit_cost=35.0, total_value=2975.0,
                     warehouse_location="WH-B", bin_location="B-02-01"),

                dict(item_code="INV-SRV-001", item_name="Dell PowerEdge R750 Server",
                     category="IT Infrastructure", status=InventoryStatus.IN_STOCK,
                     quantity_on_hand=6, quantity_reserved=2, quantity_on_order=0,
                     reorder_point=2, reorder_quantity=4, unit_of_measure="unit",
                     unit_cost=12500.0, total_value=75000.0,
                     warehouse_location="WH-A", bin_location="A-05-01"),
            ]
            existing_items = {i.item_code for i in db.query(Inventory).all()}
            for ivd in inventory_data:
                if ivd["item_code"] not in existing_items:
                    db.add(Inventory(**ivd))
            db.commit()

        # ── AI Recommendations ─────────────────────────────────────────────
        if db.query(AIRecommendation).count() < 2:
            ai_data = [
                dict(recommendation_type="cost_saving",
                     entity_type="supplier", title="Consolidate IT Suppliers — Save 18%",
                     content="AI detected 3 overlapping IT software vendors. Consolidating to 1 preferred supplier could save $38,400 annually based on volume pricing.",
                     confidence_score=88.0, is_actioned=False),

                dict(recommendation_type="early_payment",
                     entity_type="invoice", title="Early Payment Discount — TechCore INV-2024-0005",
                     content="TechCore offers 2/10 Net 30 terms. Paying INV-2024-0005 within 2 days captures a $1,235 discount.",
                     confidence_score=95.0, is_actioned=False),

                dict(recommendation_type="risk_alert",
                     entity_type="supplier", title="INV-2024-0003 Flagged for Review",
                     content="Invoice INV-2024-0003 has a 62% fraud risk score — unusual vendor patterns and amount mismatch detected. Manual review recommended before payment.",
                     confidence_score=62.0, is_actioned=False),
            ]
            for aid in ai_data:
                db.add(AIRecommendation(**aid))
            db.commit()

        # ── Budgets ────────────────────────────────────────────────────────
        from app.models.budget import Budget
        if db.query(Budget).count() < 3:
            budget_data = [
                dict(name="IT Infrastructure & Hardware FY26", department_name="Information Technology",
                     category="IT Hardware", fiscal_year="2026", allocated_amount=500000.0, spent_amount=460000.0,
                     notes="Server rack upgrades and core networking hardware. 92% Critical utilization."),

                dict(name="Enterprise Software & SaaS FY26", department_name="Information Technology",
                     category="Software", fiscal_year="2026", allocated_amount=350000.0, spent_amount=295000.0,
                     notes="ERP & Cloud AI license renewals. 84.3% Warning utilization."),

                dict(name="Corporate Logistics & Fleet FY26", department_name="Logistics & Freight",
                     category="Logistics", fiscal_year="2026", allocated_amount=250000.0, spent_amount=165000.0,
                     notes="Regional freight distribution and warehouse operations. 66% Normal utilization."),

                dict(name="Global Marketing & Events FY26", department_name="Marketing & Communications",
                     category="Marketing", fiscal_year="2026", allocated_amount=180000.0, spent_amount=175000.0,
                     notes="Annual supplier summits and digital marketing campaigns. 97.2% Critical utilization."),

                dict(name="Facilities & Office Supplies FY26", department_name="Corporate Operations",
                     category="Office Supplies", fiscal_year="2026", allocated_amount=120000.0, spent_amount=48000.0,
                     notes="General office supplies and building maintenance. 40% Normal utilization."),
            ]
        # ── Contracts ──────────────────────────────────────────────────────
        from app.models.rfq import Contract, ContractStatus, ContractType
        if db.query(Contract).count() < 4:
            from app.services.ai_service import AIPredictiveEngine
            c_defs = [
                (
                    "CNT-2026-0001", sup1.id,
                    "Global Master IT Cloud & Infrastructure Services Agreement",
                    ContractType.MASTER_SERVICE, ContractStatus.ACTIVE,
                    _ago(180), _ago(-185), 450000.0, True, 60, 1,
                    "Primary cloud supplier agreement with TechCore."
                ),
                (
                    "CNT-2026-0002", sup2.id,
                    "Enterprise Hardware Supply & On-Site Maintenance SLA",
                    ContractType.SLA, ContractStatus.ACTIVE,
                    _ago(120), _ago(-245), 280000.0, True, 45, 2,
                    "Core IT hardware agreement with GlobalSupply Co."
                ),
                (
                    "CNT-2026-0003", suppliers[4].id if len(suppliers) > 4 else sup1.id,
                    "Global Freight Forwarding & Logistics Service Framework",
                    ContractType.FRAMEWORK, ContractStatus.ACTIVE,
                    _ago(330), _ago(-35), 195000.0, False, 30, 1,
                    "Freight agreement with LogiTrans Freight. Flagged for review."
                ),
                (
                    "CNT-2026-0004", suppliers[3].id if len(suppliers) > 3 else sup2.id,
                    "Digital Brand & Marketing Consulting Agreement",
                    ContractType.PURCHASE, ContractStatus.ACTIVE,
                    _ago(90), _ago(-275), 120000.0, True, 30, 1,
                    "Marketing services with MediaBrand Solutions."
                )
            ]
            existing_contracts = {c.contract_number for c in db.query(Contract).all()}
            for num, s_id, title, ctype, st, s_dt, e_dt, val, ar, np, ver, nts in c_defs:
                if num not in existing_contracts:
                    ai_res = AIPredictiveEngine.analyze_contract_document(
                        title=title,
                        contract_type=ctype.value,
                        supplier_name="Supplier",
                        start_date=s_dt.strftime("%Y-%m-%d"),
                        end_date=e_dt.strftime("%Y-%m-%d"),
                        contract_value=val,
                        auto_renew=ar,
                        notice_period_days=np
                    )
                    c_obj = Contract(
                        contract_number=num,
                        supplier_id=s_id,
                        title=title,
                        contract_type=ctype,
                        status=st,
                        start_date=s_dt,
                        end_date=e_dt,
                        contract_value=val,
                        currency="USD",
                        auto_renew=ar,
                        notice_period_days=np,
                        current_version=ver,
                        is_deleted=False,
                        versions_history=[{
                            "version": 1,
                            "file_name": f"{num}_Agreement.txt",
                            "uploaded_at": _ago(60).isoformat(),
                            "uploaded_by": "pranavkaushikyr@gmail.com",
                            "notes": "Initial master upload"
                        }],
                        ai_summary=ai_res.get("summary"),
                        ai_risk_score=ai_res.get("ai_risk_score", 15.0),
                        ai_key_clauses=ai_res.get("extracted_clauses", {}),
                        ai_risk_assessment=ai_res.get("identified_risks", []),
                        ai_expiry_terms=ai_res.get("expiry_terms", {}),
                        notes=nts
                    )
                    db.add(c_obj)
            db.commit()

        logger.info("✅ Demo data seeded successfully")
        logger.info("   Admin: pranavkaushikyr@gmail.com / Admin@1234")
        logger.info("   Buyer: buyer@intelliprocure.ai / Buyer@1234")
        logger.info("   Manager: manager@intelliprocure.ai / Manager@1234")

    except Exception as e:
        db.rollback()
        logger.error(f"❌ Seeding failed: {e}", exc_info=True)
    finally:
        db.close()
