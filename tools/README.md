# tools
- `python3 tools/sync-preview.py` mirrors styles.css / app.js / index.html body into preview.html (`--check` only verifies).
- `tools/tests/test_*.py`: Playwright (Chromium) UI tests. `pip install playwright`, then e.g. `python3 tools/tests/test_help.py`. Each prints PASS/FAIL lines and ALL PASS.
