# N1 Route Inventory & Architecture Mapping

**Audit Date:** October 2026  
**Platform Version:** N1 1.0 (Phase 4 Production Validation)  
**Total Public Frontend Pages:** 14  
**Total Dynamic Tool Pages:** 31  
**Total Internal / Moderation Pages:** 2  
**Total REST Endpoints:** 22  

---

## 1. Web Application Routes (`apps/web`)

| Route | Purpose | Access | Expected Status | Mobile / Desktop | SEO Status | Indexable? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | Landing page, 4-pillar showcase, quick code jump, tools preview | Public | 200 OK | Full Responsive | Indexed (Priority 1.0) | Yes |
| `/drop` | Ephemeral Drop creation (files & text), security controls | Public | 200 OK | Full Responsive | Indexed (Priority 0.9) | Yes |
| `/drop/success/[code]` | Creation confirmation, owner deletion token, share sheet | Public (Direct) | 200 OK | Full Responsive | Not In Sitemap (Dynamic) | No |
| `/d/[code]` | Recipient drop viewer, password challenge, download, ZIP | Public with Code | 200 / 401 / 404 / 410 | Full Responsive | Disallowed in robots.txt | **No (Privacy Guard)** |
| `/board` | Study Board hub, template picker, room code lookup | Public | 200 OK | Full Responsive | Indexed (Priority 0.8) | Yes |
| `/board/[code]` | Real-time collaborative canvas room | Public with Code | 200 / 404 / 410 | Full Responsive | Disallowed in robots.txt | **No (Ephemeral)** |
| `/duel` | Quably Duel lobby, topic selection, matchmaking queue | Public | 200 OK | Full Responsive | Indexed (Priority 0.8) | Yes |
| `/duel/[code]` | Synchronous 1v1 live quiz match arena | Public with Code | 200 / 404 / 410 | Full Responsive | Disallowed in robots.txt | **No (Ephemeral)** |
| `/tools` | 31 client-side developer tools catalog with filter & search | Public | 200 OK | Full Responsive | Indexed (Priority 0.9) | Yes |
| `/tools/[slug]` | 31 standalone browser utilities (e.g. `json-formatter`) | Public | 200 / 404 | Full Responsive | Indexed (Priority 0.7) | Yes |
| `/privacy` | Privacy Architecture, technical transparency, data lifetimes | Public | 200 OK | Full Responsive | Indexed (Priority 0.5) | Yes |
| `/terms` | Terms of Service, acceptable use, legal limitations | Public | 200 OK | Full Responsive | Indexed (Priority 0.5) | Yes |
| `/help` | User guide, platform documentation, FAQs | Public | 200 OK | Full Responsive | Indexed (Priority 0.6) | Yes |
| `/design-system` | Component showcase, typography, palette tokens | Public | 200 OK | Full Responsive | Indexed (Priority 0.4) | Yes |
| `/admin/login` | Administrator authentication portal | Protected | 200 OK | Full Responsive | Disallowed in robots.txt | **No** |
| `/admin` | Moderation console, abuse report triage, system metrics | Admin Only | 200 OK (401 Redirect) | Desktop Optimized | Disallowed in robots.txt | **No** |
| `/manifest.webmanifest` | PWA manifest configuration | Public | 200 OK | All | Metadata | Yes |
| `/robots.txt` | Crawler crawler instructions & exclusion rules | Public | 200 OK | All | Metadata | Yes |
| `/sitemap.xml` | Search engine indexing roadmap | Public | 200 OK | All | Metadata | Yes |

---

## 2. All 31 Client-Side Tool Sub-Routes (`/tools/[slug]`)

Each tool runs entirely within the browser sandbox with zero backend network requests:

