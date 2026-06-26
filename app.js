// ═══════════════════════════════════════════════════════════
//  Mission 3X — App Logic
// ═══════════════════════════════════════════════════════════

import { initializeApp }        from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, get, update, remove, onValue }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ── Init Firebase ──────────────────────────────────────────
let db = null;
try {
  const firebaseApp = initializeApp(window.FIREBASE_CONFIG);
  db = getDatabase(firebaseApp);
} catch (e) {
  console.warn("Firebase init failed — running in offline/demo mode.", e);
}

// ── Default tile layout (from board image) ─────────────────
const DEFAULT_TILES = {
  boost:     [6,  14, 27, 36, 48, 55, 63, 71, 86, 95, 105, 117],
  block:     [18, 32, 50, 76, 91, 111],
  treasure:  [8,  30, 43, 53, 70, 89, 99, 109],
  challenge: [11, 22, 38, 45, 58, 65, 74, 84, 94, 113],
};

// ── Avatar color presets ───────────────────────────────────
const COLOR_PRESETS = [
  "#00e5ff","#00ff88","#ff2244","#ffc700","#cc44ff",
  "#ff6600","#ff44aa","#44aaff","#ffffff","#aaffcc",
];

// ── State ──────────────────────────────────────────────────
let isAdmin      = false;
let isOffline    = false; // true when Firebase is unreachable
let players      = {};     // { id: { name, color, position, avatarType, avatarValue } }
let tileLayout   = { ...DEFAULT_TILES };
let editingPlayerId = null; // for add/edit modal
let movingPlayerId  = null;
let deletingPlayerId = null;

// ── DOM refs ───────────────────────────────────────────────
const boardEl         = document.getElementById("board");
const adminPanel      = document.getElementById("admin-panel");
const viewBadge       = document.getElementById("view-badge");
const adminToggleBtn  = document.getElementById("admin-toggle-btn");
const adminLogoutBtn  = document.getElementById("admin-logout-btn");
const playerListEl    = document.getElementById("player-list");

// Login modal
const loginModal      = document.getElementById("login-modal");
const passphraseInput = document.getElementById("passphrase-input");
const loginError      = document.getElementById("login-error");
const loginCancelBtn  = document.getElementById("login-cancel-btn");
const loginConfirmBtn = document.getElementById("login-confirm-btn");

// Player modal
const playerModal       = document.getElementById("player-modal");
const playerModalTitle  = document.getElementById("player-modal-title");
const playerNameInput   = document.getElementById("player-name-input");
const playerColorInput  = document.getElementById("player-color-input");
const colorPresetsEl    = document.getElementById("color-presets");
const playerPosInput    = document.getElementById("player-pos-input");
const playerCancelBtn   = document.getElementById("player-cancel-btn");
const playerConfirmBtn  = document.getElementById("player-confirm-btn");
const avatarEmojiRow    = document.getElementById("avatar-emoji-row");
const avatarImageRow    = document.getElementById("avatar-image-row");
const avatarEmojiInput  = document.getElementById("avatar-emoji-input");
const avatarImageInput  = document.getElementById("avatar-image-input");

// Move modal
const moveModal      = document.getElementById("move-modal");
const movePlayerName = document.getElementById("move-player-name");
const movePosInput   = document.getElementById("move-pos-input");
const moveCancelBtn  = document.getElementById("move-cancel-btn");
const moveConfirmBtn = document.getElementById("move-confirm-btn");

// Delete modal
const deleteModal      = document.getElementById("delete-modal");
const deletePlayerName = document.getElementById("delete-player-name");
const deleteCancelBtn  = document.getElementById("delete-cancel-btn");
const deleteConfirmBtn = document.getElementById("delete-confirm-btn");

// Tile editor
const editBoost     = document.getElementById("edit-boost");
const editBlock     = document.getElementById("edit-block");
const editTreasure  = document.getElementById("edit-treasure");
const editChallenge = document.getElementById("edit-challenge");
const saveTilesBtn  = document.getElementById("save-tiles-btn");
const resetGameBtn  = document.getElementById("reset-game-btn");
const addPlayerBtn  = document.getElementById("add-player-btn");

// ══════════════════════════════════════════════════════════
//  BOARD RENDERING
// ══════════════════════════════════════════════════════════

function getTileType(num) {
  if (tileLayout.boost.includes(num))     {return "boost";}
  if (tileLayout.block.includes(num))     {return "block";}
  if (tileLayout.treasure.includes(num))  {return "treasure";}
  if (tileLayout.challenge.includes(num)) {return "challenge";}
  return "basic";
}

