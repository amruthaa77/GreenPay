# GreenPay Third-Party Dependency & Network Audit

## 1. Network Activity Audit
- **External Network Telemetry**: None. Zero external tracking scripts, Google Analytics, telemetry beacons, or third-party advertising SDKs exist in the codebase.
- **Font Delivery**: 100% self-hosted via local WOFF2/TTF assets. No Google Fonts API calls.
- **CDN Scripts**: Zero external `<script src="...">` tags. All scripts are bundled into immutable, fingerprinted chunks by Vite.

---

## 2. Python Dependencies (`apps/api`)

| Package | Version | License | Justification |
| :--- | :--- | :--- | :--- |
| `fastapi` | `>=0.115.0` | MIT | High-performance async ASGI web framework |
| `uvicorn` | `>=0.32.0` | BSD-3-Clause | ASGI production web server |
| `sqlalchemy` | `>=2.0.36` | MIT | SQL ORM & query builder |
| `pydantic` | `>=2.9.2` | MIT | Strict schema parsing and data validation |
| `pydantic-settings`| `>=2.6.0` | MIT | Environment variable configuration loader |
| `python-jose` | `>=3.3.0` | MIT | Cryptographic JWT token generation & verification |
| `passlib` | `>=1.7.4` | BSD | Password hashing abstraction |
| `bcrypt` | `>=4.2.0` | Apache-2.0 | Blowfish-based password hashing |
| `pycryptodome` | `>=3.21.0` | Public Domain / BSD | AES-256-GCM authenticated encryption |
| `numpy` | `>=2.1.2` | BSD-3-Clause | Vectorized OLS regression & z-score calculations |
| `email-validator`| `>=2.0.0` | CC0-1.0 | Robust RFC 5322 email syntax validation |
| `python-multipart`| `>=0.0.12` | Apache-2.0 | Form data and multipart payload parsing |
| `slowapi` | `>=0.1.9` | MIT | Rate limiting and IP brute-force protection |

---

## 3. Node.js Dependencies (`apps/web` & `apps/admin`)

| Package | Version | License | Justification |
| :--- | :--- | :--- | :--- |
| `react` | `^18.3.1` | MIT | Declarative UI component library |
| `react-dom` | `^18.3.1` | MIT | React DOM renderer |
| `framer-motion` | `^11.11.17`| MIT | Accessible 60fps animations & CSS 3D transforms |
| `lucide-react` | `^0.460.0` | ISC | Accessible SVG iconography components |
| `qrcode` | `^1.5.4` | MIT | Client-side QR code generator for citizen cards |
| `html5-qrcode` | `^2.3.8` | Apache-2.0 | Client-side camera QR code scanner |
| `recharts` | `^2.13.3` | MIT | Accessible SVG charts (Bar, Pie, Composed) |
| `clsx` | `^2.1.1` | MIT | Utility for constructing conditional class names |
| `tailwind-merge`| `^2.5.4` | MIT | Conflict-free Tailwind CSS utility merger |
| `tailwindcss` | `^3.4.15` | MIT | Utility-first CSS styling engine |
| `vite` | `^5.4.11` | MIT | Next-generation frontend bundler |
| `typescript` | `^5.6.3` | Apache-2.0 | Static type checker |
| `tsx` | `^4.19.2` | MIT | Direct TypeScript execution for tests & validators |
