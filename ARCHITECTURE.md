# GreenPay Architecture & Technical Specification

## 1. System Overview

GreenPay is structured as a modern, decoupled monorepo providing end-to-end civic waste collection tracking and verification for the city of Bengaluru.

```
                           +----------------------------------------+
                           |  Citizen QR Card (Permanent ID / BLR)  |
                           +----------------------------------------+
                                               |
                                               v
+-------------------------------+                     +-------------------------------+
|     Citizen Web Portal        |                     |   Admin & Supervisor Portal   |
|         (@greenpay/web)       |                     |        (@greenpay/admin)      |
|    - Port: 5173               |                     |    - Port: 5174               |
|    - Citizen Dashboard        |                     |    - html5-qrcode Camera      |
|    - Green Score Simulator    |                     |    - Offline IndexedDB Queue  |
|    - Append-Only Ledger       |                     |    - Ward Analytics & Forecast|
|    - DPDP Privacy Settings    |                     |    - Tamper-Evident Audits    |
+-------------------------------+                     +-------------------------------+
         | (httpOnly cookie:                                   | (httpOnly cookie:
         |  gp_citizen_access)                                 |  gp_admin_access)
         v                                                     v
+-----------------------------------------------------------------------------+
|                               FastAPI API Gateway                           |
|                       (/api/v1/citizen, /api/v1/supervisor, /api/v1/admin)    |
|   - Double-submit CSRF verification (gp_citizen_csrf vs gp_admin_csrf)      |
|   - AES-256-GCM Meter Decryption + Blind Index HMAC Lookup                  |
|   - Production Safety Guard (refuses startup if demo passwords exist)       |
+-----------------------------------------------------------------------------+
                                       |
                   +-------------------+-------------------+
                   |                                       |
                   v                                       v
    +-----------------------------+         +-------------------------------+
    |       Database Engine       |         |       Inbucket Mailcatcher    |
    |   (SQLite / PostgreSQL)     |         |    - Port 9000 (UI)           |
    | - Append-only DB triggers   |         |    - Local transactional      |
    | - Immutable ledger rows     |         |      receipt dispatcher       |
    | - Pseudonymised DPDP audit  |         +-------------------------------+
    +-----------------------------+
```

---

## 2. Security & Tenant Isolation

### 2.1 Double-Submit CSRF Protection & Cookie Scope Separation
To ensure complete isolation between public citizens and privileged municipal personnel:
- **Citizen Portal**:
  - JWT Access Token stored in `httpOnly`, `SameSite=Lax`, `Secure` cookie named `gp_citizen_access`.
  - CSRF Token stored in readable cookie `gp_citizen_csrf` and transmitted in the `X-CSRF-Token` header on state-modifying HTTP verbs (`POST`, `PUT`, `PATCH`, `DELETE`).
- **Admin & Supervisor Portal**:
  - JWT Access Token stored in `httpOnly`, `SameSite=Lax`, `Secure` cookie named `gp_admin_access`.
  - CSRF Token stored in `gp_admin_csrf` and mirrored in `X-CSRF-Token`.
- **Cross-Scope Protection**:
  - An admin cookie is rejected on citizen endpoints.
  - A citizen token cannot perform supervisor or administrative actions.

### 2.2 PII Protection & AES-256 Blind Indexing
- Electricity meter numbers (e.g., BESCOM consumer IDs) are encrypted at rest using **AES-256-GCM** with a distinct 96-bit initialization vector (`IV`) per record.
- To allow fast lookup queries without decrypting the entire database table, a deterministic **HMAC-SHA256 blind index** (`meter_number_hash`) is computed using a secret key and stored alongside the ciphertext.

---

## 3. Field Weighment & Offline Sync Lifecycle

Field supervisors frequently operate in areas with intermittent cellular connectivity. The collection lifecycle is designed offline-first:

1. **Card Presentation**: The citizen presents their high-contrast permanent QR ID card.
2. **Scan or Manual Input**: The supervisor's camera scans the QR code using `html5-qrcode` (or enters the ID manually).
3. **Identity Binding Check (Amendment #3)**:
   - If the citizen's account status is `PENDING`, doorstep weighment entry is locked.
   - The supervisor confirms physical identity at the doorstep and taps **"Confirm Identity & Activate"** (`POST /supervisor/activate-citizen/{id}`).
4. **Weighment Logging**:
   - The supervisor inputs weights for Organic Wet, Recyclable Dry, Hazardous, and E-Waste.
   - A live credit preview calculates points based on the active reward schedule version.
5. **Offline Queue Enqueue**:
   - If offline or if the API request times out, the entry is assigned a `UUIDv4` idempotency key and stored in local `IndexedDB`.
6. **Automatic Background Sync**:
   - The browser listens for the `online` event. When reconnected, all queued items are transmitted in batch (`POST /supervisor/sync-offline`).
   - The API verifies idempotency keys to prevent double-crediting.
7. **Conflict Resolution UI (Amendment #8)**:
   - Entries rejected by the API (e.g., unknown ID, citizen account pending) are captured into a dedicated conflict store.
   - The supervisor receives an active conflict alert with options to activate the account or correct the ID.
8. **Security Wipe on Logout (Amendment #8)**:
   - When a supervisor logs out, the entire local offline queue is purged to ensure no residual civic data persists on shared field devices.

---

## 4. Explainable Statistical Engines

### 4.1 Green Score Algorithm (0–100 Scale)
The citizen's Green Score is a composite, explainable metric calculated every collection cycle:
$$\text{Green Score} = 0.50 \cdot S_{\text{segregation}} + 0.30 \cdot C_{\text{consistency}} + 0.20 \cdot V_{\text{balance}}$$
- **Segregation Ratio ($S_{\text{segregation}}$)**: Percentage of clean recyclable dry waste and e-waste relative to total waste.
- **Collection Consistency ($C_{\text{consistency}}$)**: Proportion of expected doorstep collection rounds attended in the past 60 days.
- **Volume Balance ($V_{\text{balance}}$)**: Household per-capita volume adherence compared to ward averages.

### 4.2 Rolling Z-Score Anomaly Detector
- Flags suspicious collection spikes without penalizing citizens automatically.
- **Threshold**: Standard score $|z| > 2.5$.
- **Sample Guard (Amendment #7)**: Requires at least $N \ge 5$ collections for the individual household. If $N < 5$, the model automatically falls back to the **ward baseline standard deviation**.
- **Human Review**: All flags enter the supervisor review queue (`AnomalyReviewPage`) and require manual audit notes to confirm or dismiss.

### 4.3 OLS Linear Regression Forecast
- Ordinary Least Squares linear regression model forecasting waste tonnage over 3-month horizons.
- **Data Sufficiency Rule (Amendment #7)**: Strictly requires $\ge 6$ months of historical data; returns `INSUFFICIENT_DATA` if fewer observations exist.
- **Uncertainty Quantification**: Calculates upper and lower bounds using the 95% t-distribution prediction interval based on residual standard error ($s_e$).
