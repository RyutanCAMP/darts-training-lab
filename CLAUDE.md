# Claude development handoff — DARTS TRAINING LAB

## 01 checkpoint (2026-10-23)

Read `docs/ai-handoff-2026-10-23.md` first for the current branch, landscape layout, verification, and remaining work. This checkpoint includes the 01 solo/local-match implementation and the landscape-first arena on top of the unmerged module refactor. `docs/zero-one-preparation.md` is historical design material, not the current implementation status.

## Latest: v0.8.0-beta.1 (2026-10-23 checkpoint)

- Landscape-first arena with central board, side panels, bottom score dock, recent/all-round toggle, and collapsible details. Layout/rotation/input coverage: `tools/tests/test_arena_layout.py`. Read the checkpoint handoff for verification and remaining work.

- Match form defaults to `プレーヤー1` / `プレーヤー2`. `ui/match-accounts.js` owns guest/current-account selection and is registered before any initializers; its initializer runs after zeroOne and before event wiring. `cloudUi` refreshes its options on auth changes.
- At most one participant may have optional `account: {provider:'google',uid}`. Name is a snapshot separate from account UID; metadata is not proof of authentication and grants no access. Guest name edits are restored when toggling back from account selection. Existing match records are never rewritten by login/logout.
- The account selector only offers the current signed-in user; no other account directory or multi-user login is fetched. All matches remain local and excluded from cloud sync. See `docs/release-0.7.0-beta.2.md`.

- Local 2-player 01 starts with the names form (`matchSheet` / `matchForm`). Sessions have `players: [{id:'p1',name}, {id:'p2',name}]`; every match dart has `playerIndex: 0|1`.
- `evaluateZero` delegates to match replay for sessions with players. Round N contains P1's turn and then P2's; never derive match round/player from dart array position (bust skips darts).
- `readyTurn` persists acknowledgement of a player change. `awaitingPlayer` blocks all throw entry after a turn until `confirmPlayerChange`; 200S CHANGE also acknowledges. Undo replays and restores the correct player.
- 2-player matches stay local and are excluded from cloud push/pull/pending counts as well as COUNT-UP analysis. JSON/CSV retain match history; CSV names are quoted.
- `tools/tests/test_local_match.py` covers both winners, busts, final-round draw, names-first UI, persistence, undo, isolation, backup, and single-file preview with the browser offline. See `docs/release-0.7.0-beta.1.md`.

- CHECKOUT guide in PLAY shows up to three shortest open-out routes for the remaining darts; prefers singles, then bull, double and triple among equal-length routes. Pure `checkoutRoutes` in `game/zero-one.js`, UI in `ui/zero-one.js`. See `docs/release-0.6.0-beta.2.md`.

- 01 (solo 301/501/701, fat bull, straight in/open out, 20 rounds) is implemented. See `docs/release-0.6.0-beta.1.md` for current behavior and compatibility; older sections below describe the COUNT-UP baseline.
- `game/zero-one.js` supplies pure replay, validation, session helpers and operation routing; its initializer runs AFTER countup initialization and BEFORE event wiring. Both connectors must register before rules initialize.
- `ui/zero-one.js` renders 01. `game/rules.js` creates either game type from `store.gameChoice`.
- COUNT-UP analysis helpers must filter by `isCountup`. Never aggregate 01 into COUNT-UP score/best/achievement/period data. A bust can end a round before 3 darts; never slice 01 history into groups of three.
- `tools/tests/test_zero_one.py` covers 01 rules and integration using synthetic data/board keys and a fake cloud. No real-device verification or deployment is implied.

## Mission
Continue development of the existing retro-styled darts practice app, **not a rewrite**. Preserve saved data and all existing working features. The user wants a stylish, instantly readable interface: big numbers, graphics, short English labels, very little explanatory prose. The user communicates in Japanese.

## Repository / architecture
- GitHub: https://github.com/RyutanCAMP/darts-training-lab
- `index.html`: page structure and ordered deferred feature scripts; `styles.css`: styling; `app.js`: private context, connector registration and initialization only. Feature code is in `core/`, `game/`, `board/`, `audio/`, `storage/`, `analysis/`, and `ui/`. See `docs/module-refactor.md` for ownership.
- `preview.html`: **standalone, self-contained** preview for iPhone. It embeds the entire stylesheet in `<style>` and every feature script plus app.js in the final `<script>`. **Every UI/code change must also be mirrored into this file** with `python tools/sync-preview.py`. The tool reads script order from index.html. Do not edit only source files.
- `data/200s-keymap.json`: board input mapping.
- No framework/bundler. Vanilla HTML/CSS/JS; browser localStorage.
- Current UI version at handoff: v0.5.32. Check the default branch for later changes before editing.

