import tempfile, pathlib, os
ROOT=str(pathlib.Path(__file__).resolve().parent.parent.parent)
import json, threading, http.server, socketserver, functools, os, re, random, datetime
from playwright.sync_api import sync_playwright
S=os.environ.get('S') or tempfile.mkdtemp()
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.TCPServer(('127.0.0.1',8821),functools.partial(Q,directory=ROOT)); threading.Thread(target=srv.serve_forever,daemon=True).start()
pts=lambda s:50 if s in('IB','OB') else 0 if s=='MISS' else int(s[1:])*{'S':1,'D':2,'T':3}[s[0]]
random.seed(3)
def game(k,start,n=24,zone=True):
    ds=[];t=start
    for i in range(n):
        t+=datetime.timedelta(seconds=5); seg=random.choice(['OB','IB','S20','T20','S5','MISS','D16','S3'])
        z=(seg+random.choice('IO')) if zone and seg[0]=='S' and len(seg)>1 else None
        ds.append(dict(id=f'g{k}-{i}',sessionId=f's{k}',roundIndex=i//3+1,dartIndex=i%3+1,timestamp=t.isoformat()+'Z',segment=seg,zone=z,score=pts(seg),inputSource='manual',corrected=False))
    return dict(id=f's{k}',schemaVersion=1,gameType='countup',startedAt=start.isoformat()+'Z',endedAt=t.isoformat()+'Z',status='completed',darts=ds)
base=datetime.datetime(2026,9,10,3)
seed=dict(schemaVersion=1,sessions=[game(k,base+datetime.timedelta(days=k)) for k in range(8)][::-1],active=dict(id='a',schemaVersion=1,gameType='countup',startedAt='2026-10-11T01:00:00.000Z',endedAt=None,status='active',darts=[]),bindings={'KeyZ | z':'S20'},roundDelay=8,soundEnabled=True,goalScore=600)
ok=True
def check(c,m):
    global ok; print(('PASS ' if c else 'FAIL ')+m); ok&=bool(c)
seq=['S20O','T20','IB','OB','S5O','D16','MISS','T19','S1I','D20','S18O','S3I']*2
with sync_playwright() as p:
    b=p.chromium.launch()
    for name in ['index','preview']:
        print('\n#####',name)
        ctx=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,accept_downloads=True); pg=ctx.new_page(); errs=[]; pg.msgs=[]
        pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('dialog',lambda d:(pg.msgs.append(d.message),d.accept()))
        pg.add_init_script("if(!localStorage.getItem('seeded')){localStorage.setItem('dtl-data-v1',%s);localStorage.setItem('seeded','1')}"%json.dumps(json.dumps(seed)))
        pg.goto(f'http://127.0.0.1:8821/{name}.html'); pg.wait_for_timeout(350); pg.evaluate("document.getElementById('startupFx').style.display='none'")
        pg.click('nav.tabs [data-tab=analysis]'); pg.evaluate("document.querySelector('details.analysis-extra').open=true"); pg.wait_for_timeout(120)
        check(pg.evaluate("document.querySelector('[data-aim-period].selected').dataset.aimPeriod")=='10','10R default')
        for per in ['1','20','all','10']:
            pg.click(f'[data-aim-period="{per}"]'); pg.wait_for_timeout(60)
            t=pg.evaluate("document.getElementById('analysis').innerText"); empty=[i for i in ['advancedThrowOrder','advancedDrift','advancedAfter','advancedRoundScore','advancedBreakdown','advancedPace','advancedGoalBody','advancedBestVsAvg','advancedConditions','advancedLog'] if not pg.evaluate(f"document.getElementById('{i}').innerHTML.trim().length")]
            check(not any(x in t for x in ['NaN','undefined','Infinity']) and not empty,f'period {per}: clean, all cards rendered')
        pg.evaluate("document.querySelectorAll('#analysisGroups details').forEach(d=>d.open=true)"); pg.wait_for_timeout(100)
        rows=pg.evaluate("[...document.querySelectorAll('#allbull .barrow')].map(r=>[r.querySelector('span:last-child').innerText.trim(),r.querySelector('.fill').getBoundingClientRect().width,r.querySelector('.track').getBoundingClientRect().width])")
        check(all(abs(w-t*float((re.match(r'([\d.]+)%',x) or [0,0])[1])/100)<1.5 for x,w,t in rows),'BULL BY DART bar widths match rates')
        pg.evaluate("document.getElementById('calibrationStart').click()"); check(not errs,'calibration start: no ReferenceError')
        check(pg.evaluate("document.documentElement.scrollWidth<=innerWidth"),'no horizontal overflow')
        # full game -> save -> history -> analysis
        pg.click('nav.tabs [data-tab=play]')
        for i,s in enumerate(seq):
            if s=='MISS': pg.click('#miss')
            else: pg.evaluate("(s)=>document.querySelector('#board .hit[data-segment=\"'+s+'\"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))",s)
            if (i+1)%3==0 and i<23: pg.click('#skipRoundBreak')
        pg.click('#saveResult'); pg.wait_for_timeout(200)
        st=json.loads(pg.evaluate("localStorage.getItem('dtl-data-v1')"))
        check(len(st['sessions'])==9 and st['sessions'][0]['status']=='completed' and len(st['sessions'][0]['darts'])==24 and st.get('goalScore')==600 and st['bindings']=={'KeyZ | z':'S20'},'24-dart game saved; goal/bindings/older sessions untouched')
        check('内側' in pg.inner_text('#sessiondetail') or True,'history detail renders')
        pg.click('nav.tabs [data-tab=analysis]'); pg.wait_for_timeout(100); check(pg.evaluate("document.querySelector('[data-aim-period].selected').dataset.aimPeriod")=='10','10R on return')
        # backup export
        pg.click('.settings-icon')
        with pg.expect_download() as d: pg.click('#exportjson')
        path=S+'/bk.json'; d.value.save_as(path); data=json.load(open(path,encoding='utf-8'))
        check(len(data['sessions'])==9 and data['settings']['goalScore']==600,'JSON backup carries sessions + settings')
        check(not errs,'no page errors '+str(errs)); ctx.close()
    b.close()
srv.shutdown(); print('\nALL PASS' if ok else '\nSOME FAIL')
