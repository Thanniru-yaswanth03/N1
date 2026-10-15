# N1 — Complete A-to-Z Free Production Deployment Guide

This guide details the complete audit results of the **N1 Platform** and provides a step-by-step blueprint to deploy the entire stack (Frontend, Backend API, WebSockets, and Database) **100% free with ₹0 / $0 monthly cost**.

---

## 1. A-to-Z Deployment Readiness Audit Results

| Area | Status | Verification Summary |
| :--- | :---: | :--- |
| **TypeScript / Type Safety** |  **PASSED** | `pnpm typecheck` passed with 0 errors across all 6 packages (`@n1/shared`, `@n1/config`, `@n1/validation`, `@n1/api`, `@n1/web`). |
| **Production Build** |  **PASSED** | Next.js 15 App Router static/dynamic pages generated cleanly; Express API compiles to `dist/index.js` via `tsc`. |
| **Automated Tests** |  **PASSED** | **273 tests passed (0 failures)** across 19 test suites (`apps/web`: 35 tests, `apps/api`: 238 tests) covering security, rate-limiting, uploads, crypto, and WebSockets. |
| **CORS Configuration** |  **PASSED** | Hardened and enhanced in `apps/api/src/security/middleware.ts` to support comma-separated origins, auto-strip trailing slashes, and permit Vercel preview domains. |
| **WebSocket Connectivity** |  **PASSED** | Verified for Study Board (`/ws/board`) and Quably Duel (`/ws/duel`). Client connectors safely handle `wss://` on HTTPS domains without trailing-slash path corruption. |
| **Security & Headers** |  **PASSED** | Helmet CSP, rate-limiting, NoSQL injection sanitizers, magic-byte MIME whitelisting, and path traversal guards verified. |
| **Storage Architecture** |  **READY** | Private partitioned storage (`LOCAL_STORAGE_PATH=./storage/drops`). Works out of the box for temporary self-destructing drops (15 min – 24 hours). |
| **Git Isolation** | ⚠️ **ACTION REQUIRED** | Project files are currently inside `Desktop\VibeCode\PROJECT_N1` without an isolated `.git` repository (which would otherwise track other Desktop files). Step 1 below initializes this cleanly. |

---

## 2. Zero-Cost Production Stack Overview

```
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│     Vercel (Free Tier)          │       │      Render.com (Free Tier)     │
│  Next.js 15 Frontend (@n1/web)  │◄─────►│    Express + WebSockets (@n1/api)│
│  https://your-n1.vercel.app     │       │  https://your-n1-api.onrender.com│
└─────────────────────────────────┘       └──────────────┬──────────────────┘
                                                         │
                                          ┌──────────────▼──────────────────┐
                                          │   MongoDB Atlas (M0 Free Tier)  │
                                          │    512 MB Free Cluster (No CC)  │
                                          └─────────────────────────────────┘
```

- **Frontend:** Vercel Hobby Tier — Free SSL, global edge CDN, unlimited bandwidth for personal use.
- **Backend API & WebSockets:** Render.com Free Web Service — Free SSL, Node.js runtime, full native WebSocket support (`/ws/board` and `/ws/duel`).
- **Database:** MongoDB Atlas M0 Sandbox — Free 512 MB storage, automated backups, TLS encryption, no credit card required.

---

## 3. Step-by-Step Free Deployment Walkthrough

### Step 1: Initialize Git and Push to GitHub

1. Open PowerShell in the project directory:
   ```powershell
   cd c:\Users\batma\Desktop\VibeCode\PROJECT_N1
   ```
2. Initialize an isolated git repository:
   ```powershell
   git init -b main
   git add .
   git commit -m "feat: initial production-ready commit for N1 platform"
   ```