// Build the physical column index for a tile given its row direction
// Row 1 (1-20): L→R  → col 1..20 in grid columns 2..21
// Row 2 (21-40): R→L → tile 40 at col 2, tile 21 at col 21
// etc.
function tileGridPosition(num) {
  const row    = Math.ceil(num / 20);         // 1-6
  const offset = (num - 1) % 20;             // 0-19 within the row
  const ltr    = (row % 2 === 1);            // odd rows go left→right
  const col    = ltr ? offset + 2 : 21 - offset; // grid col (1-indexed; col 1 = start cap, col 22 = end cap for row 1)
  return { row, col };
}

function buildBoard() {
  boardEl.innerHTML = "";

  // Helper to place a cell at a specific grid position
  function place(el, row, col) {
    el.style.gridRow    = row;
    el.style.gridColumn = col;
    boardEl.appendChild(el);
  }

  // ── Start cap (row 1, col 1) ──
  const startEl = document.createElement("div");
  startEl.className = "tile tile-start";
  startEl.innerHTML = `<span class="cap-label">START</span><span class="cap-arrows">>>>></span>`;
  place(startEl, 1, 1);

  // ── Finish cap (row 6, col 1) ──
  const finishEl = document.createElement("div");
  finishEl.className = "tile tile-finish";
  finishEl.innerHTML = `<span class="cap-number">120</span><span class="cap-label">FINISH</span>`;
  place(finishEl, 6, 1);

  // ── Corner arrows between rows ──
  // After row 1 (right end) → down arrow at col 22, between row 1 & 2
  // But we only have 6 grid rows, so corners are tricky — we'll overlay them
  // using the last or first column of the next row with a styled arrow cell.
  const corners = [
    { row: 1, col: 22, arrow: "↓" },  // end of row 1 (right side)
    { row: 2, col: 1,  arrow: "↓" },  // end of row 2 (left side)
    { row: 3, col: 22, arrow: "↓" },
    { row: 4, col: 1,  arrow: "↓" },
    { row: 5, col: 22, arrow: "↓" },
  ];
  corners.forEach(({ row, col, arrow }) => {
    const el = document.createElement("div");
    el.className = "tile tile-corner";
    el.innerHTML = `<span class="corner-arrow">${arrow}</span>`;
    place(el, row, col);
  });

  // ── 120 tiles ──
  for (let n = 1; n <= 120; n++) {
    const type = getTileType(n);
    const { row, col } = tileGridPosition(n);

    const el = document.createElement("div");
    el.className = `tile tile-${type}`;
    el.dataset.tile = n;

    let iconHtml = "";
    if (type === "boost")     {iconHtml = `<span class="tile-icon">»</span>`;}
    if (type === "block")     {iconHtml = `<span class="tile-icon">🚧</span>`;}
    if (type === "treasure")  {iconHtml = `<span class="tile-icon">📦</span>`;}
    if (type === "challenge") {iconHtml = `<span class="tile-icon">🏆</span>`;}

    el.innerHTML = `<span class="tile-number">${n}</span>${iconHtml}<div class="token-stack"></div>`;
    place(el, row, col);
  }

  // Place tokens
  renderTokens();
}

// ══════════════════════════════════════════════════════════
//  TOKEN RENDERING
// ══════════════════════════════════════════════════════════

function renderTokens() {
  // Clear all stacks
  document.querySelectorAll(".token-stack").forEach(el => { el.innerHTML = ""; el.classList.remove("stacked"); });

  const byTile = {};
  Object.entries(players).forEach(([id, p]) => {
    const pos = p.position ?? 1;
    if (!byTile[pos]) {byTile[pos] = [];}
    byTile[pos].push({ id, ...p });
  });

  Object.entries(byTile).forEach(([pos, list]) => {
    const tileEl = boardEl.querySelector(`[data-tile="${pos}"]`);
    if (!tileEl) {return;}
    const stack = tileEl.querySelector(".token-stack");
    if (list.length > 1) {stack.classList.add("stacked");}

    list.forEach(p => {
      const token = document.createElement("div");
      token.className = "token";
      token.style.background = p.color || "#00e5ff";

      let inner = "";
      if (p.avatarType === "image" && p.avatarValue) {
        inner = `<img src="${escapeAttr(p.avatarValue)}" alt="${escapeAttr(p.name)}" onerror="this.style.display='none'" />`;
      } else if (p.avatarType === "emoji" && p.avatarValue) {
        inner = `<span style="font-size:1rem;line-height:1">${p.avatarValue}</span>`;
      } else {
        inner = initials(p.name);
      }
      token.innerHTML = `${inner  }<div class="token-tooltip">${escapeHtml(p.name)} · Tile ${pos}</div>`;
      stack.appendChild(token);
    });
  });
}

