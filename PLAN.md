# Mission 3X — Web Game Implementation Plan

## Overview

A web-based board game tracker inspired by the Mission 3X game board shown. It faithfully reproduces the 120-tile snaking board with all special tile types, real-time player position tracking, and a two-role access model (Admin / User). No dice logic is built in — the Admin manually advances players.

---

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Vanilla HTML + CSS + JavaScript (single-page, no build step) | Zero-config, instantly deployable everywhere |
| Real-time sync | Firebase Realtime Database (free Spark plan) | WebSocket-backed, free tier is ample, works from static hosting |
| Hosting | GitHub Pages (or any static host) | Free, no server needed |
| Auth (admin) | Simple shared passphrase stored in Firebase + sessionStorage | No user accounts needed; quick for an event setting |

> All free. No backend server. The only external dependency is Firebase (CDN-loaded).

---

## Board Specification (from image)

### Layout
- **120 tiles**, numbered 1–120
- **Snake path**: rows alternate direction (boustrophedon)
  - Row 1: tiles 1–20 (left → right)
  - Row 2: tiles 21–40 (right → left, displayed 40…21)
  - Row 3: tiles 41–60 (left → right)
  - Row 4: tiles 61–80 (right → left)
  - Row 5: tiles 81–100 (left → right)
  - Row 6: tiles 101–120 (right → left)
- **START** before tile 1, **FINISH** at tile 120

### Tile Types (from legend)
| Type | Color | Mechanic |
|---|---|---|
| Basic (基础格) | Dark/neutral | No effect, normal stop |
| Boost (加速格 ») | Green | Jump forward to next Boost tile |
| Block (阻碍格) | Red | Sent back to previous Block tile |
| Treasure (宝箱格) | Gold | Draw a Bonus card, receive reward |
| Challenge (挑战格) | Purple | Must complete challenge to stay; fail → return to pre-roll position |

### Special Tile Positions (read from image)
```
Boost  (»): 6, 14, 27, 36, 48, 55, 63, 71, 86, 95, 105, 117
Block  (🚧): 18, 32, 50, 76, 91, 111
Treasure (📦): 8, 30, 43, 53, 70, 89, 99, 109
Challenge (🏆): 11, 22, 38, 45, 58, 65, 74, 84, 94, 113
```
*(Exact positions confirmed from board image; to be fine-tuned during implementation)*

---

## Views

### User View (`/` or `?view=user`)
- Read-only live board
- Sees all player tokens with names and positions
- Auto-updates in real time (Firebase listener)
- No controls visible

### Admin View (`?view=admin` + passphrase)
- All User View content PLUS:
  - **Add Player** — enter player name, choose avatar color, place at START
  - **Move Player** — select player, enter target tile number (or +/- step)
  - **Remove Player**
  - **Reset Game**
  - **Announce** — optional overlay message pushed to all views
- Admin session persists in sessionStorage until tab is closed

---

## File Structure

```
/
├── index.html          # Main entry point (both views share one page)
├── style.css           # All styling — dark sci-fi theme matching Mission 3X
├── app.js              # Game logic, Firebase sync, view routing
├── firebase-config.js  # Firebase project credentials (public; safe for client)
└── PLAN.md             # This file
```

---

## Implementation Checklist

### Phase 1 — Project Scaffold
- [ ] Create `index.html` with HTML shell, Firebase SDK CDN imports
- [ ] Create `firebase-config.js` with placeholder config (user fills in their own)
- [ ] Create `style.css` with CSS variables for the sci-fi color palette
- [ ] Set up basic routing: detect `?view=admin` query param

### Phase 2 — Board Rendering
- [ ] Define tile data array (1–120) with type annotations
- [ ] Render 6 rows × 20 tiles in correct boustrophedon order
- [ ] Style each tile type (basic, boost, block, treasure, challenge) with neon glow matching the image
- [ ] Add START and FINISH end-caps
- [ ] Add legend panel below board

### Phase 3 — Firebase Integration
- [ ] Define Realtime Database schema:
  ```json
  {
    "players": {
      "<id>": { "name": "Alice", "color": "#ff00ff", "position": 1 }
    },
    "announcement": ""
  }
  ```
- [ ] Implement `onValue` listener — re-render player tokens on any change
- [ ] Implement write helpers: `addPlayer`, `movePlayer`, `removePlayer`, `resetGame`

### Phase 4 — Player Token Rendering
- [ ] Render colored avatar circles on the correct tile
- [ ] Stack tokens when multiple players share a tile
- [ ] Show player name tooltip/label on hover

### Phase 5 — Admin Panel
- [ ] Admin login modal (passphrase check against Firebase value)
- [ ] Add Player form (name + color picker)
- [ ] Move Player controls (select dropdown + target tile input)
- [ ] Remove Player button per player
- [ ] Reset Game button (confirm dialog)
- [ ] Announcement text push

### Phase 6 — Polish & Responsiveness
- [ ] Match the dark sci-fi aesthetic: deep navy background, neon cyan/green/purple glows
- [ ] Tile number overlays in correct corners (matching image)
- [ ] Tile type icons (>>, 🚫, 📦, 🏆)
- [ ] Mobile-friendly scaling (CSS transform scale on the board)
- [ ] Smooth token transition animations when positions update
- [ ] Announcement overlay banner on all views

### Phase 7 — Deployment
- [ ] Add `README.md` with setup instructions (create Firebase project, paste config, enable GitHub Pages)
- [ ] Verify on GitHub Pages

---

## Firebase Setup (for end user)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → New project (free)
2. Enable **Realtime Database** in test mode
3. Copy the config object into `firebase-config.js`
4. Deploy the files to GitHub Pages or any static host
5. Set the admin passphrase once in the Firebase DB at `/adminPass`

---

## Out of Scope

- Dice rolling mechanics (handled outside)
- Card deck management
- Player authentication / accounts
- Mobile app / PWA

---

## Open Questions for Approval

1. **Tile positions** — Should I use the exact tile numbers from the image, or do you want to adjust any special tile locations?
2. **Admin auth** — A shared passphrase is simplest. Is that sufficient, or do you need per-user admin logins?
3. **Player avatars** — Color circles with initials, or do you want custom icons/images?
4. **Announcement feature** — Include or skip for now?
5. **Firebase** — Are you comfortable creating a free Firebase project, or do you prefer a different real-time backend (e.g., Supabase, Ably)?
