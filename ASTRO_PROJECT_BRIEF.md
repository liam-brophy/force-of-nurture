# Geocentric Solar System Visualization — Project Brief & Architecture
### For: Astrologer Client Website
### Prepared for: Claude Code

---

## 1. Project Overview

A bespoke, visually immersive website for a professional astrologer. The centerpiece is an interactive **2D geocentric orrery**—Earth at the center, planets and celestial bodies orbiting around it—rendered in a warm, inviting visual language. Users can toggle layers of information, scrub through time to see historical or future planetary positions, and click bodies to access the astrologer's associated writing.

**Not a scientific tool.** Accuracy should be astrologically meaningful (sign, degree, retrograde status), not NASA-precision. The tone is mystical, warm, editorial—not data-dashboard.

---

## 2. Tech Stack

### Frontend
- **Vite + React** — fast build tooling, component architecture
- **PixiJS v8** — 2D Canvas/WebGL renderer; handles layered sprites, zoom/pan, smooth transitions, and GPU-composited animations without the overhead of Three.js. Perfect for this use case.
- **Zustand** — lightweight global state for toggles, active date, selected body
- **Framer Motion** — sidebar/panel animations, UI transitions (not the orrery itself)
- **date-fns** — date arithmetic for the timeline scrubber

### Ephemeris / Astronomical Data
- **`astronomy-engine`** (npm: `astronomy-engine`) — MIT-licensed, accurate enough for astrological purposes, runs entirely client-side, no API key, no external calls. Calculates ecliptic longitude for all major bodies for any date.
- Pre-computation script (Node.js, run at build time) generates a static JSON snapshot file covering a defined date range.

### Content Layer
- **Flat JSON files** (`/src/data/writings.json`, `/src/data/bodies.json`) — no CMS, no database. The astrologer delivers structured content; developer integrates and deploys.

### Hosting
- **Vercel** or **Netlify** — static deploy, no backend required. Zero ongoing infrastructure cost.

---

## 3. Core Architecture

```
/
├── src/
│   ├── components/
│   │   ├── Orrery/              # PixiJS canvas, all drawing logic
│   │   │   ├── OrreryCanvas.jsx
│   │   │   ├── drawBodies.js
│   │   │   ├── drawZodiac.js
│   │   │   ├── drawOrbits.js
│   │   │   └── usePixiApp.js
│   │   ├── Sidebar/             # Collapsible writing panel
│   │   │   ├── Sidebar.jsx
│   │   │   └── ArticleCard.jsx
│   │   ├── Controls/            # Toggles and timeline
│   │   │   ├── TogglePanel.jsx
│   │   │   └── TimelineScrubber.jsx
│   │   └── UI/                  # Shared components
│   ├── data/
│   │   ├── ephemeris.json       # Pre-computed planetary positions
│   │   ├── writings.json        # All astrologer content
│   │   └── bodies.json          # Body metadata (name, symbol, color, etc.)
│   ├── store/
│   │   └── useOrreryStore.js    # Zustand global state
│   ├── scripts/
│   │   └── generateEphemeris.js # Build-time pre-computation script
│   └── App.jsx
```

---

## 4. Ephemeris Data Strategy

### Pre-computation (Build Time)
Run a Node.js script that uses `astronomy-engine` to calculate the **ecliptic longitude (degrees 0–360)** of each body for every day in a date range. Output is a static JSON file.

```json
{
  "meta": {
    "range_start": "2020-01-01",
    "range_end": "2030-12-31",
    "bodies": ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "Chiron", "NorthNode"]
  },
  "days": {
    "2024-01-15": {
      "Sun":     { "lon": 294.7, "retrograde": false },
      "Moon":    { "lon": 112.3, "retrograde": false },
      "Mercury": { "lon": 277.1, "retrograde": true  },
      "Venus":   { "lon": 318.5, "retrograde": false }
      // ...
    }
  }
}
```

**Date range recommendation:** 2010–2035 (~9,000 days × 12 bodies). At roughly 40 bytes per body per day, total file size is under **5MB** uncompressed, **~1MB gzipped**. Acceptable for a one-time page load.

**Retrograde detection:** Compare longitude delta between day N and day N+1. If negative (body moved backward), flag as retrograde.

### Runtime Lookup
```js
// User scrubs to a date → instant O(1) lookup
const positions = ephemeris.days["2024-06-21"];
```

No API calls at runtime. No latency. Works offline.

### Auto-refresh for "Today"
On page load, default date = `new Date()`. No server needed—the JSON already has today's data. A simple `setInterval` at midnight (or on page refocus) resets to today's key.

---

## 5. The Orrery Renderer (PixiJS)

### Layer Stack (bottom to top)
1. **Background** — deep space texture or gradient, stars as static sprites
2. **Zodiac Ring** — 12 segments, labeled, togglable
3. **Orbit Rings** — elliptical paths per body, togglable
4. **Body Sprites** — planets, symbols, glyph labels
5. **Aspect Lines** — lines between bodies showing aspects (togglable)
6. **UI Overlay** — hover tooltips, selection ring

