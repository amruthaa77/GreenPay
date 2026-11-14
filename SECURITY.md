# GreenPay Threat Model & Security Architecture

## 1. Threat Model & Mitigations

| Threat | Risk Level | Mitigation Strategy |
| :--- | :--- | :--- |
| **Unauthorized Credit Ledger Tampering** | Critical | Physical SQLite & PostgreSQL database triggers prohibit `UPDATE` and `DELETE` on `credit_transactions`. Corrections require auditable reversal rows. |
| **Citizen & Admin Cross-Session Leakage** | High | Cookie scopes are physically segregated (`gp_citizen_access` / `gp_citizen_csrf` vs `gp_admin_access` / `gp_admin_csrf`). Citizen tokens are rejected on admin routes and vice-versa. |
| **Cross-Site Request Forgery (CSRF)** | High | Double-submit CSRF tokens required on all mutating verbs (`POST`, `PUT`, `PATCH`, `DELETE`). The cookie value must match the `X-CSRF-Token` HTTP header. |
| **Meter Number PII Harvesting** | High | Electricity meter numbers are encrypted at rest using AES-256-GCM. Lookups use HMAC-SHA256 blind indices. Raw numbers are never exposed in logs or UI. |
| **Offline Sync Replay Attacks** | Medium | Every weighment entry receives a client-generated UUIDv4 idempotency key. Duplicate submissions return the existing receipt without double-crediting. |
| **Production Default Credentials** | Critical | In `ENV=production`, the application refuses to boot if default secrets or development seed accounts are present (Amendment #11). |

---

## 2. Cryptographic Implementation Details

### 2.1 Meter Encryption & Blind Indexing
```python
# AES-256-GCM Encryption
# 96-bit (12-byte) initialization vector per record
cipher = AES.new(aes_key, AES.MODE_GCM, nonce=nonce)
ciphertext, tag = cipher.encrypt_and_digest(plaintext.encode("utf-8"))
stored_blob = base64.b64encode(nonce + tag + ciphertext).decode("utf-8")

# Blind Index via HMAC-SHA256
meter_hash = hmac.new(hmac_key, plaintext.strip().upper().encode("utf-8"), hashlib.sha256).hexdigest()
```

### 2.2 Production Safety Guard (Amendment #11)
When `ENV=production` is set in the environment:
1. Validates that `SECRET_KEY`, `ENCRYPTION_KEY`, and `HMAC_SECRET` are not using known development default strings.
2. Checks database for demo admin accounts (`admin@greenpay.blr`) using default passwords. If found, startup aborts with code 1.

---

## 3. HTTP Security Headers
Every HTTP response returned by FastAPI includes the following protective headers:
- `X-Frame-Options: DENY` (prevents clickjacking)
- `X-Content-Type-Options: nosniff` (prevents MIME type sniffing)
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http://localhost:*`
