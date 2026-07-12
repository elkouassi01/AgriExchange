# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AgriExchange (deployed as **vivrimarket.com**) is a marketplace connecting farmers (agriculteurs) to buyers (consommateurs) in West Africa. Users pay via CinetPay (XOF currency). Real-time messaging is built on Socket.IO.

## Repository Structure

```
AgriExchange/
├── package.json          # Backend root — scripts run from here
├── server/               # Node.js + Express API (port 5000)
│   ├── server.js         # Entry point: Express, Socket.IO, DB connect
│   ├── config/           # mysql.js, db.js, postgres.js, upload.js
│   ├── routes/           # All routes under /api/v1/
│   ├── controllers/      # Business logic
│   ├── repositories/     # mysql*.js (active DB layer)
│   ├── middlewares/      # auth.js (JWT), accessMiddleware.js, errorHandler.js
│   ├── utils/            # emailService, paymentService, providers/ (cinetpay, cinetpay_legacy...), dbMigrations.js
│   └── scripts/          # initMysql.js, migrate-to-mysql.js
└── client/               # React 19 + Vite frontend
    ├── src/
    │   ├── App.jsx        # Router + ProtectedRoute by role
    │   ├── config/api.js  # API URL auto-detection (local vs prod)
    │   ├── contexts/      # UserContext.jsx (auth session), SocketContext.jsx
    │   ├── components/    # Pages + UI components (flat structure)
    │   ├── pages/admin/   # Admin-only pages
    │   └── services/      # axiosConfig.js (withCredentials: true)
    └── dist/              # Production build (deployed to VPS)
```

## Commands

### Backend (run from repo root `AgriExchange/`)
```bash
npm run dev          # Start with nodemon (development)
npm start            # Start without nodemon (production)
npm run db:mysql:init     # Create MySQL tables from scratch
npm run db:mysql:migrate  # Migrate data to MySQL
```

### Frontend (run from `AgriExchange/client/`)
```bash
npm run dev      # Vite dev server on http://localhost:5173
npm run build    # Production build → client/dist/
npm run lint     # ESLint
npm run preview  # Preview production build locally
```

### Deploy to production
```bash
# From client/ — build then upload to VPS
npm run build
scp -r dist/* root@31.207.37.95:/var/www/agriexchange/client/dist/

# On VPS — restart backend
pm2 restart agriexchange-api
```

## Architecture

### Database
`DATABASE_PROVIDER` env var controls the active DB. Currently **MySQL** in production. The repository layer (`server/repositories/mysql*.js`) abstracts all queries. On every startup, `server/utils/dbMigrations.js` runs `ALTER TABLE` to add any missing columns — new columns must be registered there instead of modifying `initMysql.js`.

### Authentication
Dual-token: httpOnly cookie (set by server) + JWT stored in `localStorage`. `UserContext` calls `GET /api/v1/auth/me` on startup to restore session. Axios (`axiosConfig.js`) sends `withCredentials: true` on every request. A global 401 interceptor in `UserContext` clears the session automatically.

Three roles: `agriculteur`, `consommateur`, `admin`. `ProtectedRoute` in `App.jsx` enforces role-based access.

### API URL Resolution (`client/src/config/api.js`)
- Local browser (localhost): uses `/api/v1` (relative, proxied by Vite)
- Production: uses `VITE_API_BASE_URL` env var, or falls back to `/api/v1` (works because Nginx proxies `/api/` to port 5000)

### Payment Flow
CinetPay v1 handles payments via the official `cinetpay-js` SDK, called **server-side only** (no API credentials in the browser). Three checkout entry points — subscription (`server/routes/paiement.js`), seller-contact unlock (`server/routes/productPayments.js`), product sponsoring (`server/routes/products.js`) — all call `server/utils/paymentService.js`, which dispatches to the active provider adapter under `server/utils/providers/` (`cinetpay.js` by default). The active provider is whichever of `cinetpay` / `cinetpay_legacy` is toggled on in the admin "Moyens de paiement" tab (table `payment_providers`); `paydunya`/`stripe` adapters exist but can't be activated for checkout — no webhook receiver exists for their payload format yet.

Each initiated transaction is recorded in `payment_transactions` (`server/utils/paymentTransactions.js`) mapping `transaction_id → provider_id`, so the corresponding webhook/status-check always re-verifies against the correct provider even if the admin switches providers later. Webhooks (`POST /api/v1/cinetpay-notify`, `POST /api/v1/product-payments/webhook`, `POST /api/v1/products/sponsor/webhook`) never trust the incoming payload — they always call `paymentService.checkPayment()` to re-verify status with CinetPay before crediting anything.

Provider credentials: enter them via the admin UI (stored in `payment_providers.config`), or set `CINETPAY_APIKEY` / `CINETPAY_API_PASSWORD` / `CINETPAY_COUNTRY` / `CINETPAY_ENV` env vars, which `providers/cinetpay.js` falls back to when no DB config is set.

### Image Storage
Cloudinary (configured via `CLD_CLOUD`, `CLD_KEY`, `CLD_SECRET`) or local `server/uploads/`. `buildUploadUrl()` in `config/api.js` resolves both.

### Real-time Messaging
Socket.IO server on the same HTTP server. Auth via JWT in `socket.handshake.auth.token`. Each user joins a personal room (their userId). Events: `send_message`, `new_message`, `mark_read`.

## Production Environment

- **VPS**: LWS hosting, IP `31.207.37.95`
- **App path**: `/var/www/agriexchange/`
- **Process manager**: PM2, process name `agriexchange-api`
- **Web server**: Nginx — serves `client/dist/` for `/*`, proxies `/api/` and `/uploads/` to `localhost:5000`
- **SSL**: Let's Encrypt via Certbot, expires 2026-08-23, auto-renews
- **Domain**: vivrimarket.com and www.vivrimarket.com

## Key Business Rules

- Farmer subscription promo (free inscription) active until `2026-12-31` — controlled by `PROMO_FIN_AGRICULTEUR` in `client/src/config/constants.js`
- Accessing seller contact details costs 150 XOF (consumer) or 300 XOF (visitor) — `PRICE_CONSUMER` / `PRICE_VISITOR` in `constants.js`, must match `server/routes/productPayments.js`
- Rate limiting: 100 requests per 15 min in production (applied to `/api/` only)
- WhatsApp notifications disabled by default (`WHATSAPP_ENABLED=false`)
