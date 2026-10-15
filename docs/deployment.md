# N1 Production Deployment & Zero-Cost Infrastructure Guide

**Platform Version:** N1 1.0 (Production Verified)  
**Cost Target:** $0.00 / month (Fully verifiable on free tiers or self-hosted bare metal)  

---

## 1. System Requirements

- **Node.js:** v20.x or v22.x LTS
- **Package Manager:** `pnpm` (v9.x or higher)
- **Database:** MongoDB Community Edition v6.0+ (local instance or MongoDB Atlas M0 512MB Free Tier)
- **Reverse Proxy (Optional for Production):** Nginx, Caddy, or Cloudflare Tunnel (Zero Cost)

---

## 2. Environment Variables Configuration

Copy `.env.example` to `.env` in the project root:

```bash
cp .env.example .env
```

### Essential Production Variables

| Variable | Description | Example / Recommended Value |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment | `production` |
| `PORT` | API & WebSocket server listen port | `5000` |
| `API_URL` | Fully qualified external API base URL | `https://api.n1.dev` |
| `CLIENT_URL` | Fully qualified external web client URL | `https://n1.dev` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/n1_drop` or Atlas SRV |
| `STORAGE_DRIVER` | File storage provider (`local` or `s3`) | `local` (or `s3` for Cloudflare R2) |
| `LOCAL_STORAGE_PATH`| Path to store ephemeral file payloads | `./storage/drops` |
| `JWT_SECRET` | Secret key for signing temporary tokens | 64-character random hex (`openssl rand -hex 32`) |
| `PASSWORD_PEPPER` | Server-side entropy for password hashing | 32-character random string |
| `ADMIN_USERNAME` | Moderator username for `/admin` | `admin` |
| `ADMIN_PASSWORD_HASH`| Argon2id or bcrypt hash for moderator | `$2b$10$...` |
| `NEXT_PUBLIC_API_URL`| API URL injected into frontend build | `https://api.n1.dev` |
| `NEXT_PUBLIC_APP_URL`| Frontend URL for canonical sitemaps | `https://n1.dev` |

---

## 3. Clean Build & Startup Steps

Execute the standard monorepo production pipeline:

```bash
# 1. Install dependencies
pnpm install --frozen-lockfile

# 2. Run static validation & compilation checks
pnpm typecheck
pnpm lint

# 3. Compile production bundles
pnpm build

# 4. Start production services
# Backend API & WebSockets (Port 5000)
pnpm --filter @n1/api start

# Frontend Next.js Web App (Port 3000)
pnpm --filter @n1/web start
```

---

## 4. Zero-Cost ($0/Month) Hosting Architecture Options

### Option A: 100% Self-Hosted on Single VPS / Local Machine ($0)
- Single Linux instance (Ubuntu 22.04 LTS / Debian 12).
- MongoDB Community running locally on `localhost:27017`.
- Local disk storage `./storage/drops` partitioned with automatic TTL pruning.
- Caddy or Nginx handling automatic HTTPS certificates via Let's Encrypt.
- **Total Monthly Cost:** **$0.00** (or standard existing compute).

### Option B: Cloud Free-Tier Matrix ($0)
- **Frontend (Web):** Vercel Hobby Free Tier or Cloudflare Pages ($0/mo).
- **Backend (API & WS):** Railway Free Tier or Render Web Service ($0/mo).
- **Database:** MongoDB Atlas M0 Free Tier (512 MB storage, shared RAM, $0/mo).
- **Storage:** Cloudflare R2 (10 GB free storage, $0 egress fees, $0/mo).
- **SSL / DDoS:** Cloudflare Free Plan ($0/mo).
- **Total Monthly Cost:** **$0.00**.

---

## 5. Security & Operational Hardening Checklist

- [x] **No Secrets in Source:** Audited git repository; `.env` is gitignored and `.env.example` contains only placeholder values.
- [x] **Ephemeral Disk Quotas:** Local storage is constrained by max file size (50 MB) and max drop size (200 MB), preventing disk exhaustion attacks.
- [x] **Automated Cleanup Worker:** `ExpirationEngine` runs in a background thread every 30 seconds, automatically unlinking expired disk blocks.
- [x] **Non-Root Execution:** Node.js process runs as unprivileged user in containerized or systemd setups.
- [x] **CORS & Origin Isolation:** API restricts incoming browser origins strictly to `CLIENT_URL`.
- [x] **Brute-Force Rate Limiting:** In-memory sliding windows block password cracking on locked drops after 5 invalid attempts.