// ══════════════════════════════════════════════════════════
//  FIREBASE LISTENERS
// ══════════════════════════════════════════════════════════

function startListeners() {
  if (!db || isOffline) {return;}

  // Players
  onValue(ref(db, "players"), snap => {
    players = snap.val() ?? {};
    renderTokens();
    if (isAdmin) {renderAdminPlayerList();}
  });

  // Tile layout — only rebuild when Firebase returns real data
  onValue(ref(db, "tileLayout"), snap => {
    const data = snap.val();
    if (data) {
      tileLayout = {
        boost:     data.boost     ?? DEFAULT_TILES.boost,
        block:     data.block     ?? DEFAULT_TILES.block,
        treasure:  data.treasure  ?? DEFAULT_TILES.treasure,
        challenge: data.challenge ?? DEFAULT_TILES.challenge,
      };
      buildBoard();
      if (isAdmin) {populateTileEditor();}
    }
  });
}

// ══════════════════════════════════════════════════════════
//  ADMIN AUTH
// ══════════════════════════════════════════════════════════

function enterAdminMode() {
  isAdmin = true;
  sessionStorage.setItem("mission3x_admin", "1");
  viewBadge.textContent = "ADMIN VIEW";
  viewBadge.className = "view-badge admin-badge";
  adminToggleBtn.classList.add("hidden");
  adminLogoutBtn.classList.remove("hidden");
  adminPanel.classList.remove("hidden");
  renderAdminPlayerList();
  populateTileEditor();
}

function exitAdminMode() {
  isAdmin = false;
  sessionStorage.removeItem("mission3x_admin");
  viewBadge.textContent = "USER VIEW";
  viewBadge.className = "view-badge user-badge";
  adminToggleBtn.classList.remove("hidden");
  adminLogoutBtn.classList.add("hidden");
  adminPanel.classList.add("hidden");
}

adminToggleBtn.addEventListener("click", () => {
  loginError.classList.add("hidden");
  passphraseInput.value = "";
  loginModal.classList.remove("hidden");
  setTimeout(() => passphraseInput.focus(), 50);
});

loginCancelBtn.addEventListener("click", () => loginModal.classList.add("hidden"));

loginConfirmBtn.addEventListener("click", async () => {
  const pass = passphraseInput.value.trim();
  if (!pass) {return;}

  if (!db) {
    loginModal.classList.add("hidden");
    enterAdminMode();
    return;
  }

  try {
    // Race the Firebase read against a 4-second timeout
    const snap = await Promise.race([
      get(ref(db, "adminPass")),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000)),
    ]);
    const stored = snap.val();
    if (!stored) {
      await set(ref(db, "adminPass"), pass);
      loginModal.classList.add("hidden");
      enterAdminMode();
    } else if (pass === stored) {
      loginModal.classList.add("hidden");
      enterAdminMode();
    } else {
      loginError.classList.remove("hidden");
    }
  } catch (e) {
    if (e.message === "timeout") {
      // Firebase unreachable — fall back to offline mode
      isOffline = true;
      loginModal.classList.add("hidden");
      enterAdminMode();
    } else {
      loginError.textContent = `Firebase error: ${  e.message}`;
      loginError.classList.remove("hidden");
    }
  }
});

passphraseInput.addEventListener("keydown", e => { if (e.key === "Enter") {loginConfirmBtn.click();} });
adminLogoutBtn.addEventListener("click", exitAdminMode);

// ══════════════════════════════════════════════════════════
//  ADMIN PLAYER LIST
// ══════════════════════════════════════════════════════════

