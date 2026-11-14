# GreenPay Civic Credits & Redemptions Policy

**Effective Date:** November 2026  
**Applicability:** Bengaluru Urban BBMP Pilot Wards (Koramangala, Indiranagar, Jayanagar, Whitefield)  
**Governance:** Independent Civic Technology Demonstration Policy  

---

## 1. Strictly Non-Monetary Nature of Green Credits

Green Credits (GP) are **civic contribution points**, awarded exclusively to households and commercial establishments for compliant source-segregation and verified waste handovers.

> **CRITICAL LEGAL NOTICE:**  
> Green Credits have **NO monetary value, NO cash equivalent, and cannot be redeemed for fiat currency (INR)**. They cannot be transferred between private bank accounts, withdrawn to digital wallets, or used as negotiable financial instruments.

Green Credits represent an explainable civic metric acknowledging citizen contribution to urban landfill diversion and circular resource recovery in Bengaluru.

---

## 2. Earning Green Credits

Credits are credited automatically to the citizen's immutable ledger following doorstep weighment certification by an authorized municipal supervisor.

### Rate Schedule (Governed by Versioned Policy)
Rates are established per kilogram of certified segregated waste and are versioned transparently:

| Waste Stream | Rate (pts / kg) | Verification Requirement |
| :--- | :---: | :--- |
| **Clean Dry Recyclables** | **10.0 GP** | Paper, cardboard, clean plastics, metals with zero wet contamination. |
| **Hazardous Household Waste** | **5.0 GP** | Sanitary waste, fluorescent tubes, battery cells safely isolated. |
| **E-Waste Items** | **25.0 GP** | Defunct electronic appliances, circuit boards, mobile accessories. |
| **Wet Organic (Compostable)** | **2.0 GP** | Kitchen food scraps, garden leaves handed over unmixed. |

*Note: Any rate schedule adjustment requires an auditable justification reason logged permanently in the municipal audit trail.*

---

## 3. Civic Redemption Catalogue

Accumulated Green Credits may be redeemed through the following authorized non-monetary civic mechanisms:

### A. Green Household Civic Certificate (100 GP)
- **Description:** Official municipal recognition certificate certifying verified household waste segregation and zero-burn sustainability practices.
- **Issuance:** Synthesized in pure Python as a high-resolution landscape PDF featuring double civic borders, citizen initials, ward name, verified Green Score tier, and a unique cryptographic serial number (`GP-CERT-2026-XXXXXXXX`).
- **Public Verification:** Embedded with a QR code linking to `https://greenpay.blr/verify-certificate/{serial}`. Anyone (resident welfare associations, landlords, civic bodies) can verify civic authenticity without authentication.
- **Data Minimisation:** In strict compliance with Section 9 of the DPDP Act 2023, public verification displays masked recipient initials only (e.g. "Aarav S.") and never exposes phone numbers, premises addresses, or electricity meter numbers.

### B. Ward Community Clean-Up Fund (50, 100, 250, 500 GP)
- **Description:** Collective civic pooling supporting local ward cleanliness drives, decentralized bio-methanization plants, and public park beautification.
- **Mechanism:** Donated points are debited from the citizen's account and credited to `wards.clean_up_fund_credits`.
- **Public Transparency:** Ward fund reserves are publicly published across all Bengaluru pilot wards (e.g. 300 GP in Malleshwaram) to encourage neighbourhood community engagement.
- **Donor Attribution:** Citizens may optionally provide a public recognition display name (e.g. "S. Rao / Malleshwaram Resident") or donate anonymously.

### C. Civic Partner Composting Vouchers (60 – 75 GP)
- **Description:** Non-monetary promotional vouchers provided by Bengaluru sustainability partners:
  - *Daily Dump Bengaluru:* 25% discount vouchers for terracotta home composting starter kits and bokashi bran dispensers.
  - *Hasiru Dala Innovators:* Complimentary vouchers for 5kg enriched organic compost bags from decentralized bio-methanization processing units.
- **Inventory & Delivery:** Single-use cryptographic voucher codes dispatched immediately upon redemption and stored in the citizen's "My Redemptions" dashboard.

---

## 4. Ledger Invariants & Integrity Constraints

All redemptions adhere to strict database and accounting constraints:

1. **Immutable Append-Only Debit Transactions:**
   - Every redemption creates a new row in `credit_transactions` with a negative credit amount (`credits_amount < 0`, e.g. `-100.0 GP`).
   - Database triggers (`BEFORE UPDATE` and `BEFORE DELETE`) prevent modifying or deleting any historical credit ledger row.
2. **Non-Negative Balance Invariant:**
   - Redemptions are rejected with HTTP 400 if `current_balance < cost`. Accounts can never fall into negative credit balances.
3. **Pending Account Safeguard (Amendment #3):**
   - Citizen accounts pending doorstep supervisor verification (`status="PENDING"`) cannot redeem credits or receive credits until confirmed at the first doorstep collection.
4. **Idempotency Protection:**
   - Client requests include a unique `idempotency_key`. Retried network calls return the original transaction record without duplicate debiting.
5. **DPDP Section 12 Anonymisation:**
   - If a citizen exercises their right to account deletion, personal PII is permanently erased while historical ledger debits and redemptions are preserved under an anonymous identifier (`anon-<UUID>`) for municipal civic accounting integrity.