### Coordinate System
All positions stored as **ecliptic longitude (0–360°)**. Map to canvas x/y:
```js
const angle = (lon - 90) * (Math.PI / 180); // 0° = top (Aries)
const x = centerX + orbitRadius * Math.cos(angle);
const y = centerY + orbitRadius * Math.sin(angle);
```
Each body has a fixed `orbitRadius` (visual, not to scale)—configured in `bodies.json`.

### Zoom & Pan
PixiJS `Container` with `pivot`, `scale`, and pointer event handling. Pinch-to-zoom and scroll-wheel zoom. Pan by drag. Snap zoom levels at "overview", "inner planets", "full system".

### Animation Budget
- **No continuous animation.** Bodies do not move in real time.
- **Transition animation only:** when date changes, bodies tween from old position to new position over ~600ms using PixiJS ticker. One interpolation, then stops.
- **Hover effects:** glow/pulse on the hovered body (shader or simple scale tween).
- **Target 60fps during interactions, idle GPU otherwise.**

---

## 6. Toggle System

State managed in Zustand:

```js
const useOrreryStore = create((set) => ({
  showZodiac: true,
  showOrbits: true,
  showAspects: false,
  showMoon: true,
  showMinorBodies: false,   // Chiron, nodes, etc.
  activeDate: new Date(),
  selectedBody: null,
  sidebarOpen: false,
}));
```

Toggle panel floats over the canvas (collapsible). Each toggle re-renders only the affected PixiJS layer—no full redraw.

---

## 7. Time Navigation

### UI
- Date display with forward/back arrow buttons (jump by day, month, year)
- Optional: compact calendar picker for jumping to a specific date
- Optional: "Return to Today" button

### Step granularities
- **Day** — default, main use
- **Month** — useful for tracking outer planet movements
- **Year** — fast scanning

### No animation between distant jumps
If user jumps more than 30 days, bodies snap to new positions. If ≤30 days, tween smoothly. Prevents jarring long animations.

---

## 8. Content Data Structure

### `writings.json`
```json
[
  {
    "id": "mercury-rx-2024",
    "title": "Mercury Retrograde in Virgo",
    "body": "Mercury",           // links to body key
    "sign": "Virgo",             // optional filter
    "date_written": "2024-08-15",
    "tags": ["retrograde", "communication", "Virgo"],
    "excerpt": "When the messenger planet turns...",
    "content": "Full article text here. Markdown supported.",
    "url": null                  // or external link if hosted elsewhere
  }
]
```

### `bodies.json`
```json
{
  "Mercury": {
    "label": "Mercury",
    "glyph": "☿",
    "color": "#B0C4DE",
    "orbit_radius": 120,
    "size": 10,
    "include_in_default": true
  }
}
```

### How writing links to the orrery
When user clicks a body → Zustand sets `selectedBody = "Mercury"` → Sidebar filters `writings.json` for all entries where `body === "Mercury"` → renders ArticleCards → user taps to expand full content inline.

---

## 9. Sidebar / Content Panel

- Slides in from right (Framer Motion)
- Header: body name + glyph + current position (sign, degree)
- Article list: card per entry, sorted by date_written desc
- Tap card → expands to full article within sidebar (no page navigation)
- Close button or click-outside dismisses
- On mobile: slides up from bottom as a sheet

---

## 10. Visual Direction

**Palette:**
- `#0D0D1A` — near-black deep space background
- `#F2E9D8` — warm parchment for text, labels
- `#C9A96E` — antique gold for highlights, selected states, zodiac ring
- `#7B5EA7` — muted violet accent (aspect lines, active toggles)
- `#3D2B5E` — deep plum for subtle UI surfaces (sidebar bg)

**Typography:**
- Display / body names: `Cormorant Garamond` (Google Fonts) — classical, astrological, editorial
- Body text / articles: `Spectral` — warm serif, high legibility for longer reads
- Data / degrees / UI labels: `DM Mono` — grounded, precise, contrasts the serifs

**Signature element:** The zodiac ring is not a flat band—it's rendered as a warm, hand-drawn-feeling arc with glyph symbols that subtly pulse when a planet occupies that sign. The ring is the thing users remember.

**No hard edges.** Corners rounded, glows soft, shadows warm (use golden-tinted shadows, not grey). The UI feels like it lives in the same world as the orrery, not on top of it.

---

## 11. Content Handoff Process (for the Astrologer)

She does not need a CMS or admin panel. The workflow is:

1. She writes in whatever format she prefers (Google Docs, Notes, etc.)
2. She sends writing to the developer with metadata: title, associated planet, date written, any tags
3. Developer adds entry to `writings.json`, runs `npm run build`, deploys
4. Done. No login, no server, no database.

**Optional upgrade path:** If she eventually wants to self-publish without developer involvement, consider adding Netlify CMS (now Decap CMS) pointed at the JSON files. This gives her a simple web form that commits directly to the repo and triggers a redeploy. But that's v2—not needed at launch.