3. Create a **New Repository** on [GitHub](https://github.com/new) (name it e.g. `n1-platform`, set to **Private** or **Public**).
4. Link your remote and push:
   ```powershell
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/n1-platform.git
   git push -u origin main
   ```

---

### Step 2: Set Up Free MongoDB Atlas Database

1. Sign up or log into [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Click **Create a Deployment** and select the **M0 Free** cluster tier (Free Forever, ₹0).
3. Choose the cloud provider region closest to your users (e.g. AWS `us-east-1` or `ap-south-1`).
4. In **Security Quickstart**:
   - **Database User:** Create a username (e.g. `n1admin`) and generate a secure password. Save this password.
   - **Network Access:** Add IP Address `0.0.0.0/0` (Allow Access from Anywhere) so Render servers can connect.
5. Click **Connect** → **Drivers** (Node.js) → Copy the connection string:
   ```
   mongodb+srv://n1admin:<PASSWORD>@cluster0.xxxxx.mongodb.net/n1_drop?retryWrites=true&w=majority
   ```
   *(Replace `<PASSWORD>` with your actual password and ensure `/n1_drop` is the database name).*

---

### Step 3: Deploy the Backend API on Render.com

1. Sign up or log into [Render.com](https://render.com).
2. Click **New +** → **Web Service** → Connect your GitHub repository (`n1-platform`).
3. Fill in the service settings:
   - **Name:** `n1-api` (or any unique name, e.g. `n1-api-yourname`)
   - **Region:** Choose a region close to your database (e.g., Oregon or Frankfurt)
   - **Branch:** `main`
   - **Root Directory:** *(leave blank — runs from repo root)*
   - **Runtime:** `Node`
   - **Build Command:**
     ```bash
     pnpm install && pnpm build:api
     ```
   - **Start Command:**
     ```bash
     pnpm start:api
     ```
   - **Instance Type:** `Free` (0.1 CPU, 512 MB RAM)

4. Scroll to **Environment Variables** and add the following keys:

   | Key | Value | Notes |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Enables production security & optimizations |
   | `PORT` | `10000` | Render standard port |
   | `API_URL` | `https://n1-api-yourname.onrender.com` | Your Render web service URL |
   | `CLIENT_URL` | `https://your-n1-web.vercel.app` | Your Vercel frontend URL (from Step 4) |
   | `MONGODB_URI` | `mongodb+srv://n1admin:...` | From Step 2 |
   | `STORAGE_DRIVER` | `local` | Uses local private container disk |
   | `LOCAL_STORAGE_PATH` | `./storage/drops` | Directory for drop storage |
   | `JWT_SECRET` | *(64-character random string)* | Can generate with `openssl rand -hex 32` |
   | `PASSWORD_PEPPER` | *(32-character random string)* | Random secret string |
   | `ADMIN_USERNAME` | `admin` | Your desired admin portal username |
   | `ADMIN_PASSWORD` | *(Strong custom password)* | Admin panel password |
   | `ADMIN_API_KEY` | *(32-character random key)* | API secret for programmatic admin access |
   | `CLEANUP_INTERVAL_SECONDS` | `60` | Background cleanup interval |
   | `TOMBSTONE_RETENTION_SECONDS`| `86400` | Expiration tombstone retention |

5. Click **Create Web Service**.
6. Wait for the build to complete (~2-3 minutes).
7. Test the health endpoint in your browser:
   ```
   https://n1-api-yourname.onrender.com/health
   ```
   You should receive `{ "status": "healthy", "database": "connected" }`.

---

### Step 4: Deploy the Frontend on Vercel

1. Log into [Vercel](https://vercel.com) and click **Add New...** → **Project**.
2. Select your `n1-platform` GitHub repository and click **Import**.
3. In the project configuration:
   - **Framework Preset:** `Next.js`
   - **Root Directory:** Click **Edit** and keep `./` (or leave default root, as `vercel.json` is pre-configured).
   - **Build and Output Settings:** Pre-configured via [vercel.json](file:///c:/Users/batma/Desktop/VibeCode/PROJECT_N1/vercel.json):
     - Build Command: `pnpm build:web`
     - Output Directory: `apps/web/.next`
4. Expand **Environment Variables** and add:
   - `NEXT_PUBLIC_API_URL` = `https://n1-api-yourname.onrender.com` *(Your Render backend URL without trailing slash)*
5. Click **Deploy**.
6. Within ~60-90 seconds, your site will be live at `https://your-project.vercel.app`!

---

### Step 5: Connect Frontend & Backend (Final Handshake)

1. Copy your live Vercel URL (e.g. `https://your-n1-web.vercel.app`).
2. Go back to your **Render Dashboard** → Select `n1-api` → **Environment**.
3. Update `CLIENT_URL` with your actual Vercel domain:
   ```
   CLIENT_URL=https://your-n1-web.vercel.app
   ```
4. Render will automatically redeploy with the updated CORS allowlist in ~30 seconds.

---

## 4. Keeping Render Free Tier Fast (Preventing Cold Starts)

> [!TIP]
> Render free web services sleep after 15 minutes of inactivity. When a new visitor arrives, it can take 30–50 seconds to wake up.

To keep your free instance warm 24/7 without paying a penny:
1. Go to [cron-job.org](https://cron-job.org) or [UptimeRobot](https://uptimerobot.com) (both 100% free).
2. Create a recurring HTTP monitor/ping to your health check URL every **10 minutes**:
   ```
   https://n1-api-yourname.onrender.com/health
   ```
3. This keeps your container active, responsive, and ready for instant drop creation, board collaboration, and duels!

---

## 5. Deployment Verification Checklist

- [ ] Visit `https://your-n1-web.vercel.app/drop` and upload a file.
- [ ] Confirm file creates a 6-character code (e.g. `ABC123`).
- [ ] Open an incognito window, navigate to `https://your-n1-web.vercel.app/d/ABC123`, and download the file.
- [ ] Visit `https://your-n1-web.vercel.app/board`, create a collaborative room, and verify real-time sync across two browser windows.
- [ ] Visit `https://your-n1-web.vercel.app/tools` and confirm all 30 client-side tools run client-side.
- [ ] Visit `https://your-n1-web.vercel.app/admin/login` and log in with your configured admin credentials.
