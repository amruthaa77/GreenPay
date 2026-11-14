# GreenPay Asset & Font Inventory

All visual assets, fonts, and iconography in GreenPay are 100% self-hosted, open-source, and free of external CDN tracking.

## 1. Typography & Self-Hosted Webfonts

| Typeface | Weights | Script / Coverage | License | File Location |
| :--- | :--- | :--- | :--- | :--- |
| **Inter** | 300, 400, 500, 600, 700 | Latin, Extended Latin | SIL Open Font License (OFL) 1.1 | `apps/web/public/fonts/OFL-Inter.txt` |
| **Noto Sans Kannada** | 400, 600, 700 | Kannada Script (ಕನ್ನಡ) | SIL Open Font License (OFL) 1.1 | `apps/web/public/fonts/OFL-NotoSansKannada.txt` |
| **JetBrains Mono** | 400, 500, 700 | Monospace / Numeric data | SIL Open Font License (OFL) 1.1 | Embedded system / fallback |

---

## 2. Iconography

- **Icon Set**: Lucide Icons
- **License**: ISC License (MIT compatible)
- **Usage**: Directly imported as lightweight SVG components; zero runtime network requests.

---

## 3. Brand Identity & Vector Assets

| Asset | Format | Purpose | Location |
| :--- | :--- | :--- | :--- |
| **GreenPay Citizen Favicon** | SVG (Scalable Vector) | Citizen portal identity icon | `apps/web/public/favicon.svg` |
| **GreenPay Admin Favicon** | SVG (Scalable Vector) | Operations portal identity icon | `apps/admin/public/favicon.svg` |
| **Exploding 3D QR Card Hero** | Pure CSS 3D + SVG | Product launch landing page visual | `apps/web/src/pages/LandingPage.tsx` |

> **Pure CSS/SVG Hero (Amendment #10)**:  
> The 3D rotating and exploding QR identity card on the homepage uses pure CSS transforms (`perspective: 1200px`, `transform-style: preserve-3d`, `rotateX`, `rotateY`, `translateZ`) coupled with Framer Motion scroll triggers. No heavy 3D WebGL libraries (such as Three.js) are bundled.
