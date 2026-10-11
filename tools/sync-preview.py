#!/usr/bin/env python3
"""Mirror styles.css, app.js and the index.html body into the standalone preview.html.
Usage: python3 tools/sync-preview.py [--check]   (--check exits 1 if preview.html is out of sync)"""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
rd = lambda n: (root / n).read_text(encoding='utf-8')
css, js, idx, prev = rd('styles.css'), rd('app.js'), rd('index.html'), rd('preview.html')
out = re.sub(r'<style>.*?</style>', lambda m: '<style>' + css + '</style>', prev, flags=re.S)
out = re.sub(r'(<script[^>]*>).*?</script>', lambda m: m.group(1) + js + '</script>', out, flags=re.S)
body = lambda t: re.search(r'<body[^>]*>(.*?)<script', t, re.S).group(1).strip()
ob, ib = re.search(r'<body[^>]*>(.*?)<script', out, re.S), body(idx)
out = out.replace(ob.group(1), '\n' + ib + '\n', 1) if body(out) != ib else out
if '--check' in sys.argv:
    ok = out == prev
    print('preview.html is in sync' if ok else 'preview.html is OUT OF SYNC - run tools/sync-preview.py')
    sys.exit(0 if ok else 1)
(root / 'preview.html').write_text(out, encoding='utf-8')
print('preview.html updated' if out != prev else 'already in sync')
