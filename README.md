# ⚡ IntelliProcure AI — Enterprise Autonomous Procurement & Spend Intelligence Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

> **IntelliProcure AI** is an enterprise-grade, end-to-end autonomous procurement, contract intelligence, and spend management platform designed for global supply chain operations. It streamlines the entire Procure-to-Pay (P2P) lifecycle with automated 3-way invoice matching, predictive AI demand forecasting, supplier scorecards, compliance governance, and contract risk intelligence.

---

## 🌟 Key Platform Modules & Capabilities

### 1. 🛡️ Role-Based Access Control (RBAC) & Enterprise Security
- **6 Distinct Enterprise Personas**: Master Admin, Procurement Buyer, Department Manager, Finance Approver, Compliance Auditor, and External Supplier/Vendor.
- **Strict Separation of Duties (SoD)**: Enforces governance policies so requisition creators cannot approve their own purchase orders or release invoice payments.
- **Session-Based Security**: Cryptographic JWT access tokens with automated refresh token rotation and SHA-256 immutable audit logging.

### 2. 🔄 End-to-End Procure-to-Pay (P2P) Workflow
- **Purchase Requests (PR)**: Multi-tier approval thresholds with budget impact validation and automated routing.
- **Purchase Orders (PO)**: Automated generation from approved PRs or RFQs, status lifecycles (Draft → Issued → Partially Received → Fully Received → Closed).
- **Real-Time Inventory & Goods Receipt (GRN)**: Transactional stock-in/stock-out management, warehouse allocation, reorder point alerts, and negative stock prevention.

### 3. 🎯 Sourcing, RFQ Management & Vendor Portal
- **Request for Quotation (RFQ)**: Multi-supplier bid solicitation, automated deadline enforcement, and technical evaluation.
- **Quotation Comparison Matrix**: Side-by-side bid analysis evaluating pricing, delivery lead times, warranties, and supplier credit terms.
- **Vendor Performance Scorecards**: Objective ratings across Quality, On-Time Delivery (OTD), Price Competitiveness, and AI Risk Profiling.

### 4. ⚖️ Automated 3-Way Matching & Finance Automation
- **Algorithmic Discrepancy Detection**: Automated reconciliation across **Purchase Orders**, **Goods Receipt Notes (GRN)**, and **Vendor Invoices**.
- **Tolerance Thresholds**: Configurable unit price and quantity variance checks (< 1% automated clearance, > 5% exception escalation).
- **Payment Disbursement Engine**: Secure financial approvals, dispute workflows, and audit-ready payment authorizations.

### 5. 📜 AI Legal Intelligence & Contract Lifecycle Management (CLM)
- **On-Demand Legal Agreement Generation**: Automated generation and download of structured enterprise Master Service Agreements (MSAs) and SLAs.
- **AI Clause Extraction**: Deep analysis extracting Payment Terms, Termination, Liability Indemnity, and Performance SLAs.
- **Dynamic Risk Assessment & Expiry Tracking**: Proactive 30/60/90-day contract expiration warnings and liability exposure scoring.

### 6. 📊 Predictive Analytics & Spend Intelligence
- **Spend Forecasting Engine**: Multi-horizon predictive modeling (ARIMA / Holt-Winters algorithms) with seasonal adjustments.
- **Category & Vendor Concentration**: Pareto spend analysis identifying supplier consolidation opportunities.
- **Executive Reporting**: One-click CSV and JSON exports for CFO and procurement executive briefings.

### 7. 🏛️ Governance, Risk & Budget Controls
- **Immutable Audit Trail**: Cryptographically anchored audit ledger tracking every state change, IP address, and user identity.
- **Real-Time Budget Control**: Server-side budget consumption tracking with Warning (> 80%) and Critical (> 90%) overrun safeguards.
- **Risk Mitigation Workflow (CAPA)**: Interactive compliance framework monitoring (SOX 404, GDPR, ISO 27001, FCPA) with action plans.

---

## 💻 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Framer Motion, Recharts, TanStack Query, React Icons, Axios |
| **Backend** | Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic v2, Uvicorn, Passlib (Bcrypt), Python-JOSE |
| **Database** | PostgreSQL (Production) / SQLite (Zero-setup local development fallback) |
| **Security** | OAuth2 Password Bearer, JWT (HS256), SHA-256 Audit Trail, CORS Protection |
| **Deployment** | Render (Web Service + Static Site + Managed PostgreSQL), Docker |