## Current experience
- COUNT-UP: 8 rounds, 3 darts each (24 throws); score, MISS, undo, results/history, audio/visual effects.
- DARTSLIVE-200S keyboard input/calibration, manual input, locally stored per-dart records, import/export.
- Analysis: one **global period selector at the TOP**: `1R / 10R / 20R / ALL`. **10R must be selected by default on entry to Analysis**, including when returning from another tab. Changing this selector should refresh period-sensitive analyses.
- PERFORMANCE: BULL rate, BULL hits, INNER BULL, personal best.
- AIM ANALYSIS: heatmap by actual segment category: INNER SINGLE / TRIPLE / OUTER SINGLE / DOUBLE / OUTER BULL / INNER BULL. The stronger the frequency, the brighter the region; show a representative median marker. The board reports segments, **not precise x/y impact coordinates**. Never describe estimated positions as measured physical hit locations.
- BULL BY DART: 1st/2nd/3rd throw hit rates.
- SCORE TREND: completed-game scores and trailing moving average; all-time by design, labelled accordingly.
- ACHIEVEMENTS: all-time BULL, INNER BULL, HAT TRICK, TON 80, HIGH TON (currently computed from completed games).
- INSIGHT (main screen, hidden when empty): up to 3 measured FACT lines; interpretations/next steps are collapsed under NEXT and always worded as possibilities.
- HELP is **per card**: each `HELP[key]` is `[what, how, note]`. A one-line caption (`p.card-gloss`, = what) sits under every card header; the "?" button (card headers, the four top tiles, the period selector) opens the note with 見方 / 注意 (tiles and the period note also show これは). Texts live in the `HELP` map in `app.js`; `setupHelp()`/`helpBtn()`/`helpBox()` wire them up. Keep texts short, plain Japanese; update them whenever a card's meaning changes. Bottom tab order: PLAY / ANALYSIS / RESULT (履歴).
- TODAY'S FOCUS (`#focusPanel`, above INSIGHT, hidden when empty): the first insight item's TRY text as one line plus its FACT. GAME COMPLETE panel shows `#resultCompare` (VS AVG / VS BEST / RANK / BULL RATE vs AVG, NEW PERSONAL BEST; FIRST GAME when no history).
- The user's stated aim is BULL (aim-target selection per dart is planned next); until then wording says "狙いはブル前提".
- Selected-period buttons need `.page .analysis-periods button.selected:not(.primary):not(.warn)` to beat the generic `.page button` rule (10R was selected but not visibly lit before).
- COACH REPORT (last panel on Analysis, button-triggered, typing effect, instant when reduced-motion): rule-based text built by `buildReport()` from the selected period; sections SUMMARY / STRENGTHS / FOCUS / NEXT DRILL / CONFIDENCE. It is **not an AI model** and must say so; facts and hypotheses stay separate, hypotheses use "かもしれません" wording, and it refreshes instantly when the period changes. `changeTab('analysis')` resets it to the button state.
- BULL RATE tile shows the change vs the previous equal-length window (1R/10R/20R only; none for ALL).
- Expandable ADVANCED ANALYTICS / A CLASS: THROW ORDER (BULL rate + 95% range, IB share, average score for DART 1/2/3, REF/EVEN/CLEAR DIFF verdict), DRIFT BY DART (median offset, direction, spread per dart), DIRECTION (8-way), CONSISTENCY, AFTER HIT / MISS, BULL TREND, ROUND ANALYSIS (bull rate by round), ROUND SCORE (avg per round, R1-4 vs R5-8, distribution), SCORE BREAKDOWN, PACE, BEST STREAK. ALL TIME cards: SCORE & GOAL, BEST GAME vs AVG, CONDITIONS (time of day / game of the day), PRACTICE LOG.

