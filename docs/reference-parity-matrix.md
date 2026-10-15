# Reference Parity Matrix: N1 Drop vs Quably Drop

**Reference Target:** [Quably Drop](https://quably.in/drop) & [Quably Platform](https://quably.in/)  
**Audit Date:** September 30, 2026  
**Auditor:** Lead Engineering Team (Product Validation Phase)  
**Status Legend:**
- **IMPLEMENTED**: Fully working, tested, and meeting or exceeding reference behavior.
- **PARTIAL**: Partially implemented or working with limitations.
- **MISSING**: Present on reference but absent in current implementation.
- **NOT APPLICABLE**: Incompatible with product scope or superseded by superior architecture.
- **UNKNOWN**: Cannot be confirmed from publicly observable behavior.

---

## 1. Feature Parity Matrix

| Reference Feature | Current Implementation | Status | Missing/Improvement |
|---|---|---|---|
| **Zero-Account Ephemeral Model**<br>No login or signup required to create or download | Implemented in N1 Drop. Senders and recipients interact anonymously without credentials or cookies. | **IMPLEMENTED** | **Improvement:** N1 adds an optional owner deletion token returned upon creation, enabling immediate destruction before natural expiry. |
| **Multi-File Upload**<br>Up to 10 files per Drop | Enforced via Multer middleware, shared validation schema (`MAX_FILES_PER_DROP = 10`), and React drag-and-drop zone. | **IMPLEMENTED** | Identical limit enforced across frontend and backend. |
| **Per-File Size Limit**<br>Up to 50 MB per file | Enforced via `MAX_FILE_SIZE_BYTES = 52,428,800` (50 MB) in API middleware and client file selector. | **IMPLEMENTED** | Rejection with HTTP 413 and user-friendly error toast when exceeded. |
| **Total Payload Size Limit**<br>Up to 200 MB aggregate per Drop | Enforced in `createDropSchema` and multipart upload streaming controller. | **IMPLEMENTED** | Identical aggregate volume threshold. |
| **Drag-and-Drop Zone**<br>Interactive drag target with visual state change | Custom React `Card` zone supporting `dragover`, `dragleave`, `drop`, and file-picker fallback on click. | **IMPLEMENTED** | **Improvement:** Added file extension badges, file removal buttons, and live aggregate size calculation. |
| **Allowed File Types**<br>Images, PDF, documents, ZIP, TXT | Allowed extensions validated on both client and server MIME/extension sniffers. | **IMPLEMENTED** | Enforces strict MIME-type validation and blocks executable files (`.exe`, `.sh`, `.bat`, etc.) for malware defense. |
| **Text Drop Mode**<br>Switch between files and plain text | Tabbed interface toggling between multipart file uploader and text textarea. | **IMPLEMENTED** | Seamless tab transition; preserves form state during toggling. |
| **Text Character Limit**<br>Up to 10,000 characters | Enforced via Zod validation (`MAX_TEXT_LENGTH = 10,000`) and HTML `maxLength`. | **IMPLEMENTED** | Includes real-time character counter (`0 / 10,000`). |
| **Expiry Presets**<br>15m, 1h (default), 6h, 24h, 7d | Pill-button group with identical presets (`15m`, `1h`, `6h`, `24h`, `7d`), defaulting to `1h`. | **IMPLEMENTED** | **Improvement:** Live countdown timer rendered on recipient view (`/d/[code]`). |
| **Automated Server-Side Cleanup**<br>Files and database records purged on expiry | Handled via background cron worker running every 60s and lazy TTL validation upon code lookup. | **IMPLEMENTED** | Physical storage unlink verified in test suite. |
| **Short 6-Character Alphanumeric Code**<br>Clean code (e.g., `K7P4X9`) for URL sharing | Cryptographically secure alphanumeric generator producing 6-character collision-resistant codes. | **IMPLEMENTED** | Codes exclude ambiguous characters (`0`, `O`, `I`, `l`) to prevent recipient transcription errors. |
| **Recipient Share URL**<br>Direct access via short URL | Dynamic Next.js route at `/d/[code]` and `/drop/success/[code]`. | **IMPLEMENTED** | Clean responsive UI with instant download/copy actions. |
| **Controlled File Download Handler**<br>Private file storage with anti-hotlinking | Files stored in segregated server storage directory; streamed via `/api/drops/:code/files/:fileId/download`. | **IMPLEMENTED** | Blocks path traversal (`../`), verifies code association, and sets `Content-Disposition: attachment`. |
| **Text Recipient Reader**<br>Formatted text viewing box with quick copy | Monospace text container with "Copy to Clipboard" button and toast feedback. | **IMPLEMENTED** | Sanitizes output against XSS; preserves formatting and line breaks. |
| **Theme Toggle**<br>Dark / Light / System preference | Dark-mode primary design system with high-contrast tokens, CSS variables, and persistent toggle. | **IMPLEMENTED** | Seamless styling without flash of unstyled content (FOUC). |
| **Standalone QR Code Generator**<br>`/tools/utilities/qr-code-generator` in Quably toolbox | N1 includes a QR code modal on `/drop/success/[code]`, but the standalone tool route `/tools/qr-code-generator` is currently 404. | **MISSING** | **Gap:** Standalone QR generator utility page is missing from `/tools/[slug]`. Needs to be registered in `tools-data.ts`. |
| **Study Board**<br>`/board` collaborative shared whiteboard | Landing page `/board` and workspace `/board/[code]` implemented in frontend UI. | **PARTIAL** | UI canvas and toolbar exist, but multiplayer WebSocket synchronization is currently in-memory stub. |
| **Quably Duel**<br>`/duel` 1v1 60-second quiz arena | Landing page `/duel` and arena `/duel/[code]` implemented with 60s timer and question bank. | **PARTIAL** | Single-player / simulated bot mode works; live real-time P2P WebRTC/WebSocket matchmaking requires completion. |
| **Developer Toolbox**<br>Suite of client-side browser utilities | 31 offline-first browser tools implemented under `/tools` (JSON, Base64, UUID, JWT, Hash, Regex, etc.). | **IMPLEMENTED** | Exceeds reference utility breadth (31 tools vs Quably's 6 featured tools). Runs 100% in-browser with zero server uploads. |
| **SEO & Structured Data**<br>JSON-LD Schema, OpenGraph, Twitter Cards | Complete Next.js metadata implementation on all primary landing and tool pages. | **IMPLEMENTED** | Fully indexable with canonical URLs and descriptive meta descriptions. |
| **Dedicated Privacy Policy Page**<br>Policy detailing ephemeral data handling | Footer links to Privacy, but routes to modal/hash rather than dedicated `/privacy` page. | **PARTIAL** | Dedicated `/privacy` policy page should be published detailing zero-log, zero-cookie architecture. |

---

## 2. N1 Architectural Improvements (Substantial Value Added)

The following features were created as original, substantial improvements over Quably Drop:

1. **Argon2id Password Protection:** Senders can lock any Drop with a client-supplied passphrase. Backend uses memory-hard Argon2id hashing; content is inaccessible without unlocking. (Quably has no password protection).
2. **View Limit Enforcement:** Senders can restrict access to 1, 2, 5, 10, or custom view counts. Drop expires immediately once the threshold is reached. (Quably only has time-based expiry).
3. **Burn After Reading:** Self-destructs the Drop immediately upon the first recipient opening/downloading it. (Quably has no burn-after-reading toggle).
4. **Consolidated ZIP Archive Download:** Recipients can download all files in a multi-file Drop in a single compressed ZIP stream. (Quably requires downloading files one-by-one).
5. **Immediate Owner Destruction Token:** Senders receive a private deletion token on creation, allowing them to instantly revoke and delete the Drop from the server before expiry. (Quably offers no manual delete option).
6. **Full-Featured Admin & Moderation Console (`/admin`):** Complete operator dashboard for managing active Drops, inspecting abuse reports, blocking abusive IPs/signatures, monitoring MongoDB connection health, and reviewing security audit logs. (Quably has no public operator console).

---

## 3. Summary Metrics
- **Total Reference Features Audited:** 21
- **Implemented:** 17 (81.0%)
- **Partial:** 3 (14.3% — Study Board multiplayer sync, Duel multiplayer matchmaking, Dedicated `/privacy` page)
- **Missing:** 1 (4.8% — Standalone `/tools/qr-code-generator` in toolbox catalog)
- **Original Value-Add Improvements:** 6 major security & UX capabilities
