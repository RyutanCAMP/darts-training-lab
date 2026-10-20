import tempfile, pathlib, os
ROOT=str(pathlib.Path(__file__).resolve().parent.parent.parent)
import json, threading, http.server, socketserver, functools, os, re, random, datetime
from playwright.sync_api import sync_playwright
S=os.environ.get('S') or tempfile.mkdtemp()
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
socketserver.TCPServer.allow_reuse_address=True
socketserver.ThreadingTCPServer.request_queue_size=128
srv=socketserver.ThreadingTCPServer(('127.0.0.1',8851),functools.partial(Q,directory=ROOT)); threading.Thread(target=srv.serve_forever,daemon=True).start()
pts=lambda s:50 if s in('IB','OB') else 0 if s=='MISS' else int(s[1:])*{'S':1,'D':2,'T':3}[s[0]]
random.seed(9)
def game(k,start):
    ds=[];t=start
    for i in range(24):
        t+=datetime.timedelta(seconds=6); seg=random.choice(['OB','IB','S20','T20','S5','MISS','D16','S3'])
        z=(seg+random.choice('IO')) if seg[0]=='S' and len(seg)>1 else None
        ds.append(dict(id=f'g{k}-{i}',sessionId=f's{k}',roundIndex=i//3+1,dartIndex=i%3+1,timestamp=t.isoformat()+'Z',segment=seg,zone=z,score=pts(seg),inputSource='manual',corrected=False))
    return dict(id=f's{k}',schemaVersion=1,gameType='countup',startedAt=start.isoformat()+'Z',endedAt=t.isoformat()+'Z',status='completed',darts=ds)
base=datetime.datetime(2026,9,10,3)
seed=dict(schemaVersion=1,sessions=[game(k,base+datetime.timedelta(days=k)) for k in range(10)][::-1],active=dict(id='a',schemaVersion=1,gameType='countup',startedAt='2026-10-11T01:00:00.000Z',endedAt=None,status='active',darts=[]),bindings={},roundDelay=8,soundEnabled=True)
ok=True
def check(c,m):
    global ok; print(('PASS ' if c else 'FAIL ')+m); ok&=bool(c)
EXPECT=['focus','period','m-bull','m-hits','m-inner','m-best','insight','aim','allbull','trend','achievements','report','throw','drift','direction','consistency','after','bulltrend','rounds','roundscore','breakdown','pace','streak','goal','bestavg','conditions','log']
def new(b,name,data,vp=(390,844)):
    ctx=b.new_context(viewport={'width':vp[0],'height':vp[1]},device_scale_factor=2,is_mobile=True,has_touch=True)
    pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    if data is not None: pg.add_init_script("if(!localStorage.getItem('seeded')){localStorage.setItem('dtl-data-v1',%s);localStorage.setItem('seeded','1')}"%json.dumps(json.dumps(data)))
    pg.goto(f'http://127.0.0.1:8851/{name}.html'); pg.wait_for_timeout(350); pg.evaluate("document.getElementById('startupFx').style.display='none'")
    pg.click('nav.tabs [data-tab=analysis]'); pg.evaluate("document.querySelector('details.analysis-extra').open=true"); pg.wait_for_timeout(150); return ctx,pg,errs
with sync_playwright() as p:
    b=p.chromium.launch()
    for name in ['index','preview']:
        print('\n#####',name)
        ctx,pg,errs=new(b,name,seed)
        check(pg.evaluate("document.getElementById('analysisHelp')===null"),'grouped HELP block is gone'); check(pg.evaluate("[...document.querySelectorAll('nav.tabs button')].map(b=>b.dataset.tab).join()")=='play,analysis,history,setups','tab order is PLAY / ANALYSIS / RESULT / SET')
        keys=pg.evaluate("[...new Set([...document.querySelectorAll('[data-help]')].map(b=>b.dataset.help))]")
        check(sorted(keys)==sorted(EXPECT),f'every card has its own ? ({len(keys)} keys)'+('' if sorted(keys)==sorted(EXPECT) else ' missing/extra: '+str(set(EXPECT)^set(keys))))
        check(pg.evaluate("[...document.querySelectorAll('[data-help]')].every(b=>{const k=b.dataset.help;const box=document.querySelector('[data-help-for=\"'+k+'\"]');return box&&box.textContent.trim().length>10&&box.classList.contains('hidden')})"),'each ? has a non-empty note, closed by default')
        small=pg.evaluate("[...document.querySelectorAll('[data-help]')].filter(b=>{const r=b.getBoundingClientRect();return r.width<43.5||r.height<43.5}).map(b=>b.dataset.help)")
        check(not small,'every ? has a 44px tap target '+str(small))
        # each card's ? belongs to its own card: box sits right after its header (same panel)
        bad=pg.evaluate("[...document.querySelectorAll('h3 [data-help]')].filter(b=>{const g=b.closest('h3').nextElementSibling,box=g&&g.nextElementSibling;return !(g&&g.classList.contains('card-gloss')&&g.textContent.trim().length>8&&box&&box.dataset.helpFor===b.dataset.help)}).map(b=>b.dataset.help)")
        check(not bad,'caption + note sit directly under their own card header '+str(bad))
        pg.evaluate("document.querySelectorAll('#analysisGroups details').forEach(d=>d.open=true)")  # analysis cards are grouped in accordions
        # toggle each
        res=[]
        for k in EXPECT:
            btn=pg.locator(f'[data-help="{k}"]').first; btn.evaluate("e=>{const d=e.closest('details');if(d)d.open=true}"); btn.scroll_into_view_if_needed(); btn.click(); pg.wait_for_timeout(30)
            open_=pg.evaluate(f"!document.querySelector('[data-help-for=\"{k}\"]').classList.contains('hidden') && document.querySelector('[data-help=\"{k}\"]').getAttribute('aria-expanded')==='true'")
            vis=pg.evaluate(f"document.querySelector('[data-help-for=\"{k}\"]').getBoundingClientRect().height>10")
            btn.click(); pg.wait_for_timeout(30)
            closed=pg.evaluate(f"document.querySelector('[data-help-for=\"{k}\"]').classList.contains('hidden') && document.querySelector('[data-help=\"{k}\"]').getAttribute('aria-expanded')==='false'")
            res.append((k,open_ and vis and closed))
        check(all(r for _,r in res),'open/close works for all: '+str([k for k,r in res if not r] or 'all ok'))
        pg.evaluate("document.querySelectorAll('#analysisGroups details').forEach(d=>d.open=true)")
        # opening several; no overflow
        pg.evaluate("document.querySelectorAll('#analysisGroups details').forEach(d=>d.open=true)")
        for k in EXPECT: pg.locator(f'[data-help="{k}"]').first.click()
        check(pg.evaluate("document.documentElement.scrollWidth<=innerWidth"),'all notes open: no horizontal overflow')
        wide=pg.evaluate("[...document.querySelectorAll('.page.active *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1&&getComputedStyle(e).position!=='fixed').slice(0,5).map(e=>e.tagName+'.'+e.className)")
        check(not wide,'no element beyond viewport '+str(wide))
        pg.screenshot(path=S+f'/h_open_{name}.png',full_page=True) if name=='index' else None
        # tile notes survive a period change (tiles re-render)
        pg.click('[data-aim-period="20"]'); pg.wait_for_timeout(80)
        check(pg.evaluate("[...document.querySelectorAll('#metrics [data-help-for]')].every(x=>!x.classList.contains('hidden'))"),'tile notes stay open after the period changes')
        pg.click('[data-help="m-bull"]'); check(pg.evaluate("document.querySelector('#metrics [data-help-for=\"m-bull\"]').classList.contains('hidden')"),'tile note closes again')
        t=pg.evaluate("document.getElementById('analysis').innerText"); check(not any(x in t for x in ['NaN','undefined','Infinity']),'no NaN/undefined')
        # regression: 10R default, report, no errors
        pg.click('nav.tabs [data-tab=play]'); pg.click('nav.tabs [data-tab=analysis]'); pg.wait_for_timeout(100)
        check(pg.evaluate("document.querySelector('[data-aim-period].selected').dataset.aimPeriod")=='10','10R selected on return')
        pg.click('#reportBtn'); pg.wait_for_function("document.getElementById('reportBody').dataset.done==='1'",timeout=8000)
        check('CONFIDENCE' in pg.inner_text('#reportBody') and not errs,'report still works, no page errors '+str(errs)); ctx.close()
        # empty storage + small viewports
        ctx,pg,errs=new(b,name,None); check(pg.evaluate("document.querySelectorAll('[data-help]').length")>=26 and not errs,'empty storage: help present, no errors'); ctx.close()
        for vp in [(375,667),(430,932),(820,1180)]:
            ctx,pg,errs=new(b,name,seed,vp)
            pg.evaluate("document.querySelectorAll('#analysisGroups details').forEach(d=>d.open=true)")
            for k in EXPECT: pg.locator(f'[data-help="{k}"]').first.click()
            check(pg.evaluate("document.documentElement.scrollWidth<=innerWidth") and not errs,f'viewport {vp}: all notes open, no overflow/errors'); ctx.close()
    b.close()
srv.shutdown(); print('\nALL PASS' if ok else '\nSOME FAIL')
