"""Cross-feature regression checks for the split scripts and standalone preview.

Uses synthetic keyboard events for 200S; this does not verify physical hardware.
Web Audio source starts are counted; this does not verify audible output.
"""
import functools, http.server, json, pathlib, threading
from playwright.sync_api import sync_playwright

ROOT=pathlib.Path(__file__).resolve().parents[2]
KEY='dtl-data-v1'
class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
class Server(http.server.ThreadingHTTPServer):
    request_queue_size=128
server=Server(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()

def state(page):
    return page.evaluate("JSON.parse(localStorage.getItem('dtl-data-v1'))")
def hit(page,segment):
    page.locator('#board .hit[data-segment="'+segment+'"]').dispatch_event('click')
def activate(page,id):
    # Settings include collapsed developer controls; invoke the actual bound button.
    page.locator('#'+id).evaluate('e=>e.click()')
def key(page,code,value):
    page.evaluate("([code,key])=>document.dispatchEvent(new KeyboardEvent('keydown',{code,key,bubbles:true}))",[code,value])

AUDIO="""(()=>{
window.__audioStarts=0;
const A=window.AudioContext;
if(A)window.AudioContext=class extends A {
 createOscillator(){const n=super.createOscillator(),start=n.start.bind(n);n.start=(...a)=>{window.__audioStarts++;return start(...a)};return n}
 createBufferSource(){const n=super.createBufferSource(),start=n.start.bind(n);n.start=(...a)=>{window.__audioStarts++;return start(...a)};return n}
};
})()"""

try:
    with sync_playwright() as p:
        browser=p.chromium.launch()
        for filename in ['index.html','preview.html']:
            url=(f'http://127.0.0.1:{server.server_port}/index.html' if filename=='index.html' else (ROOT/filename).as_uri())
            for mobile in [False,True]:
                context=browser.new_context(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 900},is_mobile=mobile,has_touch=mobile)
                context.route('https://raw.githubusercontent.com/**/barrels.json',lambda r:r.fulfill(path=str(ROOT/'data/barrels.json'),content_type='application/json',headers={'Access-Control-Allow-Origin':'*'}))
                page=context.new_page(); errors=[]
                page.on('pageerror',lambda e:errors.append(str(e)))
                page.on('dialog',lambda d:d.accept())
                page.add_init_script(AUDIO)
                page.goto(url)
                page.locator('#board .hit').first.wait_for()
                page.evaluate("document.getElementById('startupFx').style.display='none'")
                assert page.locator('#board .hit').count()==82
                assert page.evaluate("typeof globalThis.RETRO_DARTS_MODULES==='undefined' && typeof globalThis.runtime==='undefined'")
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')

                # Actual pointer/touch input on the inner bull, then undo.
                box=page.locator('#board svg').bounding_box()
                x,y=box['x']+box['width']/2,box['y']+box['height']/2
                if mobile: page.touchscreen.tap(x,y)
                else: page.mouse.click(x,y)
                assert state(page)['active']['darts'][0]['segment']=='IB'
                assert page.locator('#score').inner_text()=='50'
                assert page.locator('#board [data-segment=IB]').evaluate("e=>e.classList.contains('flash-inner-bull')")
                page.click('#undo');assert len(state(page)['active']['darts'])==0

                sequence=['OB','IB','D20','T20','MISS','S20I']*4
                for i,segment in enumerate(sequence):
                    if segment=='MISS': page.click('#miss')
                    else: hit(page,segment)
                    assert len(state(page)['active']['darts'])==i+1
                    if (i+1)%3==0 and i<23:
                        assert page.locator('#roundBreak').is_visible()
                        hit(page,'S1O');assert len(state(page)['active']['darts'])==i+1
                        page.click('#skipRoundBreak')
                        assert page.locator('#roundlabel').inner_text()==f'ROUND {(i+1)//3+1} / 8'
                page.locator('#resultpanel').wait_for(state='visible')
                assert page.locator('#resultscore').inner_text()=='880'
                assert [d['score'] for d in state(page)['active']['darts']]==[50,50,40,60,0,20]*4
                page.click('#undo');assert len(state(page)['active']['darts'])==23
                hit(page,'S20I');page.locator('#resultpanel').wait_for(state='visible')
                page.click('#saveResult')
                saved=state(page)['sessions'][0]
                assert saved['status']=='completed' and len(saved['darts'])==24
                assert page.locator('#sessiondetail tbody tr').count()==24
                assert state(page)['schemaVersion']==1
                page.reload();assert state(page)['sessions'][0]==saved
                page.evaluate("document.getElementById('startupFx').style.display='none'")

                # Export -> fresh context -> import, through the real file input.
                page.click('.settings-icon')
                with page.expect_download() as download: activate(page,'exportjson')
                payload=pathlib.Path(download.value.path()).read_bytes()
                backup=json.loads(payload)
                assert backup['sessions'][0]==saved
                page.click('#backFromSettings')

                # Award delay and cooldown must both block the next dart.
                for segment in ['OB','IB','OB']: hit(page,segment)
                assert page.locator('#gameFxTitle').inner_text()=='HAT TRICK!'
                hit(page,'S1O');assert len(state(page)['active']['darts'])==3
                page.locator('#roundBreak').wait_for(state='visible',timeout=6000)
                assert page.locator('#roundBreakPraise').inner_text()=='HAT TRICK!'
                page.click('#skipRoundBreak')
                page.click('#endgame')
                assert state(page)['sessions'][0]['status']=='abandoned'
                page.click('nav.tabs [data-tab=play]');hit(page,'D20');page.click('#newgame')
                assert not state(page)['active']['darts']

                # 200S scoring and CHANGE/START keys (synthetic signals).
                for code,value in [('KeyA','A'),('KeyG','G'),('KeyO','o')]:
                    key(page,code,value);page.wait_for_timeout(190)
                darts=state(page)['active']['darts']
                assert [(d['segment'],d['inputSource']) for d in darts]==[('S20','board'),('OB','board'),('IB','board')]
                assert darts[0]['zone']=='S20O'
                key(page,'Enter','Enter');assert page.locator('#roundBreak').is_hidden()
                key(page,'Tab','Tab');assert len(state(page)['active']['darts'])==3
                page.click('#undo');page.click('#undo');page.click('#undo')

                # Calibration uses an unmapped key; legacy bindings remain intact.
                page.click('.settings-icon');activate(page,'calibrationStart')
                key(page,'F8','F8')
                assert state(page)['bindings']['F8 | F8']=='S20'
                assert state(page)['calibrationKeys']['S20O']=='F8 | F8'
                activate(page,'calibrationStop')
                page.locator('[data-sound-volume=hit]').evaluate("e=>e.value='37'")
                page.locator('[data-sound-volume=hit]').dispatch_event('input')
                assert state(page)['soundVolumes']['hit']==37
                activate(page,'soundTest')
                page.wait_for_function("document.getElementById('soundStatus').textContent.includes('再生中')")
                assert page.evaluate('window.__audioStarts')>0
                activate(page,'soundToggle');assert state(page)['soundEnabled'] is False
                page.reload();assert state(page)['soundVolumes']['hit']==37 and state(page)['soundEnabled'] is False
                assert not errors,errors
                context.close()

                restored=browser.new_context();rp=restored.new_page();rp.on('dialog',lambda d:d.accept())
                rp.goto(url);rp.locator('#board .hit').first.wait_for();rp.evaluate("document.getElementById('startupFx').style.display='none'")
                rp.locator('#importjson').set_input_files({'name':'backup.json','mimeType':'application/json','buffer':payload})
                rp.wait_for_function("JSON.parse(localStorage.getItem('dtl-data-v1')||'{}').sessions?.length===1")
                assert state(rp)['sessions'][0]==saved
                restored.close()
                print(f'PASS {filename} {"mobile" if mobile else "desktop"}: 24 darts, scores, rounds, undo, awards, history, backup/restore, keyboard, calibration, audio scheduling/settings')
        browser.close()
finally:
    server.shutdown();server.server_close()
print('ALL PASS')
