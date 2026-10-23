# DARTS TRAINING LAB — RETRO DARTS

A retro arcade-style COUNT-UP, 01 and CRICKET practice app for darts, including DARTSLIVE-200S input.

## Start
- Open `index.html` with its companion `styles.css` and `app.js` on a static server, or open `preview.html` for a standalone browser preview.
- All personal practice records are stored locally in the browser (`dtl-data-v1`).
- Source: https://github.com/RyutanCAMP/darts-training-lab

## Features (v0.9.0-beta.1)
- CRICKET (standard): 15–20 and BULL (outer 1 mark, inner 2 marks, 25 points per mark), 15 rounds. Solo practice shows points and MPR and ends when everything is closed; local 2-player matches use the same handoff as 01. Closing everything with points equal or ahead wins; at the round limit the higher score wins, equal points is a draw. The left panel shows the mark board and non-cricket segments are dimmed.
- Landscape-first play arena: central board, round history on the left, turn controls on the right, and player scores below. Recent rounds expand to the full list; portrait layouts remain supported.
- Match setup starts with `プレーヤー1` / `プレーヤー2`, so no typing is required. Each slot can choose guest or the currently logged-in account; selecting it on one side makes the other side a guest. Account ID and display name are stored separately in local match records.
- Local 2-player 01: tap `2人対戦`, enter both player names and choose 301 / 501 / 701. P1 starts; three darts or a bust hands off to the other player after confirmation (button or 200S CHANGE). First checkout wins; both finish 20 rounds without checkout = draw.
- Player names, separate scores, throw ownership, handoff state, undo, resume and match results are saved locally. Matches support JSON/CSV backup but stay out of cloud sync and solo COUNT-UP analysis.
- CHECKOUT guide: up to three exact-zero routes for the remaining darts, using the current open-out / 50-point bull rules. For example, 20 → S20 or D10. Updates after throws, busts and undo.
- 01: solo 301 / 501 / 701, straight in, open out, 50-point bulls, up to 20 rounds. Exact-zero checkout, round rollback on bust, undo, automatic local resume, results/history, JSON/CSV and cloud sync.
- Choose COUNT-UP or an 01 start score in the PLAY screen's GAME selector. Switching during a game offers to save the current game first.
- Analysis and COUNT-UP records stay scoped to COUNT-UP; 01 results and actual throws are available in history. No official rating or 01 PPD is calculated.
- COUNT-UP: 8 rounds × 3 darts; scoring, MISS, undo, local results/history.
- Manual input and DARTSLIVE-200S keyboard/calibration support.
- Retro audio/visual effects and mobile-friendly layout.
- Analysis: 1R / 10R / 20R / ALL, with 10R default on entry. Only completed 3-dart rounds are counted.
- BULL metrics, per-dart throw-order rates, all-time achievements, score trend.
- AIM ANALYSIS segment/ring heatmap and expandable A CLASS analytics.
- AIM TARGET (settings): BULL / T1–T20 / D1–D20 is recorded per dart; analysis is shown per aim. Older records count as BULL.
- Per-card "?" help and a rule-based COACH REPORT (not an AI model) on the Analysis screen.
- INSIGHT facts, per-dart drift, 95% ranges (REF = fewer than 20 throws), round score curve, score breakdown, goal gap, practice log.

## Source files
- `index.html`: markup
- `styles.css`: styles
- `app.js`: private shared context, feature connections, initialization order
- `core/`: initial state; `game/`: COUNT-UP rules, progress and round breaks
- `game/zero-one.js`: 01 replay/validation and game-aware operation routing; `ui/zero-one.js`: 01 score, rounds and result display
- `game/cricket.js`: cricket replay/validation and throw handling; `ui/cricket.js`: mark board, points/MPR and result display
- `board/`: SVG board, keyboard input and 200S calibration
- `audio/`: sounds, music and visual effects
- `storage/`: local recovery, backup/restore, round exclusions and Firebase sync
- `analysis/`: statistics, heatmap, periods and coach report
- `ui/`: rendering, navigation, settings, help, MY DARTS and catalog
- `preview.html`: standalone preview with embedded styles and script — **keep in sync**
- `data/200s-keymap.json`: keyboard mapping data
- `CLAUDE.md`: development handoff, detailed rules, regression checklist

## Design and accuracy
- Favor clear graphics, short labels, and minimal explanatory text.
- Segment hits are not precise x/y coordinates. Never present inferred locations as measured.
- Do not invent official ratings from COUNT-UP scores.
- Preserve backward compatibility with localStorage records.
- Public repo: never commit personal practice data or secrets.

## Development
For the latest 01 checkpoint and next steps, read [the AI handoff (2026-10-23)](docs/ai-handoff-2026-10-23.md).

See [CLAUDE.md](CLAUDE.md) before editing. Test runtime rendering and the standalone mobile preview before reporting completion.

Run `python tools/sync-preview.py` after source changes; `index.html` lists all feature scripts in loading order and `app.js` runs last. Each script registers a private connector. The temporary `RETRO_DARTS_MODULES` registry is removed at startup; application state stays private. There are no framework or runtime dependencies.

Run `python tools/serve-preview.py` for a local preview, or `python tools/serve-preview.py --lan` to print URLs for a phone on the same network (the PC must remain running and allow inbound access). `preview.html` also works directly as a single file. Run `python tools/run-tests.py` for browser tests and preview consistency. See [the refactoring report](docs/module-refactor.md) for responsibilities, verification and limitations.

See [the v0.6.0 beta release notes](docs/release-0.6.0-beta.1.md) for the 01 rules, record compatibility, and validation limits.
See [v0.7.0 beta](docs/release-0.7.0-beta.1.md) for local matches.
See [v0.7.0 beta.2](docs/release-0.7.0-beta.2.md) for default player names and account selection.