| Slug | Title | Category | Browser APIs Used |
| :--- | :--- | :--- | :--- |
| `json-formatter` | JSON Formatter & Validator | Developer | `JSON.parse`, `JSON.stringify` |
| `base64` | Base64 Encoder / Decoder | Developer | `btoa`, `atob`, `TextEncoder` |
| `url-encoder` | URL Encoder / Decoder | Developer | `encodeURIComponent`, `decodeURIComponent` |
| `jwt-debugger` | JWT Debugger | Developer | Base64 decoding, JSON parsing |
| `uuid-generator` | UUID Generator (v4) | Developer | `crypto.randomUUID()` |
| `hash-generator` | Hash Generator (SHA-256) | Developer | `crypto.subtle.digest()` |
| `qr-code-generator` | QR Code Generator | Developer | HTML5 Canvas, `qrcode` |
| `regex-tester` | Regex Tester & Debugger | Developer | `RegExp.exec()`, text highlight |
| `html-entity` | HTML Entity Encoder/Decoder | Developer | DOMParser, HTML entity mappings |
| `timestamp-converter` | Unix Timestamp Converter | Developer | `Date.getTime()`, timezone math |
| `css-box-shadow` | CSS Box Shadow Generator | Developer | CSS property generation |
| `css-minifier` | CSS Minifier | Developer | Regex whitespace reduction |
| `js-minifier` | JavaScript Minifier | Developer | AST-free token compaction |
| `html-minifier` | HTML Minifier | Developer | Whitespace & comment stripping |
| `diff-checker` | Diff Checker | Text | LCS sequence diffing |
| `text-case-converter` | Text Case Converter | Text | String transformations |
| `lorem-ipsum` | Lorem Ipsum Generator | Text | Pseudo-latin paragraph generator |
| `slug-generator` | URL Slug Generator | Text | Diacritic removal, regex cleanup |
| `word-counter` | Word & Character Counter | Text | Regex word splitting, reading time |
| `markdown-previewer` | Markdown Previewer | Text | DOMPurify, Markdown renderer |
| `percentage-calc` | Percentage Calculator | Calculator | Math arithmetic |
| `discount-calc` | Discount & Sale Calculator | Calculator | Math arithmetic |
| `unit-converter` | Unit Converter | Calculator | Dimensional analysis tables |
| `color-picker` | Color Picker & Palette | Image | Canvas RGB, HSL conversions |
| `image-optimizer` | Image Optimizer / Compressor | Image | `canvas.toBlob()`, `createObjectURL` |
| `favicon-generator` | Favicon Generator | Image | Multi-resolution Canvas resizing |
| `meta-tag-generator` | Meta Tag Generator | Developer | HTML snippet generator |
| `aspect-ratio` | Aspect Ratio Calculator | Image | GCD formula math |
| `svg-to-png` | SVG to PNG Converter | Image | Canvas rasterization |
| `curl-to-fetch` | cURL to Fetch Converter | Developer | Command parser |
| `cron-expression` | Cron Expression Generator | Developer | Cron parser & human explanation |

---

## 3. Backend REST API Endpoints (`apps/api`)

| Method | Path | Purpose | Auth Required | Rate Limited? |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/drop` | Create ephemeral Drop (files or text) | Anonymous | Yes (10/min) |
| `GET` | `/api/drop/:code` | Retrieve Drop metadata | Anonymous | Yes (60/min) |
| `POST` | `/api/drop/:code/unlock` | Verify password challenge and get token | Anonymous | Yes (5/min brute-force defense) |
| `GET` | `/api/drop/:code/download/:fileId` | Stream individual file payload | Token if passworded | Yes |
| `GET` | `/api/drop/:code/zip` | Stream all files as ZIP package | Token if passworded | Yes |
| `DELETE` | `/api/drop/:code` | Permanent deletion (owner token or admin) | Token / Admin | Yes |
| `POST` | `/api/drop/:code/report` | Submit abuse or malicious report | Anonymous | Yes (5/min) |
| `GET` | `/api/board/:code` | Retrieve whiteboard room metadata & elements | Anonymous | Yes |
| `POST` | `/api/board` | Initialize new whiteboard session | Anonymous | Yes |
| `POST` | `/api/board/:code/elements` | Batch save whiteboard elements (REST fallback) | Anonymous | Yes |
| `DELETE` | `/api/board/:code/elements` | Clear all whiteboard strokes | Anonymous | Yes |
| `GET` | `/api/duel/:code` | Retrieve quiz match status | Anonymous | Yes |
| `POST` | `/api/duel/queue` | Enter real-time matchmaking queue | Anonymous | Yes |
| `POST` | `/api/duel/:code/rematch` | Trigger mutual rematch request | Anonymous | Yes |
| `GET` | `/api/health` | Service liveness probe | None | No |
| `POST` | `/api/admin/login` | Authenticate moderator / admin | Admin Creds | Yes (5/min) |
| `POST` | `/api/admin/logout` | Terminate admin session cookie | Admin Cookie | No |
| `GET` | `/api/admin/stats` | Aggregate platform counts | Admin Cookie | No |
| `GET` | `/api/admin/reports` | Paginated abuse reports list | Admin Cookie | No |
| `POST` | `/api/admin/reports/:id/resolve` | Resolve/dismiss abuse report | Admin Cookie | No |
| `GET` | `/api/admin/drops` | Query drops for moderation inspection | Admin Cookie | No |
| `DELETE` | `/api/admin/drops/:code` | Admin force wipe drop | Admin Cookie | No |

---

## 4. Route Health, Dead Route & Orphan Audit Findings

- **Dead Routes Detected:** 0
- **Duplicate Routes Detected:** 0
- **Broken Breadcrumbs:** 0 (all breadcrumbs route to valid parent pages; labels strictly separated from codes to prevent Playwright collision traps)
- **Robots / Indexing Audit:** Clean separation verified. All private ephemeral drops (`/d/*`), board rooms (`/board/*`), duel matches (`/duel/*`), and administrative consoles (`/admin/*`) are blocked in `robots.ts` and excluded from `sitemap.ts`.
