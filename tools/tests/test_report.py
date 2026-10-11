import tempfile, pathlib
ROOT=str(pathlib.Path(__file__).resolve().parent.parent.parent)
import json, threading, http.server, socketserver, functools, os, re, random, datetime
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.TCPServer(('127.0.0.1',8813),functools.partial(Q,directory=ROOT)); threading.Thread(target=srv.serve_forever,daemon=True).start()
pts=lambda s:50 if s in('IB','OB') else 0 if s=='MISS' else int(s[1:])*{'S':1,'D':2,'T':3}[s[0]]
random.seed(5)
def game(k,start,n=24,status='completed'):
    ds=[];t=start
    for i in range(n):
        di=i%3;rnd=i//3;pb=[.42,.24,.12][di]*(1 if rnd<4 else .6)
        t+=datetime.timedelta(seconds=random.choice([3,5,8,12]) if di else 25)
        if random.random()<pb: seg=random.choice(['OB','OB','IB'])
        elif random.random()<.18: seg='MISS'
        else: seg=random.choice(['S3','S19','S17','S7']) if di==2 else random.choice(['S20','S1','S5','T20','D20','S12'])
        z=(seg+random.choice('IO')) if seg[0]=='S' and len(seg)>1 else None
        ds.append(dict(id=f'g{k}-{i}',sessionId=f's{k}',roundIndex=i//3+1,dartIndex=i%3+1,timestamp=t.isoformat()+'Z',segment=seg,zone=z,score=pts(seg),inputSource='manual',corrected=False))
    return dict(id=f's{k}',schemaVersion=1,gameType='countup',startedAt=start.isoformat()+'Z',endedAt=t.isoformat()+'Z',status=status,darts=ds)
def store(ss,act=None):
    return dict(schemaVersion=1,sessions=ss,active=act or dict(id='a',schemaVersion=1,gameType='countup',startedAt='2026-10-11T01:00:00.000Z',endedAt=None,status='active',darts=[]),bindings={},roundDelay=8,soundEnabled=True)
base=datetime.datetime(2026,9,10,3)
big=sorted([game(k,base+datetime.timedelta(days=k//2,hours=(k%2)*9)) for k in range(30)],key=lambda s:s['startedAt'],reverse=True)
ok=True
S=os.environ.get('S') or tempfile.mkdtemp()
def check(c,m):
    global ok; print(('PASS ' if c else 'FAIL ')+m); ok&=bool(c)
def new(b,name,data,vp=(390,844),reduce=False):
    ctx=b.new_context(viewport={'width':vp[0],'height':vp[1]},device_scale_factor=2,is_mobile=True,has_touch=True,reduced_motion='reduce' if reduce else 'no-preference',permissions=['clipboard-read','clipboard-write'])
    pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    if data is not None: pg.add_init_script("if(!localStorage.getItem('seeded')){localStorage.setItem('dtl-data-v1',%s);localStorage.setItem('seeded','1')}"%json.dumps(json.dumps(data)))
    pg.goto(f'http://127.0.0.1:8813/{name}.html'); pg.wait_for_timeout(350); pg.evaluate("document.getElementById('startupFx').style.display='none'")
    pg.click('nav.tabs [data-tab=analysis]'); pg.wait_for_timeout(120); return ctx,pg,errs
def rtxt(pg): return pg.evaluate("[...document.querySelectorAll('#reportBody .report-label,#reportBody .report-line,#reportBody .report-meta')].map(e=>e.textContent).join('\\n')")
with sync_playwright() as p:
    b=p.chromium.launch()
    for name in ['index','preview']:
        print('\n#####',name)
        ctx,pg,errs=new(b,name,store(big))
        # REPORT initial state
        check(pg.evaluate("document.getElementById('reportBody').classList.contains('hidden')") and pg.inner_text('#reportBtn')=='GENERATE REPORT','report starts as a button only')
        pg.click('#reportBtn'); pg.wait_for_timeout(300)
        check(pg.evaluate("document.getElementById('reportBody').dataset.done")=='0','typing animation is running')
        w0=pg.evaluate("document.getElementById('reportBody').getBoundingClientRect().height"); pg.wait_for_timeout(500); w1=pg.evaluate("document.getElementById('reportBody').getBoundingClientRect().height")
        check(abs(w0-w1)<1.5,f'no layout shift while typing ({w0:.0f}->{w1:.0f}px)')
        pg.wait_for_function("document.getElementById('reportBody').dataset.done==='1'",timeout=8000)
        txt=rtxt(pg); print('--- REPORT (10R) ---\n'+txt+'\n---')
        check(not any(x in txt for x in ['NaN','undefined','Infinity','null']),'report has no NaN/undefined')
        check(all(k in txt for k in ['SUMMARY · 総評','STRENGTHS · 強み','FOCUS · 課題','NEXT DRILL · 次の練習','CONFIDENCE · 信頼度']),'all 5 sections')
        check('AIモデルによる判断ではありません' in txt,'states it is not an AI model')
        tile=['',pg.inner_text('#metrics .metric:first-child .value'),pg.inner_text('#metrics .metric:first-child .detail')]
        m=re.search(r'ブル率は ([\d.]+)%（(\d+)/(\d+)投）',txt); check(m and tile[1]==m.group(1)+'%' and tile[2].startswith(f'{m.group(2)} / {m.group(3)}'),f'report bull rate matches BULL RATE tile ({tile[1]}, {tile[2][:12]})')
        print('   dart/order tiles :',pg.inner_text('#advancedThrowOrder .throw-order-verdict'))
        check(pg.evaluate("document.documentElement.scrollWidth<=innerWidth"),'report: no horizontal overflow')
        pg.screenshot(path=S+f'/r_report_{name}.png',full_page=False) if name=='index' else None
        # period switch refreshes instantly
        pg.click('[data-aim-period="1"]'); pg.wait_for_timeout(100); t1=rtxt(pg); check('3投' in t1.split('\n')[0] and t1.startswith('1R'),'1R: report refreshed instantly -> '+t1.split('\n')[0])
        check('傾向は読み取れません' in t1,'1R shows the not-enough-data message')
        pg.click('[data-aim-period="all"]'); pg.wait_for_timeout(100); t2=rtxt(pg); check(t2.split('\n')[0].startswith('ALL ·') and not any(x in t2 for x in ['NaN','undefined']),'ALL: refreshed, clean -> '+t2.split('\n')[0])
        pg.click('[data-aim-period="20"]'); pg.wait_for_timeout(100); check(pg.evaluate("document.getElementById('reportBody').dataset.done")=='1','period change shows full text (no re-typing)')
        # copy
        pg.click('#reportCopy'); pg.wait_for_timeout(200); st=pg.inner_text('#reportStatus'); clip=pg.evaluate("navigator.clipboard.readText()")
        check(st=='コピーしました' and '[SUMMARY 総評]' in clip and clip.startswith('20R'),'COPY puts the report on the clipboard')
        # leave & return -> reset
        pg.click('nav.tabs [data-tab=play]'); pg.click('nav.tabs [data-tab=analysis]'); pg.wait_for_timeout(100)
        check(pg.evaluate("document.getElementById('reportBody').classList.contains('hidden')") and pg.inner_text('#reportBtn')=='GENERATE REPORT','leaving and returning resets the report to the button')
        check(pg.evaluate("document.querySelector('[data-aim-period].selected').dataset.aimPeriod")=='10','10R selected on return')
        check(not errs,'no page errors '+str(errs)); ctx.close()
        # reduced motion -> instant
        ctx,pg,errs=new(b,name,store(big),reduce=True); pg.click('#reportBtn'); pg.wait_for_timeout(120); check(pg.evaluate("document.getElementById('reportBody').dataset.done")=='1','reduced-motion: report appears instantly'); ctx.close()
        # empty / 2 darts / 1 game / legacy
        two=dict(id='a',schemaVersion=1,gameType='countup',startedAt='2026-10-11T01:00:00.000Z',endedAt=None,status='active',darts=game(99,base,2)['darts'])
        for label,data in [('empty',None),('2 darts',store([],two)),('1 game',store([game(1,base)])),('mixed abandoned',store([game(2,base+datetime.timedelta(days=1),11,'abandoned'),game(1,base)]))]:
            ctx,pg,errs=new(b,name,data); pg.click('#reportBtn'); pg.wait_for_function("document.getElementById('reportBody').dataset.done==='1'",timeout=8000); t=rtxt(pg)
            check(not any(x in t for x in ['NaN','undefined','Infinity','null']) and 'CONFIDENCE' in t and not errs,f'{label}: report clean ({t.splitlines()[0]})'); ctx.close()
        # viewports
        for vp in [(375,667),(430,932),(820,1180)]:
            ctx,pg,errs=new(b,name,store(big),vp); pg.click('#reportBtn'); pg.wait_for_function("document.getElementById('reportBody').dataset.done==='1'",timeout=8000)
            check(pg.evaluate("document.documentElement.scrollWidth<=innerWidth") and not errs,f'viewport {vp}: no overflow/errors'); ctx.close()
    b.close()
srv.shutdown(); print('\nALL PASS' if ok else '\nSOME FAIL')
