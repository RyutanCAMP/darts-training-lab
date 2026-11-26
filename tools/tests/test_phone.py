"""PHONE LINK logic test. Firestore is replaced by an in-memory fake (window.__DTL_PHONE_FAKE), so this verifies the
page logic only. The real SDK + security rules + Android REST client are covered by tools/emulator/ (run by hand)."""
import json, pathlib
from playwright.sync_api import sync_playwright
ROOT=str(pathlib.Path(__file__).resolve().parent.parent.parent)
fails=0
def chk(c,m):
    global fails
    print(('PASS ' if c else 'FAIL ')+m); fails+=0 if c else 1
FAKE="""(()=>{window.__links=[];window.__cb=null;window.__since=null;
window.__DTL_PHONE_FAKE={async createLink(code){window.__links.push(code)},
listen(code,since,onBatch,onErr){window.__since=since;window.__cb=onBatch;return()=>{window.__cb=null}}};
let n=0;window.__push=(segs,fromServer=true)=>window.__cb(segs.map(s=>typeof s==='string'?{id:'d'+(++n),seg:s,t:1700000000000+n,n}:s),fromServer);})()"""
ST="(JSON.parse(localStorage.getItem('dtl-data-v1'))||{active:{darts:[]},sessions:[]})"
darts=lambda pg:pg.evaluate(ST+".active.darts.map(d=>d.zone||d.segment)")
done=lambda pg:pg.evaluate(ST+".sessions.filter(s=>s.status==='completed').length")
def boot(b,f,phone=None):
    c=b.new_context(viewport={'width':390,'height':844});pg=c.new_page();pg.errs=[]
    pg.on('pageerror',lambda e:pg.errs.append(str(e)));pg.on('dialog',lambda d:d.accept())
    pg.add_init_script(FAKE);pg.goto('file://'+ROOT+'/'+f)
    pg.evaluate("p=>{localStorage.clear();if(p)localStorage.setItem('dtl-phone-v1',JSON.stringify(p))}",phone);pg.reload();pg.wait_for_timeout(300)
    pg.evaluate("document.getElementById('startupFx')&&(document.getElementById('startupFx').style.display='none')")
    return c,pg
