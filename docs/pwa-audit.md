# N1 Progressive Web App (PWA) Reality Check & Audit

**Audit Date:** October 2026  
**Auditor:** Automated Engineering QA  

---

## 1. Executive Summary

N1 provides a **PWA Web App Manifest (`manifest.webmanifest`)** with complete standalone installation capabilities on desktop and mobile devices. However, N1 **deliberately does not implement an invasive offline Service Worker for ephemeral content**, as doing so would directly violate the platform's core security guarantee by caching sensitive, self-destructing files in the browser's persistent `CacheStorage`.

---

## 2. Technical Inspection Matrix

| Requirement | Implementation State | Verification Notes |
| :--- | :--- | :--- |
| **Web App Manifest** | **Implemented** | Available at `/manifest.webmanifest` via Next.js metadata route (`apps/web/src/app/manifest.ts`). |
| **PWA Name & Short Name** | **Implemented** | Name: `"N1 — Privacy-First Platform"`, Short Name: `"N1"`. |
| **Display Mode** | **Standalone** | Configured for fullscreen app window without browser URL chrome. |
| **Start URL & Scope** | **Root (`/`)** | Launches directly into the N1 clean landing interface. |
| **Theme & Background Color**| **`#09090F`** | Matches dark theme token with seamless splash transitions. |
| **Icons** | **Vector & High-Res Maskable** | Declared `/favicon.svg` (scalable vector) and `/icon.svg` (512x512 maskable app icon). |
| **Installability Trigger** | **Fully Supported** | Chrome, Edge, Safari iOS (Add to Home Screen), and Android install prompts activate smoothly. |
| **Offline Developer Tools** | **Browser Runtime Native** | All 31 utilities execute client-side in RAM. Once the page is loaded, they work without active network. |
| **Service Worker Cache** | **Intentionally Omitted** | **Omitted for privacy integrity** (see Section 3). |

---

## 3. Why Service Worker `CacheStorage` Was Intentionally Omitted

Traditional PWAs aggressively cache HTTP responses in browser `CacheStorage`. In N1, implementing this for drop payloads or collaborative whiteboards would create a severe security vulnerability:

1. **Anti-Leak Guarantee:** If a user receives a **Burn-After-Reading** drop or a file with a 15-minute expiration, caching the file payload in a persistent Service Worker cache would keep a permanent unencrypted copy on the device disk indefinitely.
2. **False Offline Semantics:** Claiming the entire platform works offline is deceptive; Ephemeral Drops, real-time Study Boards, and Quably Duels fundamentally require active peer/server communication.
3. **Zero Maintenance Debt:** Service workers frequently cause stale bundle bugs, cache invalidation race conditions, and bypass headers.

---

## 4. Installability Status on Supported Platforms

- **Android (Chrome / Edge / Firefox):** Prompts "Install app" or "Add to Home screen". Launches in standalone frameless window.
- **iOS (Safari):** "Add to Home Screen" opens N1 in standalone WebClip container without Safari address bar.
- **Desktop (macOS / Windows / Linux Chromium):** Shows native install button in omnibox; installs to desktop applications list.

---

## 5. Conclusion & Classification

**Classification:** `READY WITH ACCURATE SCOPE`  
N1 is an installable, standalone web app that truthfully declares its capabilities without misleading "offline-first" claims for real-time network services.