---

## 12. Build & Deploy Steps

```bash
# 1. Install dependencies
npm install

# 2. Generate ephemeris data (run once, re-run to extend date range)
npm run generate-ephemeris

# 3. Dev server
npm run dev

# 4. Production build
npm run build

# 5. Deploy (auto via Vercel/Netlify GitHub integration)
git push origin main
```

---

## 13. Claude Code — Initial Task Sequence

Feed Claude Code these tasks in order:

### Task 1: Project Scaffold
```
Initialize a Vite + React project. Install: pixi.js, zustand, framer-motion, date-fns, astronomy-engine. Set up folder structure as specified in the architecture doc. Create placeholder files for all major modules.
```

### Task 2: Ephemeris Generator Script
```
Create /src/scripts/generateEphemeris.js. Using astronomy-engine, compute ecliptic longitude for Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, Chiron, and North Node for every day from 2010-01-01 to 2035-12-31. Detect retrograde by checking if longitude delta between consecutive days is negative. Output to /src/data/ephemeris.json. Add "generate-ephemeris" npm script.
```

### Task 3: Zustand Store
```
Create /src/store/useOrreryStore.js. State: showZodiac (bool), showOrbits (bool), showAspects (bool), showMoon (bool), showMinorBodies (bool), activeDate (Date), selectedBody (string|null), sidebarOpen (bool). Include actions for each toggle, setDate, setSelectedBody, toggleSidebar.
```

### Task 4: PixiJS Canvas Setup
```
Create OrreryCanvas.jsx. Initialize a PixiJS Application attached to a full-viewport canvas. Create layered Containers: backgroundLayer, zodiacLayer, orbitLayer, bodyLayer, aspectLayer, uiLayer. Implement zoom (scroll wheel + pinch) and pan (drag) on the root container. Export a ref to the pixi app for use by drawing modules.
```

### Task 5: Body Drawing
```
Using bodies.json and the current activeDate from the ephemeris store, draw each celestial body as a colored circle with glyph label on bodyLayer. Position using ecliptic longitude mapped to canvas coordinates (Earth at center). Animate position transitions over 600ms when activeDate changes. Attach pointer events: hover shows tooltip, click sets selectedBody in store.
```

### Task 6: Zodiac Ring
```
Draw 12 zodiac segments on zodiacLayer as arc segments in antique gold (#C9A96E). Label each with sign glyph and name. Toggle visibility based on showZodiac store value. Pulse glyph subtly when a planet is in that sign.
```

### Task 7: Toggle Panel UI
```
Create TogglePanel.jsx. Floating panel (top-left or collapsible drawer). Toggles for: Zodiac Ring, Orbit Rings, Aspect Lines, Moon, Minor Bodies. Each toggle connected to Zustand store. Style using project palette.
```

### Task 8: Timeline Scrubber
```
Create TimelineScrubber.jsx. Shows current date. Arrow buttons for ±1 day, ±1 month, ±1 year. Date picker input for jumping to specific date. "Today" button. All changes update activeDate in store. Constrain to ephemeris range (2010–2035).
```

### Task 9: Sidebar
```
Create Sidebar.jsx. Slides in from right using Framer Motion when sidebarOpen is true. Header shows selectedBody name, glyph, and current ecliptic position (sign + degree). Filters writings.json for entries matching selectedBody. Renders ArticleCards (title, excerpt, date). Clicking a card expands full content inline. Close on button click or outside click.
```

### Task 10: Polish & Integration
```
Wire all components together in App.jsx. Ensure mobile responsiveness (sidebar as bottom sheet on small screens). Add loading state while ephemeris.json loads. Add reduced-motion support (skip position tweens if prefers-reduced-motion). Final visual pass: confirm palette, typography loaded via Google Fonts, background star field rendered on backgroundLayer.
```

---

## 14. Repo Setup Checklist (Your Steps Before Claude Code)

1. **Create new GitHub repo** (name suggestion: `astro-orrery` or client-specific)
2. **Clone locally**
3. **Run:** `npm create vite@latest . -- --template react`
4. **Commit initial scaffold:** `git add . && git commit -m "init"`
5. **Open repo in Claude Code:** `claude` in the project directory
6. **Paste Task 1 from Section 13** to begin
7. **Connect repo to Vercel or Netlify** for continuous deployment (optional but recommended early—lets you share preview links with the client)

---

## 15. Open Questions to Confirm with Client Before Task 5+

- Which bodies to include by default vs. hidden behind "minor bodies" toggle? (Suggest: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn visible by default; Uranus, Neptune, Pluto, Chiron, Nodes behind toggle)
- Does she want aspect lines at all? (Lines between bodies showing conjunctions, oppositions, trines, etc.) These are standard in astrology software but add visual complexity.
- Date range for pre-computed ephemeris — does 2010–2035 cover her needs or does she need historical (e.g., client birth year lookups going back to the 1960s)?
- Any specific branding colors or fonts she's attached to, or does the visual direction above have full latitude?