with sync_playwright() as p:
    b=p.chromium.launch()
    for f in ['index.html','preview.html']:
        c,pg=boot(b,f)
        chk(pg.inner_text('#phoneChip')=='INPUT BT',f+' default input = Bluetooth')
        pg.click('#phoneChip');chk(pg.is_visible('#phoneSheet'),f+' sheet opens')
        chk(pg.is_visible('#btBody') and pg.is_hidden('#phoneBody'),f+' BT mode hides phone panel')
        pg.click('#inputPhone');chk(pg.is_visible('#phoneBody') and pg.inner_text('#phoneChip')=='PHONE',f+' switch to PHONE mode')
        chk(pg.inner_text('#phoneCode')=='----' and pg.is_hidden('#phoneStop'),f+' no code yet')
        pg.click('#phoneStart');pg.wait_for_function('window.__cb!==null')
        code=pg.evaluate('window.__links[0]')
        chk(isinstance(code,str) and len(code)==8 and not set(code)&set('01IOL'),f+' code '+str(code))
        chk(pg.inner_text('#phoneCode')==code[:4]+'-'+code[4:],f+' code shown with hyphen')
        chk(pg.evaluate('window.__since')==0,f+' new link listens from 0')
        # first server snapshot = backlog -> logged, not played
        pg.evaluate("window.__push(['T20','T20'])")
        chk(darts(pg)==[],f+' backlog not applied')
        chk(pg.inner_text('#phoneChip')=='PHONE ●' and pg.inner_text('#phoneStatus').startswith('LIVE'),f+' LIVE after server snapshot')
        # live: full game, CHANGE after each round
        segs=[]
        for r in range(8): segs+=['IB','S20I','T20','CHANGE']
        pg.evaluate("s=>window.__push(s)",['START']+segs)
        d=darts(pg)
        chk(len(d)==24 and d[:3]==['IB','S20I','T20'],f+' 24 darts applied (%d)'%len(d))
        chk(pg.inner_text('#score').strip()=='1040',f+' score 1040 ('+pg.inner_text('#score').strip()+')')
        # duplicate id and invalid seg ignored
        before=pg.evaluate("JSON.parse(localStorage.getItem('dtl-phone-v1')||'{\"log\":[]}').log.length")
        pg.evaluate("window.__push([{id:'d3',seg:'IB',t:1,n:1},{id:'zz',seg:'X99',t:2,n:2},{id:'zz2',seg:'T20',t:'bad',n:3}])")
        chk(len(darts(pg))==24,f+' duplicate/invalid ignored')
        # START at 24 confirms the game
        pg.evaluate("window.__push(['START'])")
        chk(done(pg)==1 and darts(pg)==[],f+' START confirms game')
        # next game: dart arriving during a round break is not dropped; 24 + new dart auto-confirms
        pg.evaluate("window.__push(Array(24).fill('S1O'))")
        chk(len(darts(pg))==24,f+' 24 darts without CHANGE (round breaks skipped)')
        pg.evaluate("window.__push(['D20'])")
        chk(done(pg)==2 and darts(pg)==['D20'],f+' new dart after 24 auto-confirms and starts next game')
        # toggle off -> logged only
        pg.click('#phoneChip');pg.click('#phoneToPlay')
        pg.evaluate("window.__push(['T19'])")
        chk(darts(pg)==['D20'],f+' toggle OFF not applied')
        pg.wait_for_timeout(450)
        st=pg.evaluate("JSON.parse(localStorage.getItem('dtl-phone-v1'))")
        chk(st['toPlay'] is False and st['log'][-1]['seg']=='T19' and st['log'][-1]['play'] is False,f+' toggle saved, throw logged')
        chk('T19' not in pg.inner_text('#phoneLog') and 'TRIPLE 19' in pg.inner_text('#phoneLog'),f+' log readable')
        # PHONE mode: 200S keyboard on this PC is ignored
        pg.click('#phoneSheet [data-close-sheet]');n=len(darts(pg));pg.keyboard.press('o');pg.wait_for_timeout(100)
        chk(len(darts(pg))==n,f+' PHONE mode ignores 200S keys')
        # back to Bluetooth: listener stops, keys work, mode remembered
        pg.click('#phoneChip');pg.click('#inputBt')
        chk(pg.evaluate('window.__cb')==None and pg.inner_text('#phoneChip')=='INPUT BT',f+' BT mode stops listening')
        pg.click('#phoneSheet [data-close-sheet]');pg.keyboard.press('o');pg.wait_for_timeout(100)
        chk(len(darts(pg))==n+1,f+' BT mode accepts 200S keys')
        chk(pg.evaluate("JSON.parse(localStorage.getItem('dtl-phone-v1')).mode")=='bt',f+' mode saved')
        pg.reload();pg.wait_for_timeout(300)
        chk(pg.evaluate('window.__cb')==None and pg.inner_text('#phoneChip')=='INPUT BT',f+' after reload: still BT, not listening')
        pg.evaluate("document.getElementById('startupFx')&&(document.getElementById('startupFx').style.display='none')")
        pg.click('#phoneChip');pg.click('#inputPhone');pg.wait_for_function('window.__cb!==null')
        chk(pg.evaluate('window.__links.length')==0 and pg.inner_text('#phoneCode').replace('-','')==code,f+' back to PHONE: same code resumes, no new link')
        # stop
        pg.click('#phoneStop')
        chk(pg.inner_text('#phoneCode')=='----' and pg.inner_text('#phoneChip')=='PHONE',f+' stop clears code (mode stays PHONE)')
        chk(not pg.errs,f+' no page errors '+str(pg.errs))
        c.close()
    # resume after reload: saved code listens from lastT, without creating a new link
    c,pg=boot(b,'index.html',{'code':'ABCD2345','toPlay':True,'lastT':1700000000099,'log':[{'id':'old','seg':'T20','t':1700000000099,'at':1,'play':True}]})
    pg.wait_for_function('window.__cb!==null')
    chk(pg.evaluate('window.__links.length')==0 and pg.evaluate('window.__since')==1700000000099-3600000,'saved code resumes 1h before lastT (overlap)')
    pg.evaluate("window.__push([],false)")
    chk(pg.inner_text('#phoneChip')=='PHONE','cache snapshot is not LIVE yet')
    pg.evaluate("window.__push([{id:'old',seg:'T20',t:1700000000099,n:1},{id:'sameMs',seg:'T1',t:1700000000099,n:2},{id:'earlier',seg:'T2',t:1700000000050,n:3}])")
    lg=pg.evaluate("JSON.parse(localStorage.getItem('dtl-phone-v1')||'{}').log||[]")
    pg.wait_for_timeout(400);lg=pg.evaluate("JSON.parse(localStorage.getItem('dtl-phone-v1')).log.map(e=>e.id)")
    chk(lg.count('old')==1 and 'sameMs' in lg and 'earlier' in lg,'overlap: same-ms and earlier throws kept, seen id not duplicated '+str(lg))
    pg.evaluate("window.__push(['OB'])")
    chk(darts(pg)==['OB'],'already-seen id skipped; live throw applied')
    chk(not pg.errs,'no page errors '+str(pg.errs))
    c.close()
    # 200S keyboard path (START/CHANGE were refactored into board200sStart/board200sChange) still works
    c,pg=boot(b,'index.html')
    pg.keyboard.press('Tab');chk('START：投球待機' in pg.inner_text('#board200sStatus'),'200S START key')
    for k in ['o','Shift+W','a']: pg.keyboard.press(k);pg.wait_for_timeout(260)
    chk(darts(pg)==['IB','S20I','T10'],'200S keys -> darts '+str(darts(pg)))
    pg.keyboard.press('Enter');chk('CHANGE：次のラウンドへ' in pg.inner_text('#board200sStatus'),'200S CHANGE ends round break')
    pg.keyboard.press('o');pg.wait_for_timeout(100)
    chk(darts(pg)[-1:]==['IB'] and len(darts(pg))==4,'dart after CHANGE accepted')
    chk(not pg.errs,'no page errors '+str(pg.errs))
    c.close()
    # bad saved data does not break the page
    c,pg=boot(b,'index.html',{'code':'bad!','log':'x'})
    chk(pg.inner_text('#phoneChip')=='INPUT BT' and not pg.errs,'corrupt phone state ignored '+str(pg.errs))
    c.close()
    b.close()
print('ALL PASS' if fails==0 else 'FAILURES %d'%fails)
