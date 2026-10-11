import tempfile, pathlib, os, random, datetime
ROOT=str(pathlib.Path(__file__).resolve().parent.parent.parent)
from playwright.sync_api import sync_playwright
random.seed(5)
iso=lambda t:datetime.datetime.fromtimestamp(t,datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
BULLSEGS=[('IB',50,None),('OB',25,None),('T20',60,None),('S20',20,'O'),('S5',5,'O'),('S1',1,'I'),('MISS',0,None)]
T20SEGS=[('T20',60,None),('S20',20,'O'),('S1',1,'O'),('S5',5,'O'),('T1',3,None),('MISS',0,None)]
def game(i,segs,aim,base=1760000000,legacy=False):
    ds=[]
    for k in range(24):
        sg,sc,z=random.choice(segs)
        d={'id':f'd{i}_{k}','sessionId':f'g{i}','roundIndex':k//3+1,'dartIndex':k%3+1,'timestamp':iso(base+i*86400+k*5),'segment':sg,'zone':z,'score':sc,'inputSource':'manual','corrected':False}
        if not legacy: d['aim']=aim
        ds.append(d)
    return {'id':f'g{i}','schemaVersion':1,'gameType':'countup','startedAt':iso(base+i*86400),'endedAt':iso(base+i*86400+200),'status':'completed','darts':ds}
active=lambda:{'id':'a','schemaVersion':1,'gameType':'countup','startedAt':'2026-10-11T01:00:00.000Z','endedAt':None,'status':'active','darts':[]}
fails=0
def chk(c,m):
    global fails
    print(('PASS ' if c else 'FAIL ')+m)
    fails+=0 if c else 1
def boot(b,f,store,vp=(390,844)):
    c=b.new_context(viewport={'width':vp[0],'height':vp[1]});pg=c.new_page();errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file://'+ROOT+'/'+f)
    pg.evaluate("s=>localStorage.setItem('dtl-data-v1',JSON.stringify(s))",store);pg.reload();pg.wait_for_timeout(300)
    pg.evaluate("document.getElementById('startupFx')&&(document.getElementById('startupFx').style.display='none')")
    return c,pg,errs
with sync_playwright() as p:
    b=p.chromium.launch()
    for f in ['index.html','preview.html']:
        # mixed data: 2 legacy (no aim => BULL), 1 BULL, 2 T20
        st={'schemaVersion':1,'sessions':[game(5,T20SEGS,'T20'),game(4,T20SEGS,'T20'),game(3,BULLSEGS,'BULL'),game(2,BULLSEGS,None,legacy=True),game(1,BULLSEGS,None,legacy=True)],'active':active(),'bindings':{},'roundDelay':8,'soundEnabled':True,'aimTarget':'T20'}
        c,pg,errs=boot(b,f,st)
        chk(pg.evaluate("document.getElementById('aimChip').textContent")=='AIM T20',f+' play chip shows AIM T20')
        pg.click('nav.tabs [data-tab=analysis]');pg.wait_for_timeout(250)
        sel=pg.evaluate("[...document.querySelectorAll('[data-aim-sel]')].map(b=>b.dataset.aimSel+(b.classList.contains('selected')?'*':'')).join(',')")
        chk(sel=='BULL,T20*',f+' aim selector BULL,T20* (current aim default): '+sel)
        t=pg.evaluate("document.getElementById('metrics').innerText")
        chk(pg.evaluate("[...document.querySelectorAll('[data-aim-sel]')].map(b=>b.textContent).join(',')")=='BULL,T20',f+' selector labels not localized')
        chk('T20 RATE' in t and 'AVG / DART' in t and 'NaN' not in t,f+' tiles localized to T20')
        chk('AIM T20' in pg.evaluate("document.getElementById('analysisScope').textContent"),f+' scope shows AIM T20')
        full=pg.evaluate("document.getElementById('analysis').innerText")
        chk(not any(x in full for x in ['NaN','undefined','Infinity']),f+' T20: no NaN/undefined')
        chk(pg.evaluate("document.querySelector('[data-aim-period].selected').dataset.aimPeriod")=='10',f+' 10R still default')
        # target ring drawn
        chk(pg.evaluate("!!document.querySelector('#aimAnalysis svg circle[stroke-dasharray]')"),f+' target ring drawn on heatmap')
        pg.click('[data-aim-sel="BULL"]');pg.wait_for_timeout(200)
        t=pg.evaluate("document.getElementById('metrics').innerText")
        chk('BULL RATE' in t and 'INNER BULL' in t and 'T20' not in t.replace('T20 RATE',''),f+' switched to BULL: tiles back to BULL')
        full=pg.evaluate("document.getElementById('analysis').innerText")
        chk('T20' not in full.split('ACHIEVEMENTS')[0] or 'AIM' in full,f+' BULL view renders')
        chk(not any(x in full for x in ['NaN','undefined','Infinity']),f+' BULL: no NaN/undefined')
        # rounds counted separately: BULL aim has 3 games = 24 rounds
        chk(pg.evaluate("document.getElementById('analysisScope').textContent").startswith('10R'),f+' BULL scope '+pg.evaluate("document.getElementById('analysisScope').textContent"))
        # report under T20
        pg.click('[data-aim-sel="T20"]');pg.wait_for_timeout(150)
        pg.click('#reportBtn');pg.wait_for_function("document.getElementById('reportBody').dataset.done==='1'",timeout=8000)
        rt=pg.evaluate("document.getElementById('reportBody').innerText")
        chk('T20' in rt and 'NaN' not in rt and 'undefined' not in rt,f+' report mentions T20')
        # leaving and returning resets to current aim
        pg.click('nav.tabs [data-tab=play]');pg.click('nav.tabs [data-tab=analysis]');pg.wait_for_timeout(200)
        chk(pg.evaluate("document.querySelector('[data-aim-sel].selected').dataset.aimSel")=='T20',f+' re-entry resets to current aim')
        chk(not errs,f+' no page errors '+str(errs[:2]))
        c.close()
        # settings: change aim, throw, record has aim
        st2={'schemaVersion':1,'sessions':[],'active':active(),'bindings':{},'roundDelay':0,'soundEnabled':False}
        c,pg,errs=boot(b,f,st2)
        pg.click('[data-tab=settings]');pg.select_option('#aimSelect','D16');pg.click('#backFromSettings');pg.wait_for_timeout(100)
        chk(pg.evaluate("document.getElementById('aimChip').textContent")=='AIM D16',f+' chip updates after settings change')
        pg.evaluate("document.getElementById('miss').click()")
        saved=pg.evaluate("JSON.parse(localStorage.getItem('dtl-data-v1'))")
        chk(saved.get('aimTarget')=='D16' and saved['active']['darts'][0].get('aim')=='D16',f+' aimTarget saved and dart records aim')
        # chip tap opens settings
        pg.click('#aimChip');chk(pg.evaluate("document.getElementById('settings').classList.contains('active')"),f+' chip opens settings')
        # empty-data analysis with non-bull aim
        pg.click('[data-tab=analysis]');pg.wait_for_timeout(200)
        t=pg.evaluate("document.getElementById('analysis').innerText")
        chk(not any(x in t for x in ['NaN','undefined','Infinity']),f+' empty data + D16 aim: no NaN')
        chk(not errs,f+' no page errors (settings flow) '+str(errs[:2]))
        c.close()
        # legacy-only data (no aim, no aimTarget) behaves as BULL, no selector
        st3={'schemaVersion':1,'sessions':[game(1,BULLSEGS,None,legacy=True)],'active':active(),'bindings':{},'roundDelay':8,'soundEnabled':True}
        c,pg,errs=boot(b,f,st3,(375,667))
        pg.click('nav.tabs [data-tab=analysis]');pg.wait_for_timeout(200)
        chk(pg.evaluate("document.getElementById('analysisAim').classList.contains('hidden')"),f+' legacy only: no aim selector')
        chk('BULL RATE' in pg.evaluate("document.getElementById('metrics').innerText") and 'AIM' not in pg.evaluate("document.getElementById('analysisScope').textContent"),f+' legacy only: plain BULL view')
        chk(pg.evaluate("document.documentElement.scrollWidth<=innerWidth"),f+' no horizontal overflow at 375')
        chk(not errs,f+' no page errors (legacy)')
        c.close()
print('ALL PASS' if not fails else 'SOME FAIL')
