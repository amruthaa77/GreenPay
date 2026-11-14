# Legal Review Notice & Statutory Compliance Memorandum

> **STATUS: DRAFT — PENDING FORMAL EXTERNAL LEGAL COUNSEL REVIEW**  
> *This document provides an engineering-level compliance assessment and architectural intent memorandum. It does not constitute formal legal advice. A licensed advocate or legal practitioner in the state of Karnataka must review and approve these disclosures prior to any public deployment.*

---

## 1. Municipal Independence & Trademark Disclaimers

### 1.1 Factual Independence
GreenPay is an independent prototype technology application designed for transparent civic waste tracking in Bengaluru. It is **not** an official municipal utility, is not contracted with the Bruhat Bengaluru Mahanagara Palike (BBMP), and is not affiliated with the Greater Bengaluru Authority (GBA).

### 1.2 Placement of Disclaimers
In compliance with consumer protection standards and to prevent citizen confusion:
1. **Persistent Site Footer**: Displays an explicit, unclosable declaration across all public citizen pages.
2. **About & Governance Page**: Features a dedicated banner detailing the non-governmental status of the prototype.
3. **Wards Demonstration Page**: Clearly labels all ward tonnage datasets as simulated demo data.

---

## 2. Non-Monetary Points Model & RBI Regulatory Exemption

### 2.1 Characterization of "Green Credits"
Green Credits issued by the platform are strictly civic recognition points. They are:
- **Non-Monetary**: They carry no monetary denomination, interest, or cash surrender value.
- **Non-Redeemable for Cash**: Points cannot be withdrawn, exchanged for Indian Rupees (INR), or converted to currency.
- **Non-Transferable**: Points cannot be transferred from one household or electricity meter to another.
- **No Payment Processing**: The platform contains no payment gateway, wallet infrastructure, or deposit mechanism.

### 2.2 Reserve Bank of India (RBI) PPI Guidelines
Under the *RBI Master Directions on Issuance and Operation of Prepaid Payment Instruments (PPIs)*, loyalty points and closed recognition units that cannot be used for purchasing third-party goods/services or withdrawn in cash fall outside the scope of regulated PPI licensing.

---

## 3. Compliance with Digital Personal Data Protection (DPDP) Act, 2023

| Statutory Provision | Requirement | GreenPay Engineering Implementation |
| :--- | :--- | :--- |
| **Section 6** (Consent Architecture) | Consent must be free, specific, informed, unconditional, and unambiguous. | Registration requires unbundled checkboxes. Consents are logged with timestamp, version, and client IP in `consent_records`. |
| **Section 9** (Protection of Children) | Absolute prohibition on processing personal data of individuals under 18 years. | Minors under 18 are blocked at registration with an explicit statutory guidance notice. |
| **Section 11** (Right to Data Portability) | Data fiduciaries must provide a machine-readable summary of personal data. | Self-serve "Export All My Data (JSON)" button in Citizen Settings downloading all personal records and collection receipts. |
| **Section 12** (Right to Erasure) | Data fiduciaries must erase personal data upon withdrawal of consent. | Self-serve account erasure with double confirmation ("DELETE MY ACCOUNT"). All PII (name, meter, phone, email) is wiped; ledger rows preserved under pseudonymous ID `ANON-<UUID>`. |
| **Section 13** (Grievance Redressal) | Accessible mechanism for citizens to lodge complaints with a DPO. | Dedicated contact page and DPO inquiry routing to `privacy@greenpay.org.in`. |
