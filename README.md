# ⚡ N1 — Privacy-First Temporary Sharing & Anonymous Productivity Platform

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=for-the-badge&logo=typescript)
![Next.js](https://img.shields.io/badge/Next.js-15.2-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19.0-61dafb?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-22-green?style=for-the-badge&logo=node.js)
![Express](https://img.shields.io/badge/Express-4.21-lightgrey?style=for-the-badge&logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-M0_Free-brightgreen?style=for-the-badge&logo=mongodb)
![Tests](https://img.shields.io/badge/Tests-273_Passed-success?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-purple?style=for-the-badge)

<p align="center">
  <strong>Zero Accounts. Zero Tracking. Zero Permanent Retention. ₹0 Budget Guaranteed.</strong><br>
  A production-grade, privacy-first ecosystem combining ephemeral file & text exchange, real-time collaborative whiteboards, competitive technical duels, and 30+ client-side developer utilities.
</p>

</div>

---

## 🌟 Table of Contents

- [1. Project Philosophy & Architecture](#1-project-philosophy--architecture)
- [2. Comprehensive Feature Breakdown](#2-comprehensive-feature-breakdown)
  - [📦 Feature 1: The Drop Engine](#-feature-1-the-drop-engine-ephemeral-sharing)
  - [🎨 Feature 2: Study Board](#-feature-2-study-board-real-time-collaboration)
  - [⚔️ Feature 3: Quably Duel](#️-feature-3-quably-duel-real-time-1v1-arena)
  - [🛠️ Feature 4: Developer & Productivity Toolbox](#️-feature-4-developer--productivity-toolbox-30-tools)
  - [🛡️ Feature 5: Admin & Moderation Portal](#️-feature-5-admin--moderation-portal)
  - [🔒 Feature 6: Deep Defense Security Architecture](#-feature-6-deep-defense-security-architecture)
- [3. Technology Stack](#3-technology-stack)
- [4. Monorepo Structure](#4-monorepo-structure)
- [5. Getting Started (Local Development)](#5-getting-started-local-development)
- [6. Running Automated Tests](#6-running-automated-tests)
- [7. Zero-Cost Free Production Deployment Guide](#7-zero-cost-free-production-deployment-guide)
- [8. Documentation Index](#8-documentation-index)
- [9. License](#9-license)

---

## 1. Project Philosophy & Architecture

Modern cloud tools require mandatory user registrations, harvest tracking cookies, index private documents, retain uploads indefinitely, and charge hefty recurring subscriptions.

**N1 reverses this model completely:**

- **Zero Accounts:** No email, no phone numbers, no Google OAuth, and no tracking cookies.
- **Zero Permanent Retention:** Every single piece of content has a strict, hard expiration timer (15 minutes to 7 days). Once expired, files and metadata are permanently wiped from disk and database by the automated expiration engine.
- **Strict ₹0 Budget Guarantee:** Built to run 100% free locally or on cloud free-tiers (Vercel Hobby, Render Web Services, MongoDB Atlas M0). No paid APIs, no external SaaS dependencies.
- **Zero Client Overhead:** Tools run locally in the browser utilizing modern Web APIs (Web Workers, Canvas, Web Crypto) without transmitting user data to any server.

---

## 2. Comprehensive Feature Breakdown

### 📦 Feature 1: The Drop Engine (Ephemeral Sharing)

The flagship temporary sharing engine built for maximum privacy and zero data footprint.

- **Dual Exchange Modes:**
  - **File Mode:** Upload up to 10 files per drop (up to 50 MB per file, 200 MB aggregate per drop) with real-time percentage progress indicators.
  - **Text Mode:** Share sensitive text, code snippets, credentials, or notes (up to 10,000 characters) with syntax formatting and one-click copy.
- **Lifecycle Presets & Expiry Timers:**
  - Choose lifespan durations: `15 Minutes`, `1 Hour`, `6 Hours`, `24 Hours`, or `7 Days`.
  - Second-by-second live countdown timer on both creator and recipient views.
- **Short 6-Character Identifiers:**
  - Clean alphanumeric uppercase codes (e.g. `MGS538`, `KL93Z1`) generated with collision detection for quick manual sharing and direct URL routing (`/d/{CODE}`).
- **Cryptographic Owner Deletion Tokens:**
  - Creators receive a private cryptographic deletion token upon creation.
  - Allows the creator to purge the Drop immediately from any device before the scheduled expiration time.
- **Burn-After-Reading:**
  - Optional self-destruct mode: automatically purges the Drop and all associated files from both disk and database immediately after the recipient's first successful view.
- **Optional Password Protection:**
  - Client-side pre-validation + server-side Bcrypt cryptographic hashing.
  - Unlocked drops issue an isolated, time-limited JWT session token (`x-unlock-token`) to prevent unauthorized file direct downloads.
- **Streamed Multi-File ZIP Downloads:**
  - Recipients can download files individually or trigger an on-the-fly streaming multi-file `.zip` archive generated in memory via Node.js streams without server disk bloat.
- **Scan-to-Mobile QR Codes:**
  - Instant high-contrast QR codes rendered on success and view pages for seamless mobile transfer.
- **File Integrity & Checksums:**
  - SHA-256 binary checksums calculated on upload and verified on retrieval.

---

### 🎨 Feature 2: Study Board (Real-Time Collaboration)

A low-latency, anonymous collaborative whiteboard powered by persistent WebSockets (`/ws/board`).

- **Room Generation & Sharing:**
  - Create instant collaboration rooms with 6-character room codes (`/board/{CODE}`).
  - Zero signup: users are automatically assigned whimsical anonymous animal handles (e.g., *Anonymous Falcon*, *Anonymous Lynx*) with randomized high-visibility cursor colors.
- **Live Multiplayer Synchronization:**
  - Real-time cursor coordinates broadcast across all connected peers.
  - Concurrent element creation, modification, movement, and deletion with instant WebSocket state broadcasting.
- **Extensive Drawing & Geometry Tools:**
  - Freehand Pen with smooth stroke rendering and customizable line weights.
  - Rectangles, Circles, Ellipses, Arrows, and Connection Lines.
  - Rich Text notes, Sticky Notes, and Element Eraser.
- **Template Presets:**
  - **Blank Canvas:** Clean grid workspace for freeform diagramming.
  - **Computer Science:** Data structures, binary tree stubs, architecture flowcharts, and system blocks.
  - **Mathematics:** Coordinate plane axes, function plots, and geometric reference grids.
  - **Flowcharts:** Pre-built decision diamonds, process blocks, and terminal nodes.
- **Export & Persistence:**
  - Export canvas directly to **PNG Image**, **SVG Vector**, or **JSON Element Data**.
  - Automatic snapshot persistence in MongoDB with automatic room expiration after 24 hours.

---

### ⚔️ Feature 3: Quably Duel (Real-Time 1v1 Arena)

A fast-paced, real-time 1v1 technical competition arena built over WebSockets (`/ws/duel`).

- **Peer Matchmaking:**
  - Join a global matchmaking queue or create a private room code for direct peer invites.
  - Instant opponent pairing with 3-second synchronized pre-round countdown.
- **Authoritative Game State Engine:**
  - Synchronized 60-second game clock managed authoritatively on the backend server to eliminate client-side tampering.
  - Real-time opponent progress bars and score updates streamed live via WebSockets.
- **Dynamic Question Pool:**
  - Multiple-choice questions categorized across **Computer Science**, **Algorithms**, **Web Fundamentals**, and **Logic Puzzles**.
  - Dynamic scoring algorithm: speed bonus points reward rapid correct answers.
- **Match Lifecycle & Reconnection:**
  - Handles sudden peer disconnections with a 15-second grace period notification before declaring a forfeit.
  - End-game victory screen with detailed question breakdown, score comparison, and instant Rematch request flow.

---

### 🛠️ Feature 4: Developer & Productivity Toolbox (30+ Tools)

A complete suite of 30+ client-side productivity utilities located at `/tools`. **100% runs inside the browser with zero server transmission.**

| Category | Tools Included |
| :--- | :--- |
| **Data & Code** | JSON Formatter & Minifier, JSON to YAML/CSV, Base64 String & File Encoder/Decoder, URL Encoder/Decoder, JWT Decoder & Inspector, HTML Entity Encoder, CSS Minifier, SQL Formatter |
| **Text & Content** | Regex Tester & Debugger, Markdown Live Previewer & HTML Exporter, Word & Character Counter, Text Diff & Comparison Tool, Slug Generator, Case Converter (camelCase, snake_case, PascalCase, kebab-case) |
| **Cryptography** | Hash Generator (MD5, SHA-1, SHA-256, SHA-512), UUID v4 Generator, Random Password / Secret Key Generator, HMAC Generator |
| **Media & Files** | Image Compressor (lossy/lossless), Image Resizer & Aspect Ratio Calculator, Image Format Converter (PNG, JPEG, WebP), PDF Page Counter, SVG to PNG Converter |
| **Calculators & Units** | Indian GST Calculator (CGST, SGST, IGST), Timestamp & Unix Epoch Converter, Color Code Converter (HEX, RGB, HSL), Aspect Ratio Calculator, QR Code Generator & Scanner |

---

### 🛡️ Feature 5: Admin & Moderation Portal

Accessible at `/admin` for privacy-respecting platform observability and automated abuse mitigation:

- **Abuse Report Handling:** Anonymous visitors can report abusive drops (phishing, malware, CSAM, copyright). Reports queue into an administrative dashboard for instant review.
- **Instant Drop Purging:** Administrative capability to purge drops and unlink physical files from storage immediately upon verified infringement.
- **Source Blocking:** Block malicious or abusive actors using salted SHA-256 IP hashes without storing plain-text IP addresses.
- **Live System Telemetry:** Real-time health metrics including memory usage, uptime, active drops, storage consumption, average API response times, and WebSocket connection counts.
- **Audit Logging:** Cryptographically records admin actions (purges, blocks, dismissals) for accountability.

---

### 🔒 Feature 6: Deep Defense Security Architecture

- **Magic Byte Signature Inspection:** Validates binary file headers (first 512 bytes) on disk before allowing downloads, rejecting disguised executables (`.exe`, `.bat`, `.sh`, `.elf`) attempting to masquerade as innocent images or documents.
- **MIME & Extension Whitelisting:** Strict two-stage check against dangerous file types.
- **Path Traversal Guards:** File names are sanitized and forced into partitioned directories (`storage/drops/YYYY-MM/{uuid}.{ext}`). Absolute paths and directory traversal (`../`) are systematically rejected.
- **NoSQL Injection Sanitizer:** Middleware recursively strips MongoDB query operators (`$gt`, `$ne`, `$where`, `$regex`) and dot notation from all incoming JSON payloads.
- **Salted SHA-256 IP Hashing:** Platform rate-limiters and abuse tracking hash client IP addresses using a server-side salt. Raw user IP addresses are **never written to the database**.
- **Hardened HTTP Headers:** Helmet configured with strict Content Security Policy (CSP), `X-Content-Type-Options: nosniff`, `frameguard: deny`, and strict CORS policies.

---

## 3. Technology Stack

```
Frontend:   Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS
Backend:    Node.js + Express 4.21 + TypeScript + WebSockets (ws 8.22)
Database:   MongoDB (Mongoose 9.10) with automatic TTL indexes
Storage:    Abstracted StorageService (Local Filesystem default / S3 & R2 compatible)
Validation: Zod 3.24 (Unified monorepo validation schemas)
Testing:    Vitest 3 + Supertest 7 + Playwright 1.63
```

---

## 4. Monorepo Structure

```
PROJECT_N1/
├── apps/
│   ├── web/                         # Next.js 15 Frontend
│   │   ├── src/app/                 # App Router (/drop, /board, /duel, /tools, /admin)
│   │   ├── src/components/          # UI Components, Modals, Tools, Whiteboard
│   │   ├── src/lib/                 # API, Board & Duel WebSocket clients
│   │   └── tailwind.config.ts       # Design system tokens and styling
│   │
│   └── api/                         # Express Backend API & WebSockets
│       ├── src/config/              # Environment, Database, and Rate Limit configurations
│       ├── src/controllers/         # Request handling and orchestrations
│       ├── src/database/            # Mongoose schemas, indexes, and connection
│       ├── src/middlewares/         # Security, validation, and error handlers
│       ├── src/routes/              # REST Endpoints (/api/drop, /api/board, /api/duel, /api/admin)
│       ├── src/security/            # Magic-byte check, token signing, password hashing
│       ├── src/services/            # DropService, ExpirationService, StorageService
│       └── src/websocket/           # Board & Duel WebSocket servers
│
├── packages/
│   ├── shared/                      # Types, constants, and shared interfaces
│   ├── config/                      # Server defaults and design system tokens
│   └── validation/                  # Zod validation schemas across full stack
│
├── storage/drops/                   # Local file storage root (gitignored)
├── DEPLOYMENT_GUIDE.md              # Zero-cost production deployment guide
├── render.yaml                      # Blueprint configuration for Render.com
├── vercel.json                      # Build & output configuration for Vercel
├── pnpm-workspace.yaml              # PNPM workspace definition
└── package.json                     # Monorepo build, lint, and test scripts
```

---

## 5. Getting Started (Local Development)

### Prerequisites

- **Node.js:** v20.0.0 or higher
- **PNPM:** v9.0.0 or higher (`npm install -g pnpm`)
- **MongoDB:** Local MongoDB instance running on `localhost:27017` (or MongoDB Atlas free cluster URI)

### Quick Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Thanniru-yaswanth03/N1.git
   cd N1
   ```

2. **Install all dependencies across the workspace:**
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   *(All defaults in `.env.example` are pre-configured to run out of the box at ₹0 cost!)*

4. **Start Development Servers:**
   - In terminal 1 (Backend API & WebSockets):
     ```bash
     pnpm dev:api
     ```
     *Backend starts at `http://localhost:5000`.*
   - In terminal 2 (Next.js Frontend):
     ```bash
     pnpm dev:web
     ```
     *Frontend opens at `http://localhost:3000`.*

---

## 6. Running Automated Tests

The codebase includes comprehensive unit, integration, and security test suites:

```bash
# Run TypeScript compilation checks across all 6 packages
pnpm typecheck

# Run all 273 backend and frontend unit/integration tests
pnpm test

# Build production bundles for all packages and applications
pnpm build
```

---

## 7. Zero-Cost Free Production Deployment Guide

Deploy the entire platform with **₹0 / $0 monthly cost** using **Vercel** + **Render** + **MongoDB Atlas**:

```
┌───────────────────────────────┐        ┌───────────────────────────────┐
│     Vercel (Free Tier)        │        │     Render.com (Free Tier)    │
│  Next.js 15 Frontend (@n1/web)│◄──────►│ Express API & WS (@n1/api)    │
│  https://your-n1.vercel.app   │        │ https://your-api.onrender.com │
└───────────────────────────────┘        └───────────────┬───────────────┘
                                                         │
                                         ┌───────────────▼───────────────┐
                                         │  MongoDB Atlas (M0 Free Tier) │
                                         │   512 MB Free Cluster (No CC) │
                                         └───────────────────────────────┘
```

### 1. MongoDB Atlas Setup (Free Database)
1. Create a free **M0 Cluster** at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Set Network Access to `0.0.0.0/0` (Allow from anywhere).
3. Copy your connection string: `mongodb+srv://<user>:<password>@cluster0.xxx.mongodb.net/n1_drop?retryWrites=true&w=majority`.

### 2. Render.com Setup (Free Backend & WebSockets)
1. Create a new **Web Service** on [Render](https://render.com) linked to your GitHub repo.
2. Settings:
   - **Build Command:** `pnpm install && pnpm build:api`
   - **Start Command:** `pnpm start:api`
   - **Plan:** `Free`
3. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `API_URL`: `https://your-api.onrender.com`
   - `CLIENT_URL`: `https://your-web.vercel.app`
   - `MONGODB_URI`: `mongodb+srv://...` (from MongoDB Atlas)
   - `STORAGE_DRIVER`: `local`
   - `LOCAL_STORAGE_PATH`: `./storage/drops`
   - `JWT_SECRET`: *(64 random hex characters)*
   - `PASSWORD_PEPPER`: *(random 32 character string)*
   - `ADMIN_USERNAME`: `admin`
   - `ADMIN_PASSWORD`: `YourAdminSecurePassword2026!`
   - `ADMIN_API_KEY`: `n1_admin_secure_key_32_characters_long`

### 3. Vercel Setup (Free Frontend)
1. Import your GitHub repository into [Vercel](https://vercel.com).
2. Vercel automatically detects `vercel.json`:
   - **Framework:** Next.js
   - **Build Command:** `pnpm build:web`
   - **Output Directory:** `apps/web/.next`
3. Add Environment Variable:
   - `NEXT_PUBLIC_API_URL`: `https://your-api.onrender.com` *(Render API URL without trailing slash)*
4. Click **Deploy**.

> 💡 **Keep-Alive Tip:** Render's free tier sleeps after 15 minutes of inactivity. Set up a free 10-minute HTTP ping on [cron-job.org](https://cron-job.org) or [UptimeRobot](https://uptimerobot.com) targeting `https://your-api.onrender.com/health` to keep your backend warm 24/7!

*For detailed instructions, see [DEPLOYMENT_GUIDE.md](file:///c:/Users/batma/Desktop/VibeCode/PROJECT_N1/DEPLOYMENT_GUIDE.md).*

---

## 8. Documentation Index

- [DEPLOYMENT_GUIDE.md](file:///c:/Users/batma/Desktop/VibeCode/PROJECT_N1/DEPLOYMENT_GUIDE.md) — Comprehensive step-by-step free deployment blueprint.
- [ARCHITECTURE.md](file:///c:/Users/batma/Desktop/VibeCode/PROJECT_N1/ARCHITECTURE.md) — System design, data flows, storage abstraction, and worker engine.
- [PRODUCT_SPEC.md](file:///c:/Users/batma/Desktop/VibeCode/PROJECT_N1/PRODUCT_SPEC.md) — Complete product specifications, UI/UX requirements, and module rules.
- [SECURITY.md](file:///c:/Users/batma/Desktop/VibeCode/PROJECT_N1/SECURITY.md) — Threat model, defense-in-depth security, file validation, and cryptographic standards.
- [API_SPEC.md](file:///c:/Users/batma/Desktop/VibeCode/PROJECT_N1/API_SPEC.md) — REST API endpoints, schemas, parameters, and error envelopes.
- [DEVELOPMENT_PLAN.md](file:///c:/Users/batma/Desktop/VibeCode/PROJECT_N1/DEVELOPMENT_PLAN.md) — Phased implementation plan, test coverage targets, and verification gates.

---

## 9. License

This project is licensed under the **MIT License** — free for personal, educational, and commercial use. Built for privacy, speed, and zero platform exploitation.
