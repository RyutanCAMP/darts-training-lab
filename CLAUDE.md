# Claude development handoff — DARTS TRAINING LAB

## Mission
Continue development of the existing retro-styled darts practice app, **not a rewrite**. Preserve saved data and all existing working features. The user wants a stylish, instantly readable interface: big numbers, graphics, short English labels, very little explanatory prose. The user communicates in Japanese.

## Repository / architecture
- GitHub: https://github.com/RyutanCAMP/darts-training-lab
- `index.html`: page structure; `styles.css`: styling; `app.js`: all application logic.
- `preview.html`: **standalone, self-contained** preview for iPhone. It embeds the entire stylesheet in `<style>` and app script in the final `<script>`. **Every UI/code change must also be mirrored into this file**. Do not edit only `index.html` or `app.js`.
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
- `app.js`: `aimPeriod='10'`; `changeTab('analysis')` resets `aimPeriod` to `'10'`; `renderAnalysis()` updates period buttons and metrics; `allRecordedRounds()` includes saved sessions and the active session, **completed 3-dart rounds only** (a partial round never counts toward 1R/10R/20R/ALL); `selectedRounds()` selects most recent N rounds; `renderAim()` draws SVG; `renderAdvanced()` and `renderThrowOrder()` populate advanced cards.
- Per-dart record fields include `sessionId`, `roundIndex`, `dartIndex`, `timestamp`, `segment`, `zone`, `score`. Respect the recorded segment and zone for ring detection.
- Storage key: `dtl-data-v1`. Do **not** reset/migrate destructively or alter its shape without backward compatibility.
- Do not fabricate official DARTSLIVE ratings from COUNT-UP data; no 01 rating unless supported by real 01 game stats.
- `MISS` has unknown position: exclude from spatial position estimation, but handle denominators consistently and label any exclusions. Singles without an inner/outer `zone` (older records) are excluded the same way; AIM ANALYSIS shows the excluded counts (`MISS n / ZONE不明 n`).
- `REF_MIN=20`: any figure backed by fewer throws is badged `REF` (reference only). THROW ORDER shows `EVEN` instead of BEST/LOW when rates tie, and `CLEAR DIFF` / `NO CLEAR DIFF` from Wilson 95% ranges.
- The aim target is **not recorded**, so drift/offset are descriptive only (a deliberate aim at T20 also shows as offset). Never call them errors without that caveat.
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