function renderAdminPlayerList() {
  playerListEl.innerHTML = "";
  const entries = Object.entries(players);
  if (entries.length === 0) {
    playerListEl.innerHTML = `<div style="font-size:0.78rem;color:var(--text-dim)">No players yet. Add one above.</div>`;
    return;
  }
  entries.forEach(([id, p]) => {
    const row = document.createElement("div");
    row.className = "player-row";

    let tokenInner = "";
    if (p.avatarType === "image" && p.avatarValue) {
      tokenInner = `<img src="${escapeAttr(p.avatarValue)}" alt="" onerror="this.style.display='none'" />`;
    } else if (p.avatarType === "emoji" && p.avatarValue) {
      tokenInner = p.avatarValue;
    } else {
      tokenInner = initials(p.name);
    }

    row.innerHTML = `
      <div class="player-row-token" style="background:${p.color||'#00e5ff'};color:${contrastColor(p.color||'#00e5ff')}">${tokenInner}</div>
      <div class="player-row-info">
        <div class="player-row-name">${escapeHtml(p.name)}</div>
        <div class="player-row-pos">Tile ${p.position ?? 1}</div>
      </div>
      <div class="player-row-actions">
        <button class="btn btn-ghost btn-sm" data-action="move" data-id="${id}">Move</button>
        <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${id}">Edit</button>
        <button class="btn btn-danger btn-sm" data-action="delete" data-id="${id}">✕</button>
      </div>`;
    playerListEl.appendChild(row);
  });

  playerListEl.querySelectorAll("[data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      if (action === "move")   {openMoveModal(id);}
      if (action === "edit")   {openPlayerModal(id);}
      if (action === "delete") {openDeleteModal(id);}
    });
  });
}

// ══════════════════════════════════════════════════════════
//  ADD / EDIT PLAYER MODAL
// ══════════════════════════════════════════════════════════

addPlayerBtn.addEventListener("click", () => openPlayerModal(null));

function openPlayerModal(id) {
  editingPlayerId = id;
  playerModal.classList.remove("hidden");

  // Build color presets
  colorPresetsEl.innerHTML = "";
  COLOR_PRESETS.forEach(c => {
    const dot = document.createElement("div");
    dot.className = "color-preset";
    dot.style.background = c;
    dot.addEventListener("click", () => {
      playerColorInput.value = c;
      colorPresetsEl.querySelectorAll(".color-preset").forEach(d => d.classList.remove("selected"));
      dot.classList.add("selected");
    });
    colorPresetsEl.appendChild(dot);
  });

  if (id) {
    // Edit mode
    const p = players[id];
    playerModalTitle.textContent = "Edit Player";
    playerNameInput.value  = p.name ?? "";
    playerColorInput.value = p.color ?? "#00e5ff";
    playerPosInput.value   = p.position ?? 1;
    setAvatarType(p.avatarType ?? "initials");
    avatarEmojiInput.value = (p.avatarType === "emoji")  ? (p.avatarValue ?? "") : "";
    avatarImageInput.value = (p.avatarType === "image")  ? (p.avatarValue ?? "") : "";
  } else {
    // Add mode
    playerModalTitle.textContent = "Add Player";
    playerNameInput.value  = "";
    playerColorInput.value = COLOR_PRESETS[Object.keys(players).length % COLOR_PRESETS.length];
    playerPosInput.value   = 1;
    setAvatarType("initials");
    avatarEmojiInput.value = "";
    avatarImageInput.value = "";
  }
  setTimeout(() => playerNameInput.focus(), 50);
}

function setAvatarType(type) {
  document.querySelectorAll("input[name='avatar-type']").forEach(r => { r.checked = r.value === type; });
  avatarEmojiRow.classList.toggle("hidden", type !== "emoji");
  avatarImageRow.classList.toggle("hidden", type !== "image");
}

document.querySelectorAll("input[name='avatar-type']").forEach(r => {
  r.addEventListener("change", () => setAvatarType(r.value));
});

playerCancelBtn.addEventListener("click", () => playerModal.classList.add("hidden"));

playerConfirmBtn.addEventListener("click", async () => {
  const name = playerNameInput.value.trim();
  if (!name) { playerNameInput.focus(); return; }

  const color      = playerColorInput.value;
  const position   = Math.max(1, Math.min(120, parseInt(playerPosInput.value) || 1));
  const avatarType = document.querySelector("input[name='avatar-type']:checked")?.value ?? "initials";
  const avatarValue = avatarType === "emoji"  ? avatarEmojiInput.value.trim()
                    : avatarType === "image"  ? avatarImageInput.value.trim()
                    : "";

  const data = { name, color, position, avatarType, avatarValue };

  if (db && !isOffline) {
    if (editingPlayerId) {
      await update(ref(db, `players/${editingPlayerId}`), data);
    } else {
      const id = `p_${  Date.now()}`;
      await set(ref(db, `players/${id}`), data);
    }
  } else {
    // Offline/demo mode — update local state directly
    const id = editingPlayerId ?? (`p_${  Date.now()}`);
    players[id] = data;
    renderTokens();
    renderAdminPlayerList();
  }
  playerModal.classList.add("hidden");
});

