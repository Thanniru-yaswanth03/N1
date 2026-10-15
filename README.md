# N1 — Privacy-First Temporary Sharing & Anonymous Productivity Platform

> **N1** is a production-grade, privacy-first, zero-cost web platform built for anonymous file/text sharing and friction-free productivity. The flagship module is **Drop** — an anonymous, self-destructing file and text exchange engine requiring zero accounts, zero personal data, and zero long-term storage footprint.

---

## 1. Project Overview & Vision

Modern cloud sharing tools often force accounts, track user identity, retain files indefinitely, and incur heavy subscription fees. **N1** reverses this model:

- **Zero Accounts:** No login, no emails, no phone numbers, no tracking cookies.
- **Zero Permanent Retention:** Content exists solely for a user-specified lifetime (15 minutes to 7 days) and is then permanently purged from both database and disk.
- **Zero Cost Architecture (₹0 Budget):** Engineered strictly to run locally or on free cloud tiers (MongoDB local/Atlas free tier, local filesystem / Cloudflare R2 free tier, Vercel/Render free tiers). No paid APIs, no paid SaaS, and no commercial dependencies are ever permitted.

---

## 2. Core Features (The Drop Engine)

- **Dual Sharing Modes:** Share plain text (up to 10,000 characters) or upload multiple files (up to 10 files, 50 MB each, 200 MB total per Drop).
- **Temporary Lifecycle:** Presets for `15 minutes`, `1 hour`, `6 hours`, `24 hours`, and `7 days` with second-by-second countdown.
- **Short 6-Character Codes:** Clean alphanumeric identifiers (e.g., `MGS538`, `MU96Z8`) for fast manual sharing or direct URL routing (`/d/{CODE}`).
- **Secure Owner Deletion:** Every created Drop returns a cryptographic deletion token to the creator, allowing early manual destruction before expiry.
- **Burn-After-Reading:** Optional self-destruct mechanism that immediately wipes the Drop after its first successful view.
- **Password Protection:** Optional client/server cryptographic hashing (Argon2id/bcrypt) guarding sensitive drops.
- **Download Flexibility:** Download files individually or package all files into an on-the-fly streaming `.zip` bundle.
- **QR Code Generation:** Fast scan-to-mobile capability on the success and view screens.
- **Deep Defense Security:** Magic-byte file signature validation, strict MIME and extension whitelisting, filename sanitization, and path-traversal prevention.

---

## 3. Future Platform Modules

Beyond Drop, N1 is architected to house modular productivity extensions:

1. **Toolbox:** 20+ client-side utility tools (JSON Formatter, Base64 Encoder, Regex Tester, Word Counter, Image Compressor, PDF converter) running 100% in-browser with zero server load.
2. **Study Board:** Real-time anonymous collaborative whiteboard with specialized templates for computer science, mathematics, flowcharts, and study groups.
3. **Duel:** Fast 60-second 1v1 technical and logic challenges over real-time WebSockets with synchronized timers.
4. **Admin & Moderation:** Automated hash matching for abuse prevention, DMCA takedown handler, and rate-limiting inspection.

---

## 4. Technology Stack

| Layer              | Technology                              | Rationale                                                                       |
| :----------------- | :-------------------------------------- | :------------------------------------------------------------------------------ |
| **Frontend**       | Next.js (App Router), React, TypeScript | SSR/SSG flexibility, fast client navigation, type safety.                       |
| **Styling**        | Tailwind CSS                            | Utility-first, zero runtime CSS overhead, strict design token mapping.          |
| **Backend**        | Node.js, Express, TypeScript            | High-throughput streaming I/O, mature multipart file handling.                  |
| **Database**       | MongoDB                                 | Document flexibility for variable-type drops, native TTL indexing capabilities. |
| **Storage Engine** | Abstract `StorageService`               | Defaults to private local filesystem; hot-swappable with S3/R2 free tier.       |
| **Validation**     | Zod                                     | Unified client/server schema validation.                                        |
| **Testing**        | Vitest, Supertest, Playwright           | Unit, API integration, and headless browser E2E test suites.                    |
| **Security**       | Helmet, CORS, Argon2/bcrypt, crypto     | Hardened HTTP headers, rate limiting, secure random generation.                 |

