# Product Gap Analysis: N1 Drop vs Reference & Commercial Standards

**Audit Date:** September 30, 2026  
**Auditor:** Lead Engineering Team  
**Scope:** Systematic review of N1 application routes, reference parity with Quably, and user journeys.  

---

## Priority Classification Scheme

- **P0 (Critical / Blocker):** Blocks core functionality, causes server/client crashes, or breaks primary user flows. Must be resolved before any deployment.
- **P1 (High Priority / Major Functionality):** Core features present in the reference or expected by the product specification that are missing or incomplete.
- **P2 (Medium Priority / Meaningful UX Improvement):** Significant improvements to user journey fluidity, recovery, convenience, and perceived quality.
- **P3 (Low Priority / Polish):** Aesthetic refinements, micro-animations, copy adjustments, and secondary optimizations.

---

## Findings Summary

| Priority | Issue ID | Component / Route | Summary | Impact |
|---|---|---|---|---|
| **P0** | — | — | **No P0 Blockers Identified** | Core build, all 301 tests, database connection, API, and frontend routes are healthy. |
| **P1** | GAP-01 | `/tools/qr-code-generator` | Missing standalone QR Code Generator in Toolbox | Visiting `/tools/qr-code-generator` returns 404; feature is featured prominently on Quably reference. |
| **P1** | GAP-02 | `/board/[code]` | Real-time WebSocket room synchronization incomplete | Whiteboard canvas UI works locally, but multi-client room sync is a stub. |
| **P1** | GAP-03 | `/duel/[code]` | Real-time 1v1 matchmaking WebSocket incomplete | Quiz arena UI and questions work in solo mode; peer matchmaking is simulated. |
| **P2** | GAP-04 | `/` (Homepage) | Missing quick "Enter Drop Code" lookup box | Senders give recipients a 6-digit code, but visitors on homepage cannot directly enter it without full URL. |
| **P2** | GAP-05 | `/drop` | Missing client-side "My Recent Drops" drawer | Anonymous senders who close `/drop/success` lose their owner deletion token; storing recent tokens in local storage preserves control. |
| **P2** | GAP-06 | `/privacy` | Dedicated Privacy Policy & Data Retention page missing | Footer links to Privacy via anchor/modal; needs a standalone comprehensive legal page. |
| **P2** | GAP-07 | `/d/[code]` | Missing circular countdown / visual urgency indicator | Expiry is displayed as text; an animated visual countdown bar would improve clarity. |
| **P3** | GAP-08 | `/drop` | Full-window drag-and-drop backdrop overlay | Dragging files over the page only highlights the inner card; a full-screen drag overlay elevates feel. |
| **P3** | GAP-09 | `/tools` | Tool category pill transition and tag count indicators | Toolbox category switching is instant; subtle spring transitions would polish the UI. |
| **P3** | GAP-10 | `/admin` | Audit log table column auto-fit and export to CSV | Admin audit events are paginated; adding a "Download CSV Audit Log" button enhances operational readiness. |

---

## Detailed Gap Descriptions

### P1 — Major Missing Functionality

#### GAP-01: Standalone QR Code Generator Tool (`/tools/qr-code-generator`)
- **Reference Parity:** Quably features a dedicated tool at `https://quably.in/tools/utilities/qr-code-generator` offering custom colors, frame styles, logo embedding, and PNG/SVG export.
- **Current N1 State:** N1 implements a lightweight QR code modal exclusively on the Drop creation success screen (`/drop/success/[code]`), but no standalone QR tool is registered in `apps/web/src/lib/tools-data.ts`. Requesting `/tools/qr-code-generator` results in a 404 response.
- **Required Fix:** Add `qr-code-generator` to `TOOLS` definition and create dedicated interactive component in `apps/web/src/components/tools/QrCodeGenerator.tsx`.

#### GAP-02: Study Board Multi-Client Synchronization (`/board/[code]`)
- **Reference Parity:** Quably Board enables students to join a shared URL and sketch collaboratively in real time.
- **Current N1 State:** The drawing canvas, toolbars, color palettes, and stroke controls function cleanly on the client. However, remote peer strokes are not broadcasted over WebSockets to other connected browsers.
- **Required Fix:** Connect the canvas event listeners (`onDraw`, `onClear`, `onShape`) to the existing Express WebSocket server (`/ws/board/:code`).

#### GAP-03: Quably Duel Real-Time Peer Matchmaking (`/duel/[code]`)
- **Reference Parity:** Quably Duel enables two players to challenge each other via a shared link with synchronized 60-second clocks.
- **Current N1 State:** The quiz interface presents questions, handles selections, counts down 60 seconds, and calculates accuracy, but competitor scores are simulated via bot timers rather than live duplex WebSocket communication.
- **Required Fix:** Bind duel state transitions (waiting for opponent, countdown, synchronized question answer, results) to WebSocket events.

---

### P2 — Meaningful UX & Product Improvements

#### GAP-04: Homepage Quick "Enter Drop Code" Lookup Box
- **Problem:** When a sender shares only a 6-character code (e.g. `K7P4X9`) via SMS or verbal communication, a visitor arriving at the homepage (`/`) has to guess where to enter the code or construct the URL manually.
- **Solution:** Add a compact, high-contrast "Access a Drop" input in the hero section allowing direct 6-character entry with automatic redirect to `/d/[code]`.

#### GAP-05: Client-Side "My Recent Drops" Drawer (Local Storage)
- **Problem:** Because N1 is strictly zero-account, if an anonymous sender closes their browser tab after creating a Drop, they permanently lose their unique Owner Deletion Token and have no way to manually delete the Drop before expiration.
- **Solution:** Persist recent drop metadata (code, expiry timestamp, deletion token, type) in the browser's `localStorage`. Expose a subtle "Recent Drops" drawer on `/drop` allowing senders to view time remaining or trigger immediate destruction.

#### GAP-06: Dedicated `/privacy` and `/terms` Policy Pages
- **Problem:** In privacy-focused applications, users scrutinize data retention and logging policies. Currently, the footer links to `#` or modal popups.
- **Solution:** Create static, SEO-optimized `/privacy` and `/terms` routes explaining zero-knowledge architecture, Argon2id encryption, local storage boundaries, and automated TTL deletion cycles.

---

### P3 — Polish & Aesthetic Enhancements

#### GAP-08: Full-Window Drag-and-Drop Backdrop Overlay
- Enhance the `/drop` drag-and-drop experience by detecting `window.ondragenter` and displaying a high-contrast blurred backdrop overlay reading "Drop files anywhere to upload".

#### GAP-10: Admin CSV Export for Compliance
- Add an "Export Security Logs" button in `/admin` that generates a timestamped CSV of rate-limit violations, blocked IP hashes, and drop lifecycle audits.
