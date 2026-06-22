# Mission 3X — Web Board Game Tracker

A real-time snake-and-ladder style board game tracker for the **Mission 3X** event. Features a 120-tile sci-fi board with live player tracking, two access roles (Admin / User), and a fully customisable tile layout.

---

## Features

- **120-tile board** matching the Mission 3X layout (Boost, Block, Treasure, Challenge tiles)
- **Real-time sync** — all connected browsers see player moves instantly
- **Admin view** — add/edit/move/remove players, customise tile positions, reset game
- **User view** — read-only live board, no login required
- **Player avatars** — initials, emoji, or custom image URL
- **No dice logic** — positions are set manually by the admin (as designed)

---

## Quick Start

### 1. Create a Firebase project (free)

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → follow the wizard (no need to enable Analytics)
3. In the left sidebar → **Build → Realtime Database → Create database**
4. Choose **Start in test mode** → Done
5. In **Project settings** (gear icon) → **Your apps** → click **</>** (Web)
6. Register the app → copy the `firebaseConfig` object

### 2. Paste the config

Open `firebase-config.js` and replace the placeholder values:

```js
window.FIREBASE_CONFIG = {
  apiKey:            "AIza...",
  authDomain:        "my-project.firebaseapp.com",
  databaseURL:       "https://my-project-default-rtdb.firebaseio.com",
  projectId:         "my-project",
  storageBucket:     "my-project.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123...:web:abc..."
};
```

### 3. Deploy to GitHub Pages

1. Push this repo to GitHub
2. **Settings → Pages → Source**: set to `main` branch, `/ (root)` folder
3. Your site will be live at `https://<username>.github.io/<repo>/`

Or just open `index.html` directly in a browser for local use (requires a web server due to ES modules — use VS Code Live Server, `npx serve .`, etc.).

### 4. Set the admin passphrase

- Open the site → click **Admin Login** → type any passphrase → Login
- The first passphrase entered is saved to Firebase as the admin password
- All subsequent admin logins require this passphrase

---

## Usage

### User View (default)
Open the URL in any browser. No login needed. The board updates in real time as the admin moves players.

### Admin View
Click **Admin Login** in the top-right corner and enter the passphrase. You'll see the Admin Panel appear on the right with:

| Control | Description |
|---|---|
| Add Player | Enter name, pick colour, choose avatar type, set starting tile |
| Move | Jump a player to any tile (1–120) |
| Edit | Change name, colour, or avatar |
| Remove | Remove a player from the game |
| Special Tiles | Edit which tile numbers are Boost / Block / Treasure / Challenge |
| Reset Game | Remove all players and restore default tile layout |

---

## Tile Types

| Type | Default tiles | Effect |
|---|---|---|
| Boost (») | 6, 14, 27, 36, 48, 55, 63, 71, 86, 95, 105, 117 | Jump forward to next Boost tile |
| Block (🚧) | 18, 32, 50, 76, 91, 111 | Go back to previous Block tile |
| Treasure (📦) | 8, 30, 43, 53, 70, 89, 99, 109 | Draw a Bonus card |
| Challenge (🏆) | 11, 22, 38, 45, 58, 65, 74, 84, 94, 113 | Complete a challenge or return to pre-roll position |

Tile positions can be edited live by the admin without redeploying.

---

## Tech Stack

- **HTML / CSS / JavaScript** — no build step, no npm
- **Firebase Realtime Database** — real-time sync (free Spark plan)
- **GitHub Pages** — free static hosting
