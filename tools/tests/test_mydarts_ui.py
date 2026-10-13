"""PLAY chips (AIM / SET / GUEST), set quick-switch sheet, MY DARTS form (auto name, duplicate, collapsed extras)."""
import json, pathlib
from playwright.sync_api import sync_playwright
ROOT=str(pathlib.Path(__file__).resolve().parent.parent.parent)
fails=0
def chk(c,m):
    global fails
    print(('PASS ' if c else 'FAIL ')+m); fails+=0 if c else 1
my={'nick':'N','sets':[{'id':'a','SetupName':'LAZY','BarrelModel':'LAZY TYPE2.5','BarrelBrand':'TRiNiDAD','BarrelWeight':'18','Memo':'m'},{'id':'b','SetupName':'RISING SUN','BarrelBrand':'TARGET'}],'current':'b'}
FAKE="""(()=>{const cbs=[];window.__DTL_CLOUD_FAKE={onUser(cb){cbs.push(cb);return()=>{}},login(){cbs.forEach(cb=>cb({uid:'u1',name:'からりゅう'}))},logout(){cbs.forEach(cb=>cb(null))},async listSessions(){return[]},async putSession(){},async getMeta(){return null},async putMeta(){}}})()"""
with sync_playwright() as p:
    b=p.chromium.launch()
    for f in ['index.html','preview.html']:
        c=b.new_context(viewport={'width':390,'height':844});c.route('https://raw.githubusercontent.com/**/barrels.json',lambda r:r.fulfill(path=ROOT+'/data/barrels.json',content_type='application/json',headers={'Access-Control-Allow-Origin':'*'}));pg=c.new_page();errs=[];msgs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('dialog',lambda d:(msgs.append(d.message),d.accept()))
        pg.add_init_script(FAKE)
        pg.goto('file://'+ROOT+'/'+f);pg.evaluate("m=>localStorage.setItem('retro-my-darts-v1',JSON.stringify(m))",my);pg.reload();pg.wait_for_timeout(300)
        pg.evaluate("document.getElementById('startupFx')&&(document.getElementById('startupFx').style.display='none')")
        chk(pg.evaluate("document.getElementById('setChip').textContent")=='SET RISING SUN',f+' SET chip shows current set')
        chk(pg.evaluate("document.getElementById('authChip').textContent")=='GUEST',f+' auth chip = GUEST')
        chk(pg.evaluate("document.getElementById('aimChip').textContent")=='AIM BULL',f+' AIM chip still there')
        chk(pg.evaluate("document.documentElement.scrollWidth<=innerWidth"),f+' no horizontal overflow on PLAY')
        pg.click('#setChip');chk(pg.evaluate("!document.getElementById('setSheet').classList.contains('hidden')"),f+' sheet opens')
        chk(pg.evaluate("document.querySelectorAll('#setSheetList .sheet-item').length")==3 and pg.evaluate("document.querySelector('#setSheetList .on').textContent.includes('RISING SUN')"),f+' sheet lists none+2 sets, current marked')
        pg.click('#setSheetList [data-use="a"]');pg.wait_for_timeout(100)
        chk(pg.evaluate("JSON.parse(localStorage.getItem('retro-my-darts-v1')).current")=='a' and pg.evaluate("document.getElementById('setChip').textContent")=='SET LAZY' and pg.evaluate("document.getElementById('setSheet').classList.contains('hidden')"),f+' sheet pick switches set, chip + sheet update')
        pg.click('#setChip');pg.click('#setSheetList [data-use=""]');pg.wait_for_timeout(100)
        chk(pg.evaluate("document.getElementById('setChip').textContent")=='SET 未設定',f+' can switch to none')
        pg.click('#setChip');pg.click('#setSheetEdit');pg.wait_for_timeout(200)
        chk(pg.evaluate("document.getElementById('setups').classList.contains('active')"),f+' sheet -> edit opens the SET tab')
        # form
        chk(pg.evaluate("document.querySelector('details.my-more').open"),f+' flight/shaft/tip fields shown on the SET screen')
        chk(pg.evaluate("document.getElementById('myEditTitle').textContent")=='新しいセットを登録',f+' title: new set')
        pg.click('[data-slot-edit="a"]');chk(pg.evaluate("document.getElementById('myEditTitle').textContent")=='SET 1 を編集中',f+' title: editing SET 1')
        pg.click('#myDuplicate');
        chk(pg.evaluate("mySetupName.value")=='LAZY コピー' and pg.evaluate("myBarrelModel.value")=='LAZY TYPE2.5' and pg.evaluate("document.getElementById('myEditTitle').textContent")=='新しいセットを登録',f+' duplicate fills a NEW set (name+コピー)')
        pg.click('#mySave');pg.wait_for_timeout(100)
        sets=pg.evaluate("JSON.parse(localStorage.getItem('retro-my-darts-v1')).sets.map(s=>s.SetupName)")
        chk(sets==['LAZY','RISING SUN','LAZY コピー'],f+' duplicate saved as 3rd set: '+str(sets))
        # catalog pick auto-fills the name
        pg.click('#myClear');pg.fill('#myModelSearch','LAZY');pg.wait_for_timeout(80)
        pg.evaluate("document.querySelector('#myModelResults [data-catalog-index]').click()")
        chk(pg.evaluate("mySetupName.value")!='' and pg.evaluate("mySetupName.value")==pg.evaluate("myBarrelModel.value"),f+' catalog pick auto-fills set name')
        # login -> chip + default nickname
        pg.click('[data-tab=play]');pg.click('#authChip');pg.fill('#myNick','');pg.dispatch_event('#myNick','change')
        pg.click('#cloudLogin');pg.wait_for_timeout(700)
        chk(pg.evaluate("document.getElementById('authChip').textContent")=='からりゅう',f+' auth chip shows name after login')
        chk(pg.evaluate("JSON.parse(localStorage.getItem('retro-my-darts-v1')).nick")=='からりゅう',f+' empty nickname defaults to Google name')
        msgs.clear();pg.click('#cloudLogout');pg.wait_for_timeout(200)
        chk(any('ログアウト' in m and '残り' in m for m in msgs) and pg.evaluate("document.getElementById('authChip').textContent")=='GUEST',f+' logout confirms (data stays), chip back to GUEST')
        pg.keyboard.press('Escape');pg.click('[data-tab=play]');pg.click('#authChip');pg.wait_for_timeout(200)
        chk(pg.evaluate("!document.getElementById('accountSheet').classList.contains('hidden') && document.getElementById('play').classList.contains('active')"),f+' auth chip opens PLAYER sheet in place')
        chk(not errs,f+' no page errors '+str(errs[:1]));c.close()
    b.close()
print('ALL PASS' if not fails else f'SOME FAIL ({fails})')
