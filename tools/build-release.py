#!/usr/bin/env python3
"""Build a single-file release HTML for handing to other people (no developer/debug panels).
Usage: python3 tools/build-release.py [output.html]   (default: dist/darts-training-lab.html; dist/ is git-ignored)
Source of truth is preview.html (run tools/sync-preview.py first)."""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'preview.html').read_text(encoding='utf-8')
HIDE = ['200S START・CHANGE 信号記録', '200S 信号まとめ取り', '200S入力テスト']  # developer tools: kept in the DOM (the script looks them up by id) but hidden
def hide(m):
    a = m.group(0)
    t = re.search(r'<h3[^>]*>(.*?)</h3>', a, re.S)
    if t and any(re.sub(r'<[^>]+>', '', t.group(1)).strip().startswith(h) for h in HIDE):
        a = re.sub(r'<article class="', '<article hidden aria-hidden="true" class="hidden ', a, count=1)
    return a
out = re.sub(r'<article[^>]*>.*?</article>', hide, html, flags=re.S)
out = out.replace('82エリアとSTART・CHANGEは設定済み。Bluetooth接続後、そのままPLAY画面で投げられます。', '初めて使うときは、下の「200S 自動登録」でキーを登録してください。登録後は、Bluetooth接続してそのままPLAY画面で投げられます。')
out = re.sub(r'(<h3[^>]*>200S 自動登録) <span class="pill">BETA</span>', r'\1', out)
dest = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'dist' / 'darts-training-lab.html'
dest.parent.mkdir(parents=True, exist_ok=True)
dest.write_text(out, encoding='utf-8')
print('wrote', dest, len(out.encode('utf-8')), 'bytes')
