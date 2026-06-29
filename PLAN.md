# Mission 3X — Project Plan

## Current Status ✅

The v1 implementation is merged to `main`. The core product is fully functional:

| Feature | Status |
|---|---|
| 120-tile boustrophedon board | ✅ |
| 5 tile types with neon styling | ✅ |
| START / FINISH end-caps + row arrows | ✅ |
| Firebase Realtime Database sync | ✅ |
| User View (read-only, live) | ✅ |
| Admin View (passphrase-protected) | ✅ |
| Add / Edit / Remove players | ✅ |
| Player avatars (initials / emoji / image URL) | ✅ |
| Move player to any tile | ✅ |
| Live-editable special tile positions | ✅ |
| Reset game | ✅ |
| Graceful offline / demo fallback | ✅ |
| Legend panel | ✅ |
| GitHub Pages compatible (zero build) | ✅ |
| Login loading state (B1) | ✅ |
| Quick-step move buttons (B2) | ✅ |
| Token overflow cap (B3) | ✅ |
| Remove dead child import (B5) | ✅ |

---

## Known Issues to Fix

### 1. Admin session restore after Firebase connects
**File:** `app.js:608`
When the page reloads with `sessionStorage.getItem("mission3x_admin") === "1"`, `enterAdminMode()` is called after 100ms. But if Firebase is reachable this time, `isOffline` is still false and write operations will work — but the `startListeners()` call happened before the session restore, so the admin player list won't be populated correctly on restore.
**Fix:** Ensure `renderAdminPlayerList()` is called after Firebase's initial `players` snapshot fires, not just on `enterAdminMode()`.

### 2. Dead import (Fixed ✅)
**File:** `app.js:6`
`child` is imported from Firebase but never used.
**Fix:** Remove it.

### 3. Token overflow on shared tiles (Fixed ✅)
**File:** `app.js:renderTokens()`, `style.css:.token-stack`
When 3+ players share a tile, tokens overflow the tile boundary.
**Fix:** Cap visible tokens at 2 and show a `+N` overflow badge.

### 4. No feedback during 4-second login wait (Fixed ✅)
**File:** `app.js:296`, `index.html` login modal
The Login button appears frozen while waiting for Firebase timeout.
**Fix:** Disable the button and show "Connecting…" during the wait.

---

## Next Steps — Priority Order

### Phase A — Firebase Setup & Deployment (Prerequisite)
One-time tasks the project owner must complete before the site is live.

- [x] Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
- [x] Enable Realtime Database → Start in test mode
- [x] Copy the config object into `firebase-config.js` (replace all `YOUR_*` placeholders)
- [x] Set Realtime Database security rules (see below)
- [x] Push to GitHub → Settings → Pages → Source: `main` branch, root `/`
- [x] Open the live URL → Admin Login → enter your chosen passphrase (auto-saved on first use)

**Recommended Database Rules:**
```json
{
  "rules": {
    "adminPass": {
      ".read": false,
      ".write": true
    },
    "players": {
      ".read": true,
      ".write": true
    },
    "tileLayout": {
      ".read": true,
      ".write": true
    }
  }
}
```
> Test mode rules (`.write: true`) are fine for a controlled event. Tighten after the event if needed.

---

### Phase B — UX Polish (Recommended before first event use)

#### B1. Login loading state ✅
Add a spinner / "Connecting…" label and disable the button while the Firebase passphrase check is in flight (up to 4 seconds).
- **Files:** `index.html` (spinner in login modal), `app.js:284`

#### B2. Quick-step move buttons ✅
Add `−1` / `+1` / `+5` / `−5` buttons next to the position input in the Move modal so the admin can advance players quickly without typing tile numbers.
- **Files:** `index.html` (move-modal), `app.js:471`

#### B3. Token overflow cap ✅
When 3+ players share a tile, show 2 tokens and a `+N` badge instead of overflowing.
- **Files:** `app.js:renderTokens()`, `style.css`

#### B4. Tile effect tooltips
On hover over any special tile, show a brief tooltip explaining its effect (supplements the legend).
- **Files:** `app.js:buildBoard()`, `style.css`

#### B5. Remove dead `child` import ✅
- **File:** `app.js:6`

---

### Phase C — Feature Additions (Optional / Post-Event)

#### C1. Activity log
A scrollable sidebar panel showing recent moves: `"Alice: tile 32 → 45"`. Written to Firebase `/log` by the admin on each move.
- **Files:** `index.html`, `app.js`, `style.css`

#### C2. Tile effect automation
When a player lands on a Boost or Block tile, offer the admin a one-click confirmation to auto-apply the tile's jump (forward to next Boost / back to previous Block).
- **File:** `app.js` — hook into `moveConfirmBtn`

#### C3. Stronger admin auth
Replace the shared passphrase with Firebase Anonymous Auth + a server-side admin flag. Prevents access if the passphrase leaks.
- Requires: Firebase Auth enabled, Security Rules updated, `app.js` auth flow rewritten

#### C4. URL-based view routing
Support `?admin=1` so admin bookmarks survive tab closes (currently only `sessionStorage`).
- **File:** `app.js` boot + `enterAdminMode` / `exitAdminMode`

#### C5. Game history snapshots
Before each Reset, write the current state to `/gameHistory/<timestamp>` so past sessions are preserved in Firebase.
- **File:** `app.js:resetGameBtn` handler

#### C6. Win animation
When a player reaches tile 120, trigger a confetti animation on all connected screens via a Firebase `/event` flag.
- **Files:** Add `canvas-confetti` CDN, `app.js` players listener

---

## File Map

```
/
├── index.html          — HTML shell, all modal markup, view routing hooks
├── style.css           — Full styling: CSS variables, tile types, admin panel, modals
├── app.js              — Board render, Firebase sync, admin auth, player management
├── firebase-config.js  — Firebase credentials (must be filled in by the owner)
├── PLAN.md             — This file
└── README.md           — Setup & usage guide for deployment
```

## Architecture Notes

- **No build step** — plain ES modules, Firebase SDK from CDN (`gstatic.com`).
- **Offline mode** — if Firebase config is placeholder or unreachable, the app falls back to local in-memory state. Detected via a 4-second timeout on the admin passphrase read; `isOffline` flag gates all write paths.
- **Board layout** — CSS Grid (22 cols × 6 rows). Each tile's `gridRow` / `gridColumn` is computed by `tileGridPosition(n)` using the boustrophedon rule (odd rows L→R, even rows R→L).
- **Token rendering** — `.token-stack` divs are cleared and rebuilt from `players` state on every Firebase update or local state change.
- **Tile layout** — stored in Firebase at `/tileLayout` as four arrays. Falls back to `DEFAULT_TILES` (hardcoded from the reference image) when no Firebase data exists.
