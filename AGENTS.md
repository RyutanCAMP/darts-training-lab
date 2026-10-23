# AGENTS.md

Instructions for AI coding agents working in this repository.

1. Read `docs/ai-handoff-2026-10-23.md` first: current branch, what is implemented, next steps and how to verify.
2. Then read `CLAUDE.md` (development rules for every agent, not only Claude) and `README.md`.
3. The user communicates in Japanese.
4. After any source change run `python tools/sync-preview.py`, then `python -X utf8 tools/run-tests.py`. Do not claim something is tested unless the tests or a real browser check ran.
5. Do not merge to `main` or open a PR without asking: a push to `main` deploys production, and a PR publishes a Firebase preview.
