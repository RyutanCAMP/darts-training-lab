# DARTS TRAINING LAB

A personal darts practice and analytics app. Start small, then improve through real practice.

## Core goal

Record each dart, visualize progress, and eventually combine scoring history with AI coaching and throw videos.

## Roadmap

- **v0.1**: Browser-based COUNT-UP (8 rounds / 24 darts), manual scoring, MISS, undo, local practice history, basic bull-rate statistics.
- **v0.2**: Test and calibrate DARTSLIVE-200S Bluetooth input on Windows; verify actual key events before enabling automatic scoring.
- **v0.3**: Historical charts and comparisons by first/second/third dart; CSV/JSON export and import.
- **Later**: AI analysis based on measured data, synchronized throw videos, optional announcer voices and sound effects.

## Design principles

1. **History and analysis first**: Games and effects should support practice, not distract from it.
2. **Keep raw per-dart records**: Store timestamps, session ID, round, dart order, segment and score where available.
3. **Separate facts from AI hypotheses**: Do not infer throwing-form problems from scoring data alone.
4. **No secrets or personal practice videos in Git**: This repository is public. Practice data should remain local unless deliberately exported.
5. **Iterate with hardware tests**: Bluetooth mappings and board behavior are not yet verified.

## Status

Repository initialized. The first playable HTML app will be added and verified in a subsequent commit.
