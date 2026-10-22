"""Landscape-first play screen: geometry, real hit input and rotation."""
import functools,http.server,json,pathlib,threading
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[2]
ART=ROOT/'.test-artifacts';ART.mkdir(exist_ok=True)
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
class Server(http.server.ThreadingHTTPServer):request_queue_size=128
server=Server(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
s={'id':'arena-fixture','schemaVersion':1,'gameType':'zero-one','status':'active','startedAt':'2026-10-22T01:00:00Z','rules':{'startScore':301,'inRule':'straight','outRule':'open','bullMode':'fat','maxRounds':20},'players':[{'id':'p1','name':'プレーヤー1'},{'id':'p2','name':'プレーヤー2'}],'readyTurn':2,'darts':[]}
for i,seg in enumerate(['T20','T20','T20','S20','S20','S20','T17','OB']):
 turn=i//3
 s['darts'].append({'id':str(i),'sessionId':s['id'],'roundIndex':turn//2+1,'dartIndex':i%3+1,'playerIndex':turn%2,'segment':seg,'zone':None,'score':50 if seg=='OB' else int(seg[1:])*{'S':1,'T':3}[seg[0]],'timestamp':s['startedAt'],'inputSource':'manual','aim':'BULL'})
def click(pg,id):pg.locator('#'+id).evaluate('e=>e.click()')
def state(pg):return pg.evaluate("JSON.parse(localStorage.getItem('dtl-data-v1'))")
def box(pg,selector):return pg.locator(selector).bounding_box()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch()
  for filename in ['index.html','preview.html']:
   for w,h in [(1280,800),(1024,768),(844,390),(667,375),(640,360),(390,844)]:
    ctx=browser.new_context(viewport={'width':w,'height':h},has_touch=True)
    ctx.route('https://raw.githubusercontent.com/**/barrels.json',lambda r:r.fulfill(path=str(ROOT/'data/barrels.json'),content_type='application/json',headers={'Access-Control-Allow-Origin':'*'}))
    pg=ctx.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));pg.on('dialog',lambda d:d.accept())
    url=f'http://127.0.0.1:{server.server_port}/index.html' if filename=='index.html' else (ROOT/filename).as_uri()
    pg.goto(url);pg.evaluate("s=>localStorage.setItem('dtl-data-v1',JSON.stringify({schemaVersion:1,sessions:[],active:s,soundEnabled:false}))",s);pg.reload();pg.evaluate("document.getElementById('startupFx').style.display='none'")
    assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth')
    board=box(pg,'#board');dock=box(pg,'.arena-score-dock');left=box(pg,'.arena-rounds');right=box(pg,'.arena-turn')
    assert dock['y']>=board['y']+board['height']
    if w>h:
     assert left['x']+left['width']<=board['x'] and board['x']+board['width']<=right['x']
     stage=box(pg,'.arena-stage');assert stage['y']+stage['height']<=h+2,(w,h,stage)
    else:assert dock['y']<left['y'] and board['width']>=280
    assert pg.locator('.match-player.current #checkoutGuide').count()==1
    assert pg.locator('#checkoutGuide').is_visible() and pg.locator('.checkout-route').all_text_contents()==['S20','D10']
    assert pg.locator('#score').inner_text()=='20'
    assert pg.locator('#rounds>div:visible').count()<=3
    click(pg,'toggleRounds');assert pg.locator('#rounds>div:visible').count()==20
    click(pg,'toggleRounds');assert pg.locator('#rounds>div:visible').count()<=3
    assert pg.locator('#throwlog').is_hidden() and pg.locator('#livebull').is_hidden()
    pg.screenshot(path=str(ART/f'arena-final-{filename}-{w}x{h}.png'),full_page=True)
    # The board retains its real pointer/touch event bindings after moving DOM.
    pg.locator('#board').scroll_into_view_if_needed();b=box(pg,'#board svg')
    pg.touchscreen.tap(b['x']+b['width']/2,b['y']+b['height']/2)
    assert len(state(pg)['active']['darts'])==9 and state(pg)['active']['darts'][-1]['segment']=='IB'
    assert pg.locator('#turnChange').is_visible() # Remaining 20 -> bull bust.
    click(pg,'undo');assert len(state(pg)['active']['darts'])==8
    pg.set_viewport_size({'width':h,'height':w})
    assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert pg.locator('#score').inner_text()=='20' and pg.locator('.match-player.current #checkoutGuide').count()==1
    settings=pg.locator('.arena-settings') if pg.locator('.arena-settings').is_visible() else pg.locator('.settings-icon')
    settings.click();assert pg.locator('#settings').is_visible()
    click(pg,'backFromSettings');assert pg.locator('#score').inner_text()=='20'
    click(pg,'soloMode');assert pg.locator('#score').is_visible() and pg.locator('#checkoutGuide').is_hidden()
    for _ in range(3):pg.locator('#board .hit[data-segment="S20O"]').dispatch_event('click')
    assert pg.locator('#roundBreak').is_visible()
    skip=box(pg,'#skipRoundBreak');viewport=pg.viewport_size
    assert skip['y']>=0 and skip['y']+skip['height']<=viewport['height'],(viewport,skip)
    click(pg,'skipRoundBreak');assert pg.locator('#roundBreak').is_hidden()
    assert not errors,errors
    ctx.close();print(f'PASS arena {filename} {w}x{h}: placement, viewport fit, checkout, round list, touch, undo, rotation',flush=True)
  browser.close()
finally:server.shutdown();server.server_close()
print('ALL PASS')