## Important implementation details
- After the module split, function names below retain their behavior but live in the feature directories. `runtime` is an internal context passed to connectors, not a window global. Connectors register functions before any initializers execute; preserve the initializer order in app.js. Feature-private variables stay in their connector closure. Do not add direct feature-to-feature imports or global state. Normal scripts intentionally preserve file:// support for both entry points.
- `app.js`: `aimPeriod='10'`; `changeTab('analysis')` resets `aimPeriod` to `'10'`; `renderAnalysis()` updates period buttons and metrics; `allRecordedRounds()` includes saved sessions and the active session, **completed 3-dart rounds only** (a partial round never counts toward 1R/10R/20R/ALL); `selectedRounds()` selects most recent N rounds; `renderAim()` draws SVG; `renderAdvanced()` and `renderThrowOrder()` populate advanced cards.
- Per-dart record fields include `sessionId`, `roundIndex`, `dartIndex`, `timestamp`, `segment`, `zone`, `score`. Respect the recorded segment and zone for ring detection.
- Storage key: `dtl-data-v1`. Do **not** reset/migrate destructively or alter its shape without backward compatibility.
- Do not fabricate official DARTSLIVE ratings from COUNT-UP data; no 01 rating unless supported by real 01 game stats.
- `MISS` has unknown position: exclude from spatial position estimation, but handle denominators consistently and label any exclusions. Singles without an inner/outer `zone` (older records) are excluded the same way; AIM ANALYSIS shows the excluded counts (`MISS n / ZONE不明 n`).
- `REF_MIN=20`: any figure backed by fewer throws is badged `REF` (reference only). THROW ORDER shows `EVEN` instead of BEST/LOW when rates tie, and `CLEAR DIFF` / `NO CLEAR DIFF` from Wilson 95% ranges.
- **Aim target** (v0.5.39): settings → `AIM TARGET` (BULL / T1–T20 / D1–D20), stored as additive `store.aimTarget` (default BULL) and recorded on every new dart as `aim`; the PLAY screen shows an `AIM x` chip (tap → settings). Darts without `aim` (older data) are treated as BULL; the user stated their normal aim is BULL. Analysis shows ONE aim at a time (`analysisAim`, auto = current setting, falls back to the most recent round's aim; reset on every entry to Analysis). A selector row `#analysisAim` appears only when ≥2 aims exist in the data. `allRecordedRounds()` filters rounds by aim of their first dart (`allRecordedRounds(true)` = unfiltered). `hitAim`/`isHit`/`hitRate` replace isBull/rate inside period analysis; achievements (HAT TRICK etc.), score cards and the trend stay all-time/BULL-based. Offsets/directions are measured from the aim segment centre (`aimCenter`); the heatmap stays in absolute board coordinates with a dashed target ring. Non-BULL views relabel BULL→aim via `AT()`/`localizeAim()` (text nodes of #analysis, skipping #analysisAim, help notes, all-time cards). Positions are still segment-based estimates, not measured x/y.
- JSON backup now also carries `settings` (200S `bindings`, `calibrationKeys`, `goalScore`); import restores them only when the local values are empty. CSV gained a trailing `zone` column (existing columns unchanged).
- `store.goalScore` is an additive optional key (target score for SCORE & GOAL); older data without it works unchanged.
- Current heatmap opacity is relative to the maximum cell, not literal opacity equal to percent. Preserve clarity of this distinction.

## Quality / known risks to address
1. **A past critical regression**: `renderAim()` referenced an undefined `choices` variable after the period buttons were moved to the top. This threw an exception and stopped rendering the entire analysis. Never leave stale references; validate runtime.
2. A previous version appeared to fail selecting 10R by default. Confirm visually and in DOM on initial load and every navigation into Analysis.
3. The app uses many direct DOM IDs. Confirm every `$('id')` has a matching HTML element in both `index.html` and `preview.html`.
4. Confirm analysis still renders with: empty storage; 1–2 darts; partial rounds; one finished game; 10+ rounds; ALL; imported data.
5. Test ALL heatmap so it remains legible (not a solid field). Verify INNER/OUTER SINGLE, T, D, IB, OB separation.
6. Check throw-order breakdown for DART 1, 2, 3 and zero-data handling; no NaN/undefined in UI.
7. Avoid showing unnecessary placeholders like “未実装”, “予定”, “上達の軌跡”, verbose instructional copy. Keep detailed technical explanations collapsed or in developer docs, not on the main screen.
8. Run a JS syntax check and ideally browser-based UI tests (including mobile viewport) before saying a change is verified. **Do not claim tested if it was only code-reviewed.**
9. Ensure `preview.html` embedded JS/CSS and analysis markup match source files. Check the version and cache-busting query parameters when publishing.
10. Changes to the app should be small, reviewable commits; avoid deleting features or replacing the UI wholesale.

## User's product direction
- Main dashboard: immediately understandable, visually strong, uncluttered.
- More technical details live under ADVANCED ANALYTICS (A CLASS), not on the main screen.
- Analysis selector first, followed by all relevant analysis for that selection.
- Show cumulative achievements prominently, but keep all-time vs selected-period scope visually unambiguous.
- The user especially wants to understand **which of the 1st, 2nd, 3rd darts is more accurate**, and which direction the darts drift.
- Retro arcade aesthetics, original sounds, iPhone Safari usability, 200S input support.

## Recommended first actions for Claude
1. Read `README.md`, `index.html`, `styles.css`, `app.js`, and `preview.html`.
2. Inspect current GitHub HEAD (do not assume v0.5.32 is still latest).
3. Perform a smoke test of Analysis and fix real bugs before adding features.
4. Confirm the exact next change with the user, then implement and mirror the standalone preview.
5. Report what was changed, what was actually tested, and provide a preview link pointing to a **real commit SHA**.

## Data/privacy
This is a public repository. Do not commit user practice exports, credentials, personal recordings, or secrets. LocalStorage data is device/browser-local; a fresh browser preview may appear empty even if another browser has saved games.

## Cloud sync (v0.5.39, optional)
- Firebase Auth (Google) + Firestore, loaded lazily from the gstatic CDN only when the user taps login (or was logged in before). localStorage stays the source of truth; the app works unchanged when signed out, on `file://` (login disabled) or offline.
- Layout: `users/{uid}/sessions/{id}` = `{json,startedAt}`; `users/{uid}/meta/profile` = `{json:{myDarts},updatedAt}`. Rules: `firestore.rules` (own data only) must be published in the Firebase console.
- Merge: games are unioned by id (invalid ones ignored); MY DARTS is last-writer-wins by `syncMeta.myAt`, except the first sync of a device with local data, which unions sets by id. Local state: `dtl-sync-v1`.
- Not synced: round exclusions, 200S bindings, goal/aim settings, deletions (a deleted game comes back on the next sync).
- `tools/tests/test_cloud.py` tests the logic against an in-memory fake (`window.__DTL_CLOUD_FAKE`); the real SDK/popup/rules are NOT covered by it.

## Hosting (v0.5.39+)
- Production URL: https://darts-training-lab.web.app (Firebase Hosting, same Firebase project as the cloud sync). Pushing to `main` auto-deploys via `.github/workflows/deploy.yml` (secret `FIREBASE_SERVICE_ACCOUNT_DARTS_TRAINING_LAB`; never commit the key). `firebase.json` serves the repo root and ignores tools/docs/dist/preview.html/*.md.
- localStorage is per origin: data on the old github.io URL does not carry over; use CLOUD SYNC (Google login) to move games and MY DARTS.

## Guest / login / MY DARTS UX (v0.5.39)
- PLAY shows a chips row: `AIM x` (→ settings), `SET name` (`#setChip` → bottom sheet `#setSheet` to switch the current set; mid-game switches still ask), and `GUEST` / Google name (`#authChip` → settings → CLOUD SYNC). Guest = no login, data stays in this browser; logging in syncs games + MY DARTS. Logout keeps local data (no wipe feature yet).
- MY DARTS: 10 slot cards (`#mySlots`), set name auto-filled from a catalog pick, optional flight/shaft/tip/memo under `details.my-more`, `#myCurrent`/`#mySlot` kept (ids used by code/tests) inside `details.my-adv`, `#myDuplicate` copies a set into a new one. First Google login with an empty nickname uses the Google name.
- Test: `tools/tests/test_mydarts_ui.py`.

## v0.5.39 additions
- Sync profile v2: `users/{uid}/meta/profile.json` = `{myDarts, excluded[], goalScore, aimTarget}` (last-writer-wins by `syncMeta.myAt`, bumped by `profTouch()`; first sync of a device with local data merges). "全履歴を削除" offers to delete the cloud copy too. 200S bindings are still not synced.
- PWA basics: `manifest.webmanifest`, icons in `assets/`, apple-touch / standalone meta tags, `navigator.storage.persist()` requested at start. No service worker (no offline cache) on purpose.
- CI: `.github/workflows/deploy.yml` runs `tools/run-tests.py` (all Playwright tests + `sync-preview --check`) on every push/PR; deploy to Hosting only if tests pass. `firestore.rules` is stricter (size/shape limits) but must be pasted into the Firebase console by hand; the app works with the old and new rules.

## Barrel catalog (v0.5.40)
- `BARREL_CATALOG` is no longer embedded: `loadCatalog()` fetches `data/barrels.json` (same origin) and falls back to the GitHub raw URL; `cleanCatalog()` validates it (https-only urls). States: loading / ok / error (error keeps free input working).
- Data is built from official-page research tables by `tools/catalog/build_barrels.py` (see `tools/catalog/README.md`). 132 models; `verified` levels spec+date / spec / partial / unconfirmed are shown in the model info box.
- Tests serve the raw URL from the local file via Playwright routing (`tools/tests/test_catalog.py`).

## Navigation (v0.5.41)
- Bottom tabs: PLAY / 分析 / 履歴 / セット (MY DARTS lives in the セット tab, `#setups`). ⚙ settings only holds 効果音, ラウンド間の待ち時間, データ管理, 200S (collapsed `#s200Group`), データ保護・復旧.
- PLAY chips open bottom sheets in place instead of jumping to settings: `AIM` → `#aimSheet` (aim select, closes on change), `SET` → `#setSheet` (switch set; "MY DARTSを編集する" → セット tab), `GUEST`/name → `#accountSheet` (nickname + CLOUD SYNC). `openSheet(id)` / `closeSheets()`; backdrop, 閉じる and Esc close; `changeTab()` closes sheets. The sheets live inside `#play` so `.page` styles apply.
