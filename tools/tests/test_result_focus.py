import tempfile, pathlib, os
S=os.environ.get('S') or tempfile.mkdtemp()
ROOT=str(pathlib.Path(__file__).resolve().parent.parent.parent)
from playwright.sync_api import sync_playwright
import random,datetime
random.seed(3)
segs=[('IB',50,None),('OB',25,None),('T20',60,None),('S20',20,'outer'),('S5',5,'outer'),('S1',1,'inner'),('MISS',0,None)]
iso=lambda t:datetime.datetime.utcfromtimestamp(t).isoformat()+'Z'
def game(i,base=1760000000):
    ds=[]
    for k in range(24):
        sg,sc,z=random.choice(segs)
        ds.append({'sessionId':'g%d'%i,'roundIndex':k//3+1,'dartIndex':k%3+1,'timestamp':iso(base+i*86400+k*5),'segment':sg,'zone':z,'score':sc})
    return {'id':'g%d'%i,'startedAt':iso(base+i*86400),'status':'completed','darts':ds}
act=game(9);act['status']='active';act['endedAt']=None;act['schemaVersion']=1;act['gameType']='countup'
store={'schemaVersion':1,'sessions':[game(i) for i in range(3,0,-1)],'active':act,'bindings':{},'roundDelay':0,'soundEnabled':True}
fails=0
def chk(c,m):
    global fails
    print(('PASS ' if c else 'FAIL ')+m); fails+=0 if c else 1
with sync_playwright() as p:
    b=p.chromium.launch()
    for f in ['index.html','preview.html']:
        c=b.new_context(viewport={'width':390,'height':844});pg=c.new_page();errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto('file://'+ROOT+'/'+f)
        pg.evaluate("s=>localStorage.setItem('dtl-data-v1',JSON.stringify(s))",store);pg.reload();pg.wait_for_timeout(300)
        pg.evaluate("document.getElementById('startupFx')&&(document.getElementById('startupFx').style.display='none')")
        chk(pg.evaluate("[...document.querySelectorAll('nav.tabs button')].map(b=>b.textContent).join(',')")=='PLAY,分析,履歴,セット',f+' tabs PLAY,分析,履歴,セット')
        pg.click('nav.tabs [data-tab=analysis]');pg.wait_for_timeout(200)
        vis=pg.evaluate("!document.getElementById('focusPanel').classList.contains('hidden')"); print(' focus:',vis,pg.evaluate("document.getElementById('focusBody').innerText").replace('\n',' | ')[:100])
        chk(not vis or len(pg.evaluate("document.getElementById('focusBody').innerText"))>5,f+' focus panel consistent')
        pg.click('nav.tabs [data-tab=play]')
        pg.wait_for_timeout(300)
        t=pg.evaluate("document.getElementById('resultCompare').innerText").replace('\n',' | '); print(' compare:',t)
        chk('VS AVG' in t and 'RANK' in t and 'NaN' not in t and 'undefined' not in t,f+' result compare shown')
        chk(not errs,f+' no page errors '+str(errs[:2]))
        c.close()
    c=b.new_context(viewport={'width':390,'height':844});pg=c.new_page();pg.goto('file://'+ROOT+'/index.html');pg.evaluate("localStorage.setItem('dtl-data-v1',JSON.stringify({schemaVersion:1,sessions:[],active:{id:'a',schemaVersion:1,gameType:'countup',startedAt:'2026-10-11T01:00:00.000Z',endedAt:null,status:'active',darts:[]},bindings:{},roundDelay:0,soundEnabled:true}))");pg.reload();pg.evaluate("document.getElementById('startupFx')&&(document.getElementById('startupFx').style.display='none')")
    pg.evaluate("a=>{const s={schemaVersion:1,sessions:[],active:a,bindings:{},roundDelay:8,soundEnabled:true};localStorage.setItem('dtl-data-v1',JSON.stringify(s))}",act);pg.reload();pg.wait_for_timeout(300)
    t=pg.evaluate("document.getElementById('resultCompare').innerText"); chk('FIRST GAME' in t,'first game message: '+t)
    pg.screenshot(path=''+S+'/cmp.png')
print('ALL PASS' if not fails else 'SOME FAIL')
