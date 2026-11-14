# Indian SMS Gateway & DLT Registration Guide

In compliance with the Telecom Regulatory Authority of India (TRAI) mandate under the Telecom Commercial Communications Customer Preference Regulations (TCCCPR, 2018), any production SMS transmission in India (such as OTP verification or transaction notices) requires registration on a Distributed Ledger Technology (DLT) platform.

---

## 1. Enterprise Registration
Before sending SMS messages to Indian numbers (+91), GreenPay or its deploying entity must register as a Principal Entity (PE) on any TRAI-approved telecom operator DLT portal (e.g. Jio DLT, Airtel DLT, Vodafone Idea DLT, or BSNL DLT).

Required documentation:
- Company PAN & Certificate of Incorporation (CIN).
- Authorized signatory government ID (Aadhaar / Passport).
- Registered business address proof.

---

## 2. Header (Sender ID) Registration
- **Category**: Service Implicit (Transactional) for OTP and collection receipts.
- **Header Format**: 6-character alphabetic header (e.g., `GRNPAY` or `GNPAYB`).
- Headers must directly match the registered entity branding or acronym.

---

## 3. Template Registration & Variable Mapping
Every message format must be approved on the DLT portal before dispatch. Messages deviating from the registered template are dropped by telecom telcos.

### Approved Template 1: Phone OTP Verification (Service Implicit)
- **Template Name**: `GreenPay_Phone_OTP`
- **DLT Content**:
  > `Your GreenPay verification code is {#var#} for your household waste account. Valid for 5 minutes. Do not share this OTP with anyone.`
- **Mapped Variables**: `{#var#}` = 6-digit numeric OTP.

### Approved Template 2: Doorstep Collection Receipt (Service Implicit)
- **Template Name**: `GreenPay_Collection_Receipt`
- **DLT Content**:
  > `GreenPay: Verified collection of {#var#} kg recorded at your doorstep. +{#var#} Green Credits earned. View ledger at greenpay.blr`
- **Mapped Variables**: Total Weight (kg), Credits Awarded.

---

## 4. Development vs Production Behavior in GreenPay

- **Development (`ENV=development`)**:
  - GreenPay utilizes the `ConsoleSMSAdapter` ([apps/api/app/adapters/sms_adapter.py](file:///c:/projects/GREENPAY/apps/api/app/adapters/sms_adapter.py)).
  - Generated 6-digit OTPs are printed to the server terminal logger only.
  - API responses never leak the plain-text OTP.
  - Zero external third-party network requests are made.

- **Production (`ENV=production`)**:
  - Requires setting:
    ```env
    ENABLE_PRODUCTION_SMS=true
    SMS_GATEWAY_URL=https://api.your-dlt-gateway.com/v1/sms
    SMS_ENTITY_ID=1201159XXXXXXXXX
    SMS_HEADER=GRNPAY
    SMS_API_KEY=your_production_dlt_api_key
    ```
  - When enabled, `ProductionSMSAdapterSlot` formats the payload with the approved Template ID and dispatches via HTTPS to the telecom aggregator.
