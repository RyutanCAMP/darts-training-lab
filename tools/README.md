# tools
- `python3 tools/sync-preview.py` mirrors styles.css, the deferred feature scripts listed in index.html (app.js last), and the index.html body into preview.html (`--check` only verifies).
- `python3 tools/serve-preview.py [--lan] [--port 8765]` serves the app with concurrent requests and without caching; --lan prints same-network phone URLs. Hidden working files and directory listings are blocked.
- `tools/tests/test_*.py`: Playwright (Chromium) UI tests. `pip install playwright`, then e.g. `python3 tools/tests/test_help.py`. Each prints PASS/FAIL lines and ALL PASS.
