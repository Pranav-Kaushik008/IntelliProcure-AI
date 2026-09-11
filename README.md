# ⚡ IntelliProcure AI — Autonomous Enterprise Source-to-Pay (S2P) & Procurement Intelligence Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.0+-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

> **IntelliProcure AI** is an enterprise-grade, autonomous Source-to-Pay (S2P) and Procurement Intelligence platform designed to automate, de-risk, and accelerate corporate procurement workflows. It bridges the gap between ERP bloat and entry-level accounting by introducing automated 3-way invoice matching, AI legal contract clause extraction, multi-vendor RFQ comparison matrices, predictive spend forecasting, and two-stage supplier KYC governance.

---



## 🌟 Core Enterprise Modules

### 1. 📊 Executive KPI Dashboard & Real-Time Pulse
- Real-time spend velocity aggregation, savings KPIs, open tender counts, and compliance ratings.
- Interactive spend distribution (Category Donut & 12-Month Area Chart) with live notifications drawer and outside-click dismissal.

### 2. 🏢 Supplier Lifecycle & Two-Stage KYC Verification Gate
- **Two-Stage KYC Gate**: Self-registered suppliers enter a `PENDING_APPROVAL` gate and are restricted from viewing tenders until authorized by an Admin.
- **Multidimensional Vendor Scorecards**: Dynamic performance ratings across Delivery Timeliness (30%), Quality Rating (35%), Price Competitiveness (25%), and ESG Compliance (10%).

### 3. 🛒 Purchase Requisitions (PR) Workflow
- Departmental item requisitions with automated cost-center and budget impact tagging.
- Multi-tier threshold approval rules (Auto-approved under threshold, Manager approval, Finance review).

### 4. 📩 RFQ & Sourcing Management
- Structured tender creation with line-item requirements, target pricing, and live countdown timers.
- Targeted vendor invitations preventing unauthorized suppliers from accessing private bidding.

### 5. 📑 Multi-Vendor Quotation Compare Matrix
- Side-by-side bid analysis comparing unit pricing, delivery lead times, warranties, and supplier credit terms.
- **1-Click PO Conversion**: Automatically converts winning bids directly into legally binding Purchase Orders.

### 6. 📦 Purchase Orders (PO) Engine
- **Streamlined Status Lifecycle**: Clear progression across `Draft` → `Pending Approval` → `Issued` → `Acknowledged` → `Cancelled`.
- **Role-Gated Actions**:
  - **Suppliers**: Receive issued POs and click **`Acknowledge`** to confirm order acceptance.
  - **Buyers & Admins**: Full universal cancellation control with automated audit trails.

### 7. 🏬 Inventory & Warehouse Stock Management (GRN)
- Real-time stock counts, Goods Receipt Notes (GRN), and transactional Stock-In / Stock-Out tracking.
- Automated reorder point alerts and negative stock prevention safeguards.

### 8. ⚖️ Automated 3-Way Matching & Invoicing Engine
- Algorithmic reconciliation across:
  $$\text{Purchase Order (PO)} \iff \text{Goods Receipt (GRN)} \iff \text{Vendor Invoice}$$
- Tolerance checking with automated AI fraud risk indicator (0–100%) checking duplicate billings and vendor history.
- **Approve & Pay**: Finance releases electronic payments and logs cryptographic audit records.

### 9. 📜 AI Legal Intelligence & Contract Lifecycle (CLM)
- Secure agreement repository supporting PDF, DOCX, and signed text agreements.
- **6-Clause AI Legal Extractor**: Automatically extracts Payment Terms, Termination Penalties, Renewal Windows & CPI Caps, Indemnification, and SLAs.

### 10. 📈 Predictive Spend Analytics & Budget Controls
- Multi-horizon time-series forecasting (ARIMA / Holt-Winters) with 95% confidence intervals.
- Departmental budget envelope tracking with warning (<80% Normal, 80-90% Warning, >90% Critical) alerts.