playerNameInput.addEventListener("keydown", e => { if (e.key === "Enter") {playerConfirmBtn.click();} });

// ══════════════════════════════════════════════════════════
//  MOVE MODAL
// ══════════════════════════════════════════════════════════

function openMoveModal(id) {
  movingPlayerId = id;
  const p = players[id];
  movePlayerName.textContent = p.name;
  movePosInput.value = p.position ?? 1;
  moveModal.classList.remove("hidden");
  setTimeout(() => movePosInput.focus(), 50);
}

moveCancelBtn.addEventListener("click", () => moveModal.classList.add("hidden"));

moveConfirmBtn.addEventListener("click", async () => {
  const pos = Math.max(1, Math.min(120, parseInt(movePosInput.value) || 1));
  if (db && !isOffline) {
    await update(ref(db, `players/${movingPlayerId}`), { position: pos });
  } else {
    if (players[movingPlayerId]) {players[movingPlayerId].position = pos;}
    renderTokens();
    renderAdminPlayerList();
  }
  moveModal.classList.add("hidden");
});

movePosInput.addEventListener("keydown", e => { if (e.key === "Enter") {moveConfirmBtn.click();} });

// ══════════════════════════════════════════════════════════
//  DELETE MODAL
// ══════════════════════════════════════════════════════════

function openDeleteModal(id) {
  deletingPlayerId = id;
  deletePlayerName.textContent = players[id]?.name ?? id;
  deleteModal.classList.remove("hidden");
}

deleteCancelBtn.addEventListener("click", () => deleteModal.classList.add("hidden"));

deleteConfirmBtn.addEventListener("click", async () => {
  if (db && !isOffline) {
    await remove(ref(db, `players/${deletingPlayerId}`));
  } else {
    delete players[deletingPlayerId];
    renderTokens();
    renderAdminPlayerList();
  }
  deleteModal.classList.add("hidden");
});

// ══════════════════════════════════════════════════════════
//  TILE EDITOR
// ══════════════════════════════════════════════════════════

function populateTileEditor() {
  editBoost.value     = tileLayout.boost.join(", ");
  editBlock.value     = tileLayout.block.join(", ");
  editTreasure.value  = tileLayout.treasure.join(", ");
  editChallenge.value = tileLayout.challenge.join(", ");
}

function parseNums(str) {
  return str.split(",")
    .map(s => parseInt(s.trim()))
    .filter(n => !isNaN(n) && n >= 1 && n <= 120);
}

saveTilesBtn.addEventListener("click", async () => {
  const layout = {
    boost:     parseNums(editBoost.value),
    block:     parseNums(editBlock.value),
    treasure:  parseNums(editTreasure.value),
    challenge: parseNums(editChallenge.value),
  };
  if (db && !isOffline) {
    await set(ref(db, "tileLayout"), layout);
  } else {
    tileLayout = layout;
    buildBoard();
  }
});

// ══════════════════════════════════════════════════════════
//  RESET GAME
// ══════════════════════════════════════════════════════════

resetGameBtn.addEventListener("click", async () => {
  if (!confirm("Reset the game? This will remove ALL players and restore the default tile layout.")) {return;}
  if (db && !isOffline) {
    await set(ref(db, "players"), null);
    await set(ref(db, "tileLayout"), DEFAULT_TILES);
  } else {
    players = {};
    tileLayout = { ...DEFAULT_TILES };
    buildBoard();
    renderAdminPlayerList();
    populateTileEditor();
  }
});

// ══════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════

function initials(name) {
  if (!name) {return "?";}
  const words = name.trim().split(/\s+/);
  return words.length > 1
    ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

function escapeAttr(s) {
  return String(s).replace(/"/g, "&quot;");
}

function contrastColor(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return (r*299 + g*587 + b*114) / 1000 > 128 ? "#000" : "#fff";
}

// ══════════════════════════════════════════════════════════
//  BOOT
// ══════════════════════════════════════════════════════════

// Always render the board immediately with defaults
buildBoard();

// Start Firebase listeners (no-op if db is null)
startListeners();

// Restore admin session
if (sessionStorage.getItem("mission3x_admin") === "1") {
  setTimeout(enterAdminMode, 100);
}
