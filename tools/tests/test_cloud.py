"""CLOUD SYNC logic test. Google login / Firestore are replaced by an in-memory fake (window.__DTL_CLOUD_FAKE),
so this verifies the merge/safety logic only - NOT the real Firebase SDK, Google popup or security rules."""
import json, pathlib, datetime
from playwright.sync_api import sync_playwright
ROOT=str(pathlib.Path(__file__).resolve().parent.parent.parent)
iso=lambda t:datetime.datetime.fromtimestamp(t,datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
def game(i):
    ds=[{'id':f'd{i}_{k}','sessionId':f'g{i}','roundIndex':k//3+1,'dartIndex':k%3+1,'timestamp':iso(1760000000+i*86400+k*5),'segment':'IB' if k%4==0 else 'S20','zone':None if k%4==0 else 'O','score':50 if k%4==0 else 20,'inputSource':'manual','corrected':False,'aim':'BULL'} for k in range(24)]
    return {'id':f'g{i}','schemaVersion':1,'gameType':'countup','startedAt':iso(1760000000+i*86400),'endedAt':iso(1760000000+i*86400+200),'status':'completed','darts':ds}
S=lambda n:{'id':n,'SetupName':'set '+n}
fails=0
def chk(c,m):
    global fails
    print(('PASS ' if c else 'FAIL ')+m); fails+=0 if c else 1
FAKE="""(()=>{const st=%s,cbs=[];window.__remote=st;window.__calls=[];
window.__DTL_CLOUD_FAKE={onUser(cb){cbs.push(cb);return()=>{}},login(){cbs.forEach(cb=>cb({uid:'u1',name:'Tester'}))},logout(){cbs.forEach(cb=>cb(null))},
async listSessions(){window.__calls.push('list');if(%s)throw new Error('boom');return Object.values(st.sessions).map(x=>{try{return JSON.parse(x)}catch(_){return null}})},
async deleteSession(u,id){window.__calls.push('del:'+id);delete st.sessions[id]},async putSession(u,s){window.__calls.push('put:'+s.id);st.sessions[s.id]=JSON.stringify(s)},async getMeta(){return st.meta},async putMeta(u,m){window.__calls.push('meta');st.meta=m}}})()"""
def boot(b,f,sessions,my,remote=None,fail=False,extra=None,excluded=None):
    c=b.new_context(viewport={'width':390,'height':844});pg=c.new_page();pg.errs=[];pg.on('pageerror',lambda e:pg.errs.append(str(e)));pg.on('dialog',lambda d:d.accept())
    st=remote or {'sessions':{},'meta':None}
    pg.add_init_script(FAKE%(json.dumps(st),'true' if fail else 'false'))
    pg.goto('file://'+ROOT+'/'+f)
    pg.evaluate("([s,m,x,ex])=>{localStorage.setItem('dtl-data-v1',JSON.stringify(Object.assign({schemaVersion:1,sessions:s,active:null},x||{})));if(ex)localStorage.setItem('dtl-excluded-rounds-v1',JSON.stringify(ex));if(m)localStorage.setItem('retro-my-darts-v1',JSON.stringify(m))}",[sessions,my,extra,excluded]);pg.reload();pg.wait_for_timeout(300)
    pg.evaluate("document.getElementById('startupFx')&&(document.getElementById('startupFx').style.display='none')")
    pg.click('[data-tab=settings]');return c,pg
def rs(g):return {x['id']:json.dumps(x) for x in g}
nl=lambda pg:pg.evaluate("JSON.parse(localStorage.getItem('dtl-data-v1')).sessions.map(s=>s.id).sort().join()")
ml=lambda pg:pg.evaluate("(JSON.parse(localStorage.getItem('retro-my-darts-v1'))||{sets:[]}).sets.map(s=>s.id).sort().join()")
with sync_playwright() as p:
    b=p.chromium.launch()
    for f in ['index.html','preview.html']:
        print('=====',f)
        # signed out: fake never touched
        c,pg=boot(b,f,[game(1)],{'nick':'N','sets':[S('a')],'current':'a'});pg.wait_for_timeout(500)
        chk(pg.evaluate("window.__calls.length")==0,f+' signed-out: no cloud calls')
        chk(pg.evaluate("document.getElementById('cloudLogin').offsetParent!==null"),f+' login button visible')
        # A: push local -> empty cloud
        pg.click('#cloudLogin');pg.wait_for_timeout(600)
        r=pg.evaluate("window.__remote")
        chk(sorted(r['sessions'])==['g1'] and r['meta'] is not None and 'a' in json.loads(r['meta']['json'])['myDarts']['sets'][0]['id'],f+' A: local pushed to empty cloud (1 game + MY DARTS)')
        chk(pg.evaluate("document.getElementById('cloudSync').offsetParent!==null && document.getElementById('cloudLogin').offsetParent===null"),f+' A: buttons switch after login')
        st=pg.evaluate("document.getElementById('cloudStatus').textContent");chk('Tester' in st,f+' A: status shows user: '+st)
        # auto push of a MY DARTS change
        pg.fill('#mySetupName','NEW');pg.click('#mySave');pg.wait_for_timeout(4800)
        sets=[x['SetupName'] for x in json.loads(pg.evaluate("window.__remote")['meta']['json'])['myDarts']['sets']]
        chk('NEW' in sets,f+' A: MY DARTS change auto-pushed (debounced)')
        remoteA=pg.evaluate("window.__remote");c.close()
        # B: fresh device pulls
        c,pg=boot(b,f,[],None,remoteA);pg.click('#cloudLogin');pg.wait_for_timeout(700)
        chk(nl(pg)=='g1',f+' B: empty device receives game: '+nl(pg))
        chk(len(ml(pg).split(','))==2,f+' B: empty device receives MY DARTS: '+ml(pg))
        chk(not pg.errs,f+' B: no page errors '+str(pg.errs[:1]));c.close()
        # C: both sides have different data -> union, nothing lost
        c,pg=boot(b,f,[game(2)],{'nick':'','sets':[S('x')],'current':''},remoteA);pg.click('#cloudLogin');pg.wait_for_timeout(700)
        chk(nl(pg)=='g1,g2',f+' C: games merged (local g2 + cloud g1): '+nl(pg))
        ids=ml(pg).split(',');chk('x' in ids and len(ids)==3,f+' C: sets merged, local kept: '+ml(pg))
        r=pg.evaluate("window.__remote");chk('g2' in r['sessions'],f+' C: local-only game pushed up');c.close()
        # D: invalid remote session ignored
        bad=dict(remoteA);bad['sessions']=dict(remoteA['sessions']);bad['sessions']['junk']=json.dumps({'id':'junk','darts':'x'});bad['sessions']['nul']='null';bad['sessions']['txt']='{oops'
        c,pg=boot(b,f,[],None,bad);pg.click('#cloudLogin');pg.wait_for_timeout(700)
        chk(nl(pg)=='g1' and not pg.errs,f+' D: invalid cloud docs ignored: '+nl(pg));c.close()
        # E: cloud failure must not touch local data or crash
        c,pg=boot(b,f,[game(3)],{'nick':'N','sets':[S('a')],'current':'a'},None,fail=True);pg.click('#cloudLogin');pg.wait_for_timeout(600)
        st=pg.evaluate("document.getElementById('cloudStatus').textContent")
        chk('FAILED' in st and nl(pg)=='g3' and ml(pg)=='a' and not pg.errs,f+' E: cloud failure: local intact, status='+st)
        for t in ['play','analysis','history','settings']:
            pg.click(f'[data-tab={t}]');pg.wait_for_timeout(80)
        chk(pg.evaluate("document.getElementById('settings').classList.contains('active')"),f+' E: tabs still work');c.close()
        # F: logout stops syncing, keeps data
        c,pg=boot(b,f,[game(4)],None);pg.click('#cloudLogin');pg.wait_for_timeout(500);pg.click('#cloudLogout');pg.wait_for_timeout(200)
        n=pg.evaluate("window.__calls.length");pg.fill('#mySetupName','Z');pg.click('#mySave');pg.wait_for_timeout(4800)
        chk(pg.evaluate("window.__calls.length")==n and nl(pg)=='g4',f+' F: after logout nothing is sent, data kept');c.close()
    for f in ['index.html','preview.html']:
        print('===== profile v2 / delete-all',f)
        gs=lambda pg:pg.evaluate("JSON.parse(localStorage.getItem('dtl-data-v1')).goalScore")
        ax=lambda pg:pg.evaluate("JSON.parse(localStorage.getItem('dtl-data-v1')).aimTarget")
        ex=lambda pg:pg.evaluate("JSON.parse(localStorage.getItem('dtl-excluded-rounds-v1')||'[]').sort().join()")
        # G1: push exclusions, goal, aim
        c,pg=boot(b,f,[game(1)],None,None,False,{'goalScore':1000,'aimTarget':'T20'},['g1:2','g1:3']);pg.click('#cloudLogin');pg.wait_for_timeout(700)
        meta=json.loads(pg.evaluate("window.__remote")['meta']['json'])
        chk(meta.get('excluded')==['g1:2','g1:3'] and meta.get('goalScore')==1000 and meta.get('aimTarget')=='T20',f+' G1: exclusions + goal + aim pushed: '+str({k:meta.get(k) for k in ('excluded','goalScore','aimTarget')}))
        remoteG=pg.evaluate("window.__remote");c.close()
        # G2: empty device pulls them
        c,pg=boot(b,f,[],None,remoteG);pg.click('#cloudLogin');pg.wait_for_timeout(700)
        chk(gs(pg)==1000 and ax(pg)=='T20' and ex(pg)=='g1:2,g1:3',f+' G2: new device receives exclusions/goal/aim: '+str((gs(pg),ax(pg),ex(pg))));c.close()
        # G3: first sync with local data: exclusions unioned, local goal kept
        c,pg=boot(b,f,[game(2)],None,remoteG,False,{'goalScore':900},['g2:1']);pg.click('#cloudLogin');pg.wait_for_timeout(700)
        chk(ex(pg)=='g1:2,g1:3,g2:1' and gs(pg)==900 and ax(pg)=='T20',f+' G3: first-sync merge (union exclusions, local goal wins, aim filled): '+str((gs(pg),ax(pg),ex(pg))));c.close()
        # H: delete all history -> cloud copy removed on request
        c,pg=boot(b,f,[game(1),game(2)],None);pg.click('#cloudLogin');pg.wait_for_timeout(700)
        n0=len(pg.evaluate("window.__remote")['sessions']);pg.evaluate("document.getElementById('clearall').click()");pg.wait_for_timeout(600)
        left=len(pg.evaluate("window.__remote")['sessions'])
        chk(n0==2 and left==0 and nl(pg)=='' and not pg.errs,f+f' H: delete-all also deletes cloud copy (before {n0}, after {left}, local "{nl(pg)}") errs={pg.errs[:1]}');c.close()
    # file:// without fake -> login disabled, no crash
    c=b.new_context();pg=c.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto('file://'+ROOT+'/index.html');pg.wait_for_timeout(300)
    pg.click('[data-tab=settings]')
    chk(pg.evaluate("document.getElementById('cloudLogin').disabled")and not errs,'file:// without fake: login disabled, status="'+pg.evaluate("document.getElementById('cloudStatus').textContent")+'"')
    b.close()
print('ALL PASS' if not fails else f'SOME FAIL ({fails})')
