"""Barrel catalog loaded from data/barrels.json (GitHub raw URL is intercepted and served from the local file)."""
import json, pathlib
from playwright.sync_api import sync_playwright
ROOT=str(pathlib.Path(__file__).resolve().parent.parent.parent)
DATA=json.load(open(ROOT+'/data/barrels.json',encoding='utf8'))
N=len(DATA['barrels'])
fails=0
def chk(c,m):
    global fails
    print(('PASS ' if c else 'FAIL ')+m); fails+=0 if c else 1
def serve(route):
    route.fulfill(path=ROOT+'/data/barrels.json',content_type='application/json',headers={'Access-Control-Allow-Origin':'*'})
# data file sanity
ids=[x['id'] for x in DATA['barrels']]
chk(len(ids)==len(set(ids)),'catalog ids unique')
chk(all(x['url'].startswith('https://') for x in DATA['barrels']),'every entry has an https source url')
chk(all(x['verified'] in DATA['verifiedLevels'] for x in DATA['barrels']),'every entry has a known verification level')
with sync_playwright() as p:
    b=p.chromium.launch()
    for f in ['index.html','preview.html']:
        c=b.new_context(viewport={'width':390,'height':844});c.route('https://raw.githubusercontent.com/**/barrels.json',serve)
        pg=c.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto('file://'+ROOT+'/'+f);pg.wait_for_timeout(600)
        pg.evaluate("document.getElementById('startupFx')&&(document.getElementById('startupFx').style.display='none')")
        pg.click('[data-tab=settings]');pg.wait_for_timeout(200)
        n=pg.evaluate("document.querySelectorAll('#myModelResults [data-catalog-index]').length")
        chk(n==N,f+f' all {N} models listed from JSON ({n})')
        txt=pg.evaluate("document.getElementById('myModelResults').innerText")
        chk(not any(w in txt for w in ['null','undefined','NaN']),f+' list has no null/undefined/NaN')
        pg.fill('#myModelSearch','松吉');pg.wait_for_timeout(80)
        hits=pg.evaluate("[...document.querySelectorAll('#myModelResults [data-catalog-index] b')].map(b=>b.textContent)")
        chk(len(hits)>=3 and all('LAZY' in h for h in hits),f+' search by player name: '+str(hits))
        pg.fill('#myModelSearch','PERSEUS DR');pg.wait_for_timeout(80)
        pg.evaluate("document.querySelector('#myModelResults [data-catalog-index]').click()")
        info=pg.evaluate("document.getElementById('myModelInfo').innerText")
        chk('2025/10/29 発売' in info and '畦元' in info and '97%' in info and '公式ページで仕様・発売日を確認' in info,f+' info box shows release/player/spec/check level')
        chk(pg.evaluate("myBarrelWeight.value")=='17.5' and pg.evaluate("myBarrelShape.value")=='トルピード' and pg.evaluate("mySetupName.value")=='PERSEUS DR',f+' pick fills weight/shape/name')
        chk(pg.evaluate("[...document.querySelectorAll('#myModelInfo a')].every(a=>a.href.startsWith('https://'))"),f+' source links are https')
        chk(not errs,f+' no page errors '+str(errs[:1]));c.close()
        # catalog unreachable -> graceful message, free input still works
        c=b.new_context(viewport={'width':390,'height':844});c.route('https://raw.githubusercontent.com/**',lambda r:r.abort())
        pg=c.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto('file://'+ROOT+'/'+f);pg.wait_for_timeout(600)
        pg.evaluate("document.getElementById('startupFx')&&(document.getElementById('startupFx').style.display='none')")
        pg.click('[data-tab=settings]')
        chk('読み込めませんでした' in pg.evaluate("document.getElementById('myModelResults').innerText") and not errs,f+' offline: clear message, no errors')
        pg.fill('#mySetupName','FREE');pg.fill('#myBarrelModel','MY CUSTOM');pg.on('dialog',lambda d:d.accept());pg.click('#mySave');pg.wait_for_timeout(100)
        chk(pg.evaluate("JSON.parse(localStorage.getItem('retro-my-darts-v1')).sets[0].BarrelModel")=='MY CUSTOM',f+' offline: free input can still be saved');c.close()
    b.close()
print('ALL PASS' if not fails else f'SOME FAIL ({fails})')
