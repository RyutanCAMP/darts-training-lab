#!/usr/bin/env python3
"""Build a single-file HTML for handing to other people: dist/darts-training-lab.html
= preview.html (self-contained) with developer-only panels hidden (class `dev-only`).
No sample data and no debug screens. Run tools/sync-preview.py first."""
import pathlib, re, subprocess, sys
root = pathlib.Path(__file__).resolve().parent.parent
if subprocess.call([sys.executable, str(root / 'tools' / 'sync-preview.py'), '--check']) != 0:
    sys.exit('preview.html is out of sync: run tools/sync-preview.py first')
html = (root / 'preview.html').read_text(encoding='utf-8')
html = html.replace('</style>', '.dev-only{display:none!important}</style>', 1)
out = root / 'dist' / 'darts-training-lab.html'
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding='utf-8')
print('wrote', out, len(html.encode('utf-8')), 'bytes')