---

## 🚀 Quickstart Guide (Local Development)

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** & **npm**
- **Git**

---

### 1. Clone the Repository
`ash
git clone https://github.com/Pranav-Kaushik008/IntelliProcure-AI.git
cd IntelliProcure-AI
`

---

### 2. Backend Setup
`ash
# Navigate to backend directory
cd backend

# Create and activate Python virtual environment
python -m venv venv

# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
`
> The API will start at http://localhost:8000. Interactive Swagger docs are available at http://localhost:8000/api/docs.

---

### 3. Frontend Setup
`ash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
`
> Open your browser at http://localhost:5173.

---

## 🔑 Pre-Seeded Enterprise Demo Credentials

| Role | Email | Password | Access Scope |
|---|---|---|---|
| **Master Executive Admin** | pranav****@gmail.com | ****** | Full platform administration, system settings & security overrides |
| **Procurement Buyer** | buyer@***** | ***** | PR creation, RFQ issuance, PO management & vendor scoring |
| **Department Manager** | manager@**** | ***** | Requisition approval, department budget oversight & vendor reviews |
| **Financial Controller** | finance@***** | ***** | 3-Way match validation, invoice sign-off & payment release |
| **Compliance Auditor** | auditor@***** | ***** | Read-only compliance ledgers, SOX/GDPR frameworks & audit logs |
| **External Supplier** | orders@***** | ***** | RFQ bid submissions, purchase order tracking & digital invoices |

---

## 🌐 Production Deployment Guide (Render)

### 1. Backend Web Service
- **Environment**: Python 3
- **Root Directory**: backend
- **Build Command**: pip install -r requirements.txt
- **Start Command**: uvicorn app.main:app --host 0.0.0.0 --port 
- **Environment Variables**:
  - DATABASE_URL: *Your PostgreSQL connection string or sqlite:///./intelliprocure.db*
  - SECRET_KEY: your_secrete_key
  - ALLOWED_ORIGINS: *
  - PYTHON_VERSION: 3.12.2

### 2. Frontend Static Site
- **Root Directory**: frontend
- **Build Command**: 
  npm run build
- **Publish Directory**: dist
- **Environment Variables**:
  - VITE_API_URL: https://<your-backend-name>.onrender.com/api/v1
- **Redirects / Rewrites Rule**:
  - **Type**: Rewrite
  - **Source**: /*
  - **Destination**: /index.html

---

## 📂 Project Directory Structure

`
IntelliProcure-AI/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # Modular API endpoints (PRs, POs, Invoices, Contracts, Inventory, etc.)
│   │   ├── config/          # Centralized environment settings & security configs
│   │   ├── core/            # Security utilities, JWT tokens, RBAC guards & database seeder
│   │   ├── database/        # SQLAlchemy engine, session lifecycle & base mixins
│   │   ├── models/          # Relational ORM models
│   │   └── services/        # 3-Way Matching engine, AI forecasting & legal analyzers
│   ├── uploads/             # Secure contract storage directory
│   ├── requirements.txt     # Python production dependencies
│   └── start.sh             # Production startup script
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Shared layout, TopNav, Sidebar & UI widgets
│   │   ├── contexts/        # AuthProvider (RBAC & JWT interceptors), ThemeContext
│   │   ├── pages/           # 15+ Feature Pages (Dashboard, Inventory, Contracts, Compliance, etc.)
│   │   ├── utils/           # Date formatters, currency helpers & math utilities
│   │   ├── App.jsx          # Protected route definitions & QueryClientProvider
│   │   ├── main.jsx         # Vite DOM entry point
│   │   └── index.css        # Enterprise design tokens & responsive CSS rules
│   ├── index.html           # HTML5 SPA template
│   ├── package.json         # Frontend dependencies & scripts
│   └── vite.config.js       # Vite configuration with chunk splitting & proxy
│
└── README.md
`

---

## 📄 License
This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author & Maintainer
**Pranav Kaushik**  
- GitHub: [@Pranav-Kaushik008](https://github.com/Pranav-Kaushik008)
- Platform: **IntelliProcure AI Enterprise**
