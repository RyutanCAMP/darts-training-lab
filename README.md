# DARTS TRAINING LAB — RETRO DARTS

A retro arcade-style COUNT-UP practice and analytics app for darts, including DARTSLIVE-200S input.

## Start
- Open `index.html` with its companion `styles.css` and `app.js` on a static server, or open `preview.html` for a standalone browser preview.
- All personal practice records are stored locally in the browser (`dtl-data-v1`).
- Source: https://github.com/RyutanCAMP/darts-training-lab

## Features (v0.5.30)
- COUNT-UP: 8 rounds × 3 darts; scoring, MISS, undo, local results/history.
- Manual input and DARTSLIVE-200S keyboard/calibration support.
- Retro audio/visual effects and mobile-friendly layout.
- Analysis: 1R / 10R / 20R / ALL, with 10R default on entry. Only completed 3-dart rounds are counted.
- BULL metrics, per-dart throw-order rates, all-time achievements, score trend.
- AIM ANALYSIS segment/ring heatmap and expandable A CLASS analytics.
- HELP guide and a rule-based COACH REPORT (not an AI model) on the Analysis screen.
- INSIGHT facts, per-dart drift, 95% ranges (REF = fewer than 20 throws), round score curve, score breakdown, goal gap, practice log.

## Source files
- `index.html`: markup
- `styles.css`: styles
- `app.js`: logic
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
See [CLAUDE.md](CLAUDE.md) before editing. Test runtime rendering and the standalone mobile preview before reporting completion.