### 11. 🛡️ Enterprise Governance & Cryptographic Audit Trail
- Immutable SHA-256 anchored audit ledger tracking every state change, IP address, and actor email.
- Regulatory framework monitoring for **SOX Section 404**, **GDPR Art. 30**, **ISO 27001**, and **PCI-DSS v4.0**.

### 12. 🔌 ERP Integration Readiness Dashboard
- Extensible adapter architecture supporting **SAP S/4HANA**, **Oracle ERP Cloud**, **Microsoft Dynamics 365**, and **Mock Development Sandbox**.
- 1-click **`Test Connection`** and **`Sync All Entities (PULL)`** for Suppliers, POs, Inventory, and Invoices.

### 13. ✨ Interactive AI Procurement Copilot
- Context-aware natural language procurement assistant.
- **Live 3-Step Reasoning Pulse**: Visualizes database scanning, compliance threshold checks, and executive synthesis.
- Quick prompt chips, message copying, and universal `Ctrl+K` keyboard shortcut.

---

## 👥 Role-Based Access Control (RBAC) Matrix

| Persona | Primary Focus | Access Scope |
|---|---|---|
| **Master Executive Admin** | Governance & Configuration | Full root access, KYC supplier authorization, system settings & security overrides |
| **Procurement Buyer** | Sourcing & Order Execution | PR drafting, RFQ publication, quotation comparison, PO generation & inventory stock-in |
| **Department Manager** | Operational Budget Approval | Requisition review & approval ($50k–$500k), budget monitoring & vendor reviews |
| **Finance Specialist** | Reconciliation & Payments | 3-Way matching execution, invoice verification, approval & payment disbursement |
| **Compliance Auditor** | Oversight & Risk Management | Read-only access to transaction ledgers, SOX/GDPR frameworks & SHA-256 audit logs |
| **External Supplier** | Bidding & Order Fulfilment | Dedicated portal to view invited RFQs, submit quotes, acknowledge POs & submit invoices |

---

## 🔑 Pre-Seeded Enterprise Demo Credentials

| Role | Email Address | Password |
|---|---|---|
| **Master Executive Admin** | `pranav****@gmail.com` | `****` |
| **Procurement Buyer** | `buyer@****` | `****` |
| **Department Manager** | `manager@****` | `****` |
| **Finance Specialist** | `finance@****` | `****` |
| **Compliance Auditor** | `auditor@****` | `****` |
| **Supplier (TechCore)** | `orders@****` | `****` |
| **Supplier (GlobalSupply)** | `procurement@****` | `****` |
| **Supplier (Apex Facilities)** | `contracts@****` | `****` |

---

## 💻 Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Framer Motion, Recharts, TanStack Query v5, Vanilla CSS Tokens |
| **Backend** | Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic v2, Uvicorn, Passlib (Bcrypt) |
| **Database** | PostgreSQL 16 (Neon Serverless) / SQLite (Local zero-setup development) |
| **AI / Machine Learning** | Gemini 1.5 / GPT-4o-mini + Heuristic Rule Engines |
| **Security** | OAuth2 Password Bearer, JWT Tokens (HS256), SHA-256 Audit Trail |
| **Deployment** | Render Edge Web Services + Continuous GitHub CI/CD |

---

## 🚀 Quickstart Guide (Local Development)

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** & **npm**
- **Git**

```bash
# 1. Clone the repository
git clone https://github.com/Pranav-Kaushik008/IntelliProcure-AI.git
cd IntelliProcure-AI

# 2. Setup Backend
cd backend
python -m venv venv

# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
> The API starts at `http://localhost:8000`. Swagger documentation is available at `http://localhost:8000/api/docs`.

```bash
# 3. Setup Frontend (in a new terminal)
cd frontend
npm install
npm run dev
```
> The frontend application starts at `http://localhost:5173`.

---

## 📄 License
This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author & Maintainer
**Pranav Kaushik Y R**  
- GitHub: [@Pranav-Kaushik008](https://github.com/Pranav-Kaushik008)
- Repository: [IntelliProcure-AI](https://github.com/Pranav-Kaushik008/IntelliProcure-AI)
