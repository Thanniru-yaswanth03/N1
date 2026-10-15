# N1 Brand & Visual Identity System

**Document Version:** 1.0.0 (Phase 3 Productization)  
**Status:** Canonical Brand Specification  
**Design Philosophy:** Ephemeral, Zero-Knowledge, Precision-Engineered, Non-Invasive  

---

## 1. Brand Concept & Origin

**N1** (Negative-One / The Ephemeral Origin) represents the transition from state to statelessness:
- In computing arrays, index `-1` signifies non-existence, absence, or the end of a sequence.
- N1 signifies data that exists solely while needed, leaving behind **zero trace** when complete.
- **Brand Tagline:** *Share without trace. Temporary by design.*
- **Core Pillars:**
  1. **DROP:** Fast private sharing (Self-destructing text & files)
  2. **BOARD:** Collaborative thinking (Real-time anonymous whiteboard)
  3. **DUEL:** Competitive learning (Authoritative real-time 1v1 speed quizzes)
  4. **TOOLS:** Fast browser utilities (31 offline-first privacy tools)

---

## 2. Color System & Pillar Accents

N1 operates on a unified, high-contrast dark theme with tailored light mode parity, using semantic HSL color tokens.

### Core Foundation
| Token | Hex (Dark) | Description |
|---|---|---|
| `--color-bg` | `#09090F` | Deep space obsidian void background |
| `--color-surface` | `#11111B` | Card and component surface |
| `--color-surface-raised` | `#181826` | Elevated cards, dialogs, command palette |
| `--color-surface-overlay` | `#222234` | Hover states, active selections, tooltips |
| `--color-border` | `#27273A` | Structural borders |
| `--color-border-subtle` | `#1C1C2C` | Hairline dividers |
| `--color-text-primary` | `#F8FAFC` | High-contrast headings and primary labels |
| `--color-text-secondary` | `#94A3B8` | Body copy, descriptions |
| `--color-text-muted` | `#64748B` | Timestamps, metadata, hints |

### Pillar Identity Accents
To maintain unity while giving each pillar a distinct character:

| Pillar | Primary Accent | Secondary Accent | Emotional Identity |
|---|---|---|---|
| **DROP** | `#7C3AED` (N1 Purple) | `#A78BFA` (Purple Light) | Confidential, Encrypted, Private |
| **BOARD** | `#06B6D4` (Cyan) | `#38BDF8` (Sky) | Infinite, Collaborative, Creative |
| **DUEL** | `#EC4899` (Pink) | `#F59E0B` (Amber Gold) | Intense, Competitive, Speed |
| **TOOLS** | `#10B981` (Emerald) | `#14B8A6` (Teal) | Utilitarian, Reliable, Offline-Safe |

---

## 3. Typography Hierarchy

N1 uses a dual-stack typography system loaded with font fallbacks to guarantee zero font-blocking latency.

| Family | Stack | Purpose |
|---|---|---|
| **Brand / Display** | `Outfit`, system-ui, sans-serif | Hero headlines, pillar headers, marketing callouts |
| **Interface / Body** | `Inter`, -apple-system, BlinkMacSystemFont, sans-serif | Form controls, button text, body paragraphs, dialogs |
| **Monospace / Code** | `JetBrains Mono`, `Fira Code`, monospace | Short codes (e.g. `7K2M9X`), countdown timers, hashes |

### Scale
- **Display 1:** `3.75rem` (60px) / Line Height 1.1 / Bold 800 (Homepage Hero)
- **H1:** `2.25rem` (36px) / Line Height 1.25 / Bold 800 (Pillar Headlines)
- **H2:** `1.5rem` (24px) / Line Height 1.3 / Bold 700 (Section Headers)
- **H3:** `1.125rem` (18px) / Line Height 1.4 / Semibold 600 (Card Titles)
- **Body Large:** `1rem` (16px) / Line Height 1.5 / Regular 400
- **Body:** `0.875rem` (14px) / Line Height 1.5 / Regular 400
- **Caption / Meta:** `0.75rem` (12px) / Line Height 1.4 / Medium 500
- **Micro / Badge:** `0.625rem` (10px) / Uppercase / Bold 700 / Monospace

---

## 4. Logo & Icon Treatment

### Geometric Monogram (Original Design)
- **Form:** A stylized, beveled hexagon portal enclosing the alphanumeric glyph **N1**.
- **Visual Meaning:** The open portal represents ephemeral transmission; the angular glyph represents encrypted security.
- **Aspect Ratio:** 1:1 square with rounded corners (corner radius 28%).
- **Gradient Fill:** 135deg linear gradient from `#7C3AED` (deep purple) through `#9333EA` to `#F59E0B` (gold accent).

---

## 5. Motion & Micro-interaction Language

- **Duration:** 150ms – 250ms for UI actions (hover, modal slide, tab switch).
- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (snappy spring deceleration).
- **Pulsing Accents:** Subtle `animate-pulse` or `animate-ping` limited strictly to live socket indicators (Duel matchmaking, Board active stroke, Drop expiry urgency).
- **Reduced Motion:** Mandatory `@media (prefers-reduced-motion: reduce)` rules disable all transform animations, falling back to instant opacity switching.

---

## 6. Illustration & Card Language

- **Surface Treatment:** Dark glassmorphism (`bg-n1-surface/80 backdrop-blur-md border border-n1-border`).
- **Focus Rings:** 2px solid `#A78BFA` with 2px offset on keyboard `:focus-visible`.
- **Card Accents:** 1px ambient top glow line indicating active status or pillar color.