---

## 5. Zero-Cost Budget Guarantee

N1 strictly enforces an initial **₹0 budget constraint**:

- **No Paid Databases:** Runs on local MongoDB instance in development; MongoDB Atlas M0 Free Tier (512 MB) in production.
- **No Paid Storage:** Uses private local filesystem in development; free storage adapters (Cloudflare R2 10 GB free tier or self-hosted disk) in production.
- **No Paid Auth / SaaS:** No Clerk, Auth0, or Firebase needed. All operations are token-based or cryptographically signed without identity providers.
- **No Paid APIs:** All URL generation, QR codes, ZIP streaming, and validation run directly on local open-source libraries.

---

## 6. Project Architecture Overview

```
PROJECT_N1/
├── apps/
│   ├── web/                  # Next.js Frontend Application
│   │   ├── src/
│   │   │   ├── app/          # App router pages (/drop, /d/[code], etc.)
│   │   │   ├── components/   # UI components, DropZone, PillGroup, Modals
│   │   │   ├── hooks/        # Theme hook, countdown hook, clipboard hook
│   │   │   └── lib/          # API client, formatting utils, constants
│   │   └── tailwind.config.ts
│   │
│   └── api/                  # Express Backend Application
│       ├── src/
│       │   ├── config/       # Environment, database, storage config
│       │   ├── controllers/  # DropController, HealthController
│       │   ├── middlewares/  # Validation, rate limiting, error handler
│       │   ├── models/       # Mongoose Drop schema and models
│       │   ├── routes/       # API route definitions
│       │   ├── services/     # DropService, StorageService, CleanupService
│       │   └── utils/        # Crypto, file validation, magic bytes
│       └── tests/            # Vitest & Supertest suites
│
├── packages/
│   └── shared/               # Shared TypeScript types, Zod schemas, constants
│       ├── src/
│       │   ├── schemas/      # Drop create/unlock Zod schemas
│       │   └── types/        # Drop entity, DTOs, API response types
│       └── package.json
│
├── storage/                  # Local development file storage (gitignored)
├── ARCHITECTURE.md           # System design, data flows, storage abstraction
├── PRODUCT_SPEC.md           # Full feature specs, limits, lifecycle rules
├── SECURITY.md               # Threat modeling, validation, security protocols
├── API_SPEC.md               # REST API endpoints, schemas, error codes
├── DEVELOPMENT_PLAN.md       # Phased implementation roadmap & test gates
├── .env.example              # Sample environment configuration
└── .gitignore                # Comprehensive Git ignore rules
```

---

## 7. Documentation Guide

For complete technical and architectural specifications, consult the following documents:

- [ARCHITECTURE.md](file:///c:/Users/batma/Desktop/VibeCode/PROJECT_N1/ARCHITECTURE.md) — System architecture, storage abstraction, data lifecycle, and worker engine.
- [PRODUCT_SPEC.md](file:///c:/Users/batma/Desktop/VibeCode/PROJECT_N1/PRODUCT_SPEC.md) — Complete product requirements, UI/UX specs, design tokens, and module definitions.
- [SECURITY.md](file:///c:/Users/batma/Desktop/VibeCode/PROJECT_N1/SECURITY.md) — Threat model, defense-in-depth security, file validation, and cryptographic standards.
- [API_SPEC.md](file:///c:/Users/batma/Desktop/VibeCode/PROJECT_N1/API_SPEC.md) — Comprehensive REST API documentation, request/response models, and error envelopes.
- [DEVELOPMENT_PLAN.md](file:///c:/Users/batma/Desktop/VibeCode/PROJECT_N1/DEVELOPMENT_PLAN.md) — Phased implementation plan, test coverage targets, and verification gates.

---

## 8. License & Principles

Licensed under the MIT License. Built for privacy, speed, and zero platform exploitation.
