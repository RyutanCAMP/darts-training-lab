# v0.9.0-beta.1 — CRICKET

## Rules (standard cricket)
- Targets: 20, 19, 18, 17, 16, 15 and BULL. Single = 1 mark, double = 2, triple = 3. Outer bull = 1 mark, inner bull = 2 marks; a bull mark is worth 25 points.
- Three marks close a number. Further marks score that number's value while the opponent has not closed it. Once both have closed it, the number is dead (no points, no marks).
- 2 players: P1 starts, three darts per turn, the same handoff confirmation as 01 (button or 200S CHANGE). Closing every target with points equal to or ahead of the opponent wins immediately. After 15 rounds each, higher points win; equal points is a draw.
- Solo: there is no opponent, so extra marks on a closed number always score. The game ends when every target is closed or after 15 rounds. The result shows MPR, marks and points.
- MPR = counted marks ÷ darts thrown × 3. Marks on non-cricket numbers and on dead numbers are not counted.

## Data
- `gameType:'cricket'`, `rules:{mode:'standard',bullMode:'split',maxRounds:15}`. Matches add `players` and `readyTurn` exactly like 01.
- Every dart keeps the usual fields. `score` is the cricket points that dart earned; replay rejects a session whose stored points differ.
- `result` on save: `{reason:'closed'|'round-limit', winner, points, mpr}` (solo arrays have one entry).
- JSON/CSV backup include cricket (`game_type=cricket`). Solo cricket syncs like solo 01; 2-player matches stay local. COUNT-UP analysis ignores cricket.

## Verification
- `tools/tests/test_cricket.py`: rules on synthetic throws (closing, scoring, dead numbers, closing-while-behind, round limit, draw, forged points, out-of-turn), then index.html and the standalone preview at desktop and mobile sizes: solo ALL CLOSED, history, CSV, analysis isolation, 2-player handoff, dead number, undo, winner replay, switching back to 01.
- Not verified on a physical 200S or iPhone Safari.
