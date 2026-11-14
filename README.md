# GreenPay Bengaluru 🌿

> **"Waste responsibly. Track transparently. Earn sustainably."**

GreenPay is an independent civic software prototype designed for transparent household waste collection tracking and explainable civic rewards in Bengaluru. Authorized municipal supervisors verify doorstep segregation (weight by category) via calibrated digital scales after scanning a citizen's permanent QR ID card. Verified collections earn citizens **"Green Credits"** (non-monetary civic recognition points, NOT money, NOT a wallet) and feed an explainable **0–100 Green Score**.

---

## ⚠️ Important Legal Declaration: Municipal Independence

> **MUNICIPAL NON-AFFILIATION NOTICE:**  
> GreenPay is an independent prototype technology initiative developed for civic accountability and municipal transparency. **It is NOT affiliated with, endorsed by, operated by, or contracted with the Bruhat Bengaluru Mahanagara Palike (BBMP) or the Greater Bengaluru Authority (GBA).** All ward boundaries, names, and statistical datasets displayed are pilot demonstration data and do not represent official municipal records.

---

## 🚀 3-Command Developer Quickstart

Get GreenPay up and running in under 2 minutes:

```bash
# 1. Install all dependencies (Node workspaces & Python FastAPI)
make setup

# 2. Run the automated test suite (Pytest + Contrast + Validator)
make test

# 3. Build all production bundles
make build
```

To run individual development services:
```bash
# Backend API (FastAPI)
cd apps/api && python -m uvicorn app.main:app --reload --port 8000

# Citizen Web Portal (Vite React - Port 5173)
npm run dev:web

# Admin & Supervisor Portal (Vite React - Port 5174)
npm run dev:admin
```

---

## 🔑 Demo Login Credentials (Development Only)

All accounts are pre-seeded with 12 months of realistic collection history:

| Role | Username / Identifier | Password | Access Portal |
| :--- | :--- | :--- | :--- |
| **Super Administrator** | `admin@greenpay.blr` | `AdminSecure2026!` | `http://localhost:5174/` |
| **Field Supervisor (Koramangala)** | `supervisor.koramangala@greenpay.blr` | `AdminSecure2026!` | `http://localhost:5174/` |
| **Field Supervisor (Indiranagar)** | `supervisor.indiranagar@greenpay.blr` | `AdminSecure2026!` | `http://localhost:5174/` |
| **Citizen (Active - Koramangala)** | `BES-0010-4921` (or `citizen1@example.com`) | `Password123!` | `http://localhost:5173/login` |
| **Citizen (Pending Verification)** | `BES-0012-9999` (or `pending@example.com`) | `Password123!` | `http://localhost:5173/login` |

---

## 🏛️ Monorepo Architecture

```
GREENPAY/
├── apps/
│   ├── api/             # FastAPI backend (Python 3.10+, SQLAlchemy 2, Pydantic v2)
│   ├── web/             # Citizen portal (React 18, Tailwind, Framer Motion, Recharts)
│   └── admin/           # Supervisor & Admin portal (html5-qrcode, IndexedDB offline queue)
├── packages/
│   ├── config/          # Strict business entity config & validation rules
│   └── tokens/          # Design tokens with WCAG 2.2 AA contrast tests
├── docs/
│   └── LEGAL_REVIEW.md  # Legal disclaimers & statutory compliance notices
├── docker-compose.yml   # Multi-container orchestration (API, Web, Admin, Postgres, Mail)
├── Makefile             # Standard developer automation commands
└── .github/workflows/   # CI matrix for SQLite, Postgres triggers, and builds
```

---

## 🌟 Core Highlights & Architectural Guarantees

1. **Dual-Engine Append-Only DB Triggers**:
   Database-level triggers physically block any `UPDATE` or `DELETE` on `credit_transactions` across both **SQLite** and **PostgreSQL**.
2. **DPDP Act 2023 Compliance & Pseudonymisation**:
   Electricity meters are encrypted with AES-256-GCM. When an account is deleted, PII is permanently scrubbed, while immutable credit ledger rows are preserved under a random pseudonym (`ANON-<UUID>`).
3. **Identity Binding & Pending Status**:
   New citizen registrations remain in `PENDING` state until physically confirmed by a supervisor at the doorstep. The system prevents issuing credits to pending accounts.
4. **Offline-First Field Weighments with Idempotency**:
   Supervisors can record weighments without internet connectivity. Entries are queued locally with UUIDv4 idempotency keys and synchronized when online, complete with a conflict-resolution UI.
5. **Statistical Anomaly Detection & OLS Forecasting**:
   Rolling z-score anomaly review with minimum sample $N \ge 5$ and ward fallback. OLS linear regression forecast with 95% prediction intervals (requires $\ge 6$ months history).
6. **Pure CSS/SVG Hero**:
   Interactive exploding 3D card effect built with pure CSS 3D transforms (`rotateX`, `rotateY`, `translateZ`) and SVG, without heavy WebGL engines.
