# tools
- `python3 tools/sync-preview.py` — copy styles.css / app.js / index.html body into preview.html (`--check` to verify only).
- `tools/tests/test_*.py` — Playwright (Chromium) UI tests: `pip install playwright`, then `python3 tools/tests/test_help.py` etc. Each prints PASS/FAIL lines and `ALL PASS`. Set `S=<dir>` to keep screenshots.
