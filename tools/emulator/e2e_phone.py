"""PHONE LINK end-to-end against the Firestore emulator (manual, not run in CI).
Real Firebase JS SDK (served from the npm package, same files as the gstatic CDN) + real firestore.rules
+ the Android app's REST client (darts-throw-watcher/jvm-test). See tools/emulator/README.md.
usage: python3 tools/emulator/e2e_phone.py <node_modules/firebase dir> <jvm-test binary>"""
import subprocess, sys, time, pathlib, threading, http.server, functools, json
from playwright.sync_api import sync_playwright
ROOT=str(pathlib.Path(__file__).resolve().parent.parent.parent); FB=pathlib.Path(sys.argv[1]); KT=sys.argv[2]
srv=http.server.ThreadingHTTPServer(('127.0.0.1',8765),functools.partial(http.server.SimpleHTTPRequestHandler,directory=ROOT))
srv.RequestHandlerClass.log_message=lambda *a:None
threading.Thread(target=srv.serve_forever,daemon=True).start()
fails=0
def chk(c,m):
    global fails; print(('PASS ' if c else 'FAIL ')+m,flush=True); fails+=0 if c else 1
def kt(code,segs): return subprocess.run([KT,code,segs],capture_output=True,text=True).stdout
def page(b):
    pg=b.new_page(); pg.errs=[]
    pg.on('pageerror',lambda e:pg.errs.append(str(e))); pg.on('dialog',lambda d:d.accept())
    pg.route('https://www.gstatic.com/firebasejs/10.14.1/*',lambda r:r.fulfill(path=str(FB/r.request.url.rsplit('/',1)[1]),content_type='application/javascript'))
    pg.add_init_script("window.__DTL_FS_EMU=8085")
    pg.goto('http://127.0.0.1:8765/index.html'); pg.wait_for_timeout(500)
    pg.evaluate("document.getElementById('startupFx')&&(document.getElementById('startupFx').style.display='none')")
    return pg
score=lambda pg:pg.evaluate("JSON.parse(localStorage.getItem('dtl-data-v1')||'{}').active?.darts?.length||0")
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844}); 
    pg=ctx.new_page(); pg.close()
    pg=page(ctx)
    chk(pg.inner_text('#phoneChip')=='PHONE','chip idle')
    pg.click('#phoneChip'); pg.click('#phoneStart')
    pg.wait_for_function("document.getElementById('phoneStatus').textContent.startsWith('LIVE')",timeout=15000)
    code=pg.inner_text('#phoneCode').replace('-','')
    chk(len(code)==8,'code issued '+code); chk(pg.inner_text('#phoneChip')=='PHONE ●','chip live')
    t0=time.time(); out=kt(code,'T20,IB,S20I')
    chk(out.count('OK')>=3 and 'ALL PASS' in out,'kotlin sender ok')
    pg.wait_for_function("JSON.parse(localStorage.getItem('dtl-data-v1')).active.darts.length>=3",timeout=15000)
    print('  latency (3 throws incl. 250ms gaps): %.1fs'%(time.time()-t0))
    d=pg.evaluate("JSON.parse(localStorage.getItem('dtl-data-v1')).active.darts.map(x=>[x.segment,x.zone,x.score,x.inputSource])")
    chk(d==[['T20','T20',60,'phone'],['IB','IB',50,'phone'],['S20','S20I',20,'phone']],'darts in PLAY '+json.dumps(d))
    chk(pg.inner_text('#score').strip()=='130','score shows 130 ('+pg.inner_text('#score').strip()+')')
    chk('→ PLAY' in pg.inner_text('#phoneLog'),'log shows applied')
    # next round without CHANGE (dart arrives during round break) - must not be dropped
    kt(code,'D20'); pg.wait_for_function("JSON.parse(localStorage.getItem('dtl-data-v1')).active.darts.length>=4",timeout=15000)
    chk(True,'dart during round break applied')
    # toggle off
    pg.click('#phoneToPlay'); kt(code,'T19'); pg.wait_for_timeout(2500)
    chk(score(pg)==4,'toggle OFF -> not applied'); chk(pg.evaluate("JSON.parse(localStorage.getItem('dtl-phone-v1')).log.length")>=5,'but logged')
    pg.click('#phoneToPlay')
    # backlog: close page, send, reopen
    pg.close(); kt(code,'T1,T1'); 
    pg=page(ctx); pg.wait_for_function("document.getElementById('phoneChip').textContent==='PHONE ●'",timeout=15000); pg.wait_for_timeout(1500)
    chk(score(pg)==4,'backlog not applied to PLAY (darts=%d)'%score(pg))
    lg=pg.evaluate("JSON.parse(localStorage.getItem('dtl-phone-v1')).log.map(e=>e.seg)")
    chk(lg[-2:]==['T1','T1'],'backlog logged '+str(lg[-3:]))
    kt(code,'OB'); pg.wait_for_function("JSON.parse(localStorage.getItem('dtl-data-v1')).active.darts.length>=5",timeout=15000)
    chk(True,'live again after reload')
    chk(not pg.errs,'no page errors '+str(pg.errs))
    b.close()
print('ALL PASS' if fails==0 else 'FAILURES %d'%fails)
