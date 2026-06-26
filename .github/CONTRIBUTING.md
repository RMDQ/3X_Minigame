# Contributing to Mission 3X

## Quick start

```bash
npm install          # install linting dev tools
npm run lint         # run all linters at once
```

Node 18+ required. No build step — the site is plain HTML/CSS/JS.

---

## Branch & PR rules

| Rule | Detail |
|---|---|
| Branch off `main` | Always create feature branches from the latest `main` |
| One concern per PR | Keep PRs focused — a bug fix and a feature should be separate PRs |
| PR template required | Fill in all three sections: **What**, **Why**, **Test plan** |
| CI must pass | All three linters (ESLint, Stylelint, HTMLHint) must be green before merge |
| No force-push to `main` | Use a new commit to fix review feedback |

### Branch naming

```
fix/<short-description>       bug fixes
feat/<short-description>      new features
chore/<short-description>     tooling, config, docs
```

---

## Code style

### JavaScript (`app.js`)

Enforced by **ESLint** (`eslint.config.js`). Key rules:

| Rule | Requirement |
|---|---|
| Variables | `const` / `let` only — no `var` |
| Equality | Always `===` / `!==` |
| Strings | Template literals for interpolation, not `+` concatenation |
| Braces | Always use `{}` on `if` / `for` blocks, even single-line |
| Security | No `eval`, `new Function`, or `innerHTML` with unsanitised user data |
| Unused code | No unused variables or imports |
| Console | `console.warn` / `console.error` are allowed; `console.log` is a warning |

Run: `npm run lint:js`

### CSS (`style.css`)

Enforced by **Stylelint** (`.stylelintrc.json`, extends `stylelint-config-standard`).

| Rule | Requirement |
|---|---|
| Selectors | kebab-case only (`.player-row`, not `.playerRow`) |
| CSS variables | kebab-case only (`--bg-panel`, not `--bgPanel`) |
| Colors | No named colors (`red`, `blue`) — use hex or CSS variables |
| Duplicates | No duplicate properties or selectors |

Use existing CSS variables (`--cyan`, `--bg-panel`, etc.) before adding new ones.

Run: `npm run lint:css`

### HTML (`index.html`)

Enforced by **HTMLHint** (`.htmlhintrc`).

| Rule | Requirement |
|---|---|
| IDs | Must be unique across the document |
| Tag names | Lowercase only |
| Attribute values | Double-quoted |
| Images | `alt` attribute required |
| Doctype | `<!DOCTYPE html>` required |

Run: `npm run lint:html`

---

## PR description format

Every PR must use the template in `.github/pull_request_template.md`. The CI workflow checks that the description contains the three required sections:

```
## What      — what changed and in which files
## Why       — motivation / PLAN.md reference
## Test plan — checklist of manual + lint verification steps
```

PRs with a missing or stub description (< 50 characters) will fail the `validate-pr-description` CI check.

---

## Firebase / runtime concerns

- **Never commit real Firebase credentials.** `firebase-config.js` is in `.gitignore`-territory by convention — it holds placeholder `YOUR_*` values in the repo. Users fill it in locally or via environment injection.
- **No secrets in PR descriptions or commit messages.**
- All writes to Firebase are gated by `if (db && !isOffline)` — make sure any new write paths follow this pattern.

---

## Making changes to the board layout

The tile map is defined in `DEFAULT_TILES` in `app.js`. Special tile positions are also stored in Firebase at `/tileLayout` and can be edited live by the admin. If you change `DEFAULT_TILES`:

1. Update the positions to match the physical board.
2. Note the change in the PR description under **Why**.
3. The `resetGame` action resets to `DEFAULT_TILES`, so changes there affect all future resets.

---

## File map

```
app.js              — all game logic (board render, Firebase, admin, player management)
style.css           — all styling (CSS variables at the top, then components)
index.html          — HTML shell + modal markup
firebase-config.js  — Firebase credentials (not committed with real values)
eslint.config.js    — ESLint flat config
.stylelintrc.json   — Stylelint config
.htmlhintrc         — HTMLHint config
.github/
  workflows/ci.yml              — GitHub Actions CI
  pull_request_template.md      — PR template (auto-loaded by GitHub)
  CONTRIBUTING.md               — This file
PLAN.md             — Roadmap and known issues
README.md           — Setup and deployment guide
```
