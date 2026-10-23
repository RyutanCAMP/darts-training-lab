"""Standard cricket: marks, points, closing win, round limit, solo MPR and 2-player handoff."""
import functools, http.server, pathlib, threading
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[2]
ART=ROOT/'.test-artifacts';ART.mkdir(exist_ok=True)
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
class Server(http.server.ThreadingHTTPServer):request_queue_size=128
server=Server(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
def click(pg,id):pg.locator('#'+id).evaluate('e=>e.click()')
def hit(pg,seg):
 if seg=='MISS':click(pg,'miss')
 else:pg.locator('#board .hit[data-segment="'+(seg+'O' if seg.startswith('S') else seg)+'"]').dispatch_event('click')
def state(pg):return pg.evaluate("JSON.parse(localStorage.getItem('dtl-data-v1'))")
def skip(pg):pg.evaluate("(()=>{const b=document.getElementById('skipRoundBreak');if(b&&!document.getElementById('roundBreak').classList.contains('hidden'))b.click()})()")
def load(pg,active,sessions=None):
 pg.evaluate("([active,sessions])=>localStorage.setItem('dtl-data-v1',JSON.stringify({schemaVersion:1,active,sessions,bindings:{},soundEnabled:false,roundDelay:5}))",[active,sessions or []]);pg.reload();pg.evaluate("document.getElementById('startupFx').style.display='none'")
try:
 with sync_playwright() as p:
  browser=p.chromium.launch();unit=browser.new_page()
  for f in ['game/zero-one.js','game/cricket.js']:unit.add_script_tag(content=(ROOT/f).read_text(encoding='utf-8'))
  fixtures=unit.evaluate("""()=>{
   const r={points:s=>s==='IB'||s==='OB'?50:s==='MISS'?0:Number(s.slice(1))*({S:1,D:2,T:3}[s[0]]||0)};
   RETRO_DARTS_MODULES.connectZeroOne(r);RETRO_DARTS_MODULES.connectCricket(r);
   const check=(v,n)=>{if(!v)throw Error(n)};
   const make=(segments,players)=>{
    const s={id:players?'match':'solo',schemaVersion:1,gameType:'cricket',status:'active',startedAt:'2026-10-23T01:00:00Z',rules:r.cricketRules(),darts:[],...(players?{players:[{id:'p1',name:'あお'},{id:'p2',name:'りん'}],readyTurn:0}:{})};
    for(const segment of segments){const q=r.evaluateCricket(s);s.darts.push({id:'d'+s.darts.length,sessionId:s.id,...(players?{playerIndex:q.playerIndex}:{}),roundIndex:q.round,dartIndex:q.dart,timestamp:s.startedAt,segment,score:r.cricketPreview(s,segment).points,zone:null,inputSource:'manual',aim:'BULL'})}
    if(players)s.readyTurn=r.evaluateCricket(s).turnIndex;return s;
   };
   const ton=make(['T20','T20','T20']),q1=r.evaluateCricket(ton);
   check(q1.marks[0]['20']===3&&q1.points[0]===120&&q1.totals[0]===9&&q1.mpr[0]===9&&q1.round===2,'solo: closing marks then points');
   const none=make(['S14','MISS','D1']);check(r.evaluateCricket(none).totals[0]===0&&r.evaluateCricket(none).points[0]===0,'non-cricket numbers score nothing');
   const closed=make(['T20','T19','T18','T17','T16','T15','IB','OB']),q2=r.evaluateCricket(closed);
   check(q2.ended&&q2.reason==='closed'&&q2.round===3&&q2.mpr[0]===7.88,'solo: all closed ends the game');
   const solo15=make(Array(45).fill('S20'));check(r.evaluateCricket(solo15).ended&&r.evaluateCricket(solo15).reason==='round-limit','solo: 15 round limit');
   check(!r.evaluateCricket(make(Array(44).fill('MISS'))).ended,'solo: 44 darts still playing');
   const m1=make(['T20','T20','T20','T20','T20','MISS'],true),q3=r.evaluateCricket(m1);
   check(q3.points.join(',')==='120,0'&&q3.marks[1]['20']===3&&q3.totals[1]===3&&q3.playerIndex===0&&q3.round===2,'match: dead number scores no points or marks');
   const behind=make(['MISS','MISS','MISS','T20','T20','T20','T20','T19','T18','MISS','MISS','MISS','T17','T16','T15','MISS','MISS','MISS','IB','OB'],true),q4=r.evaluateCricket(behind);
   check(!q4.ended&&q4.points.join(',')==='0,120','match: closing all while behind does not win');
   const winning=make(['T20','T19','T18','MISS','MISS','MISS','T17','T16','T15','MISS','MISS','MISS','IB','OB'],true),q5=r.evaluateCricket(winning);
   check(q5.ended&&q5.winner===0&&q5.reason==='closed','match: closing all with equal points wins');
   const draw=make(Array(90).fill('MISS'),true);check(r.evaluateCricket(draw).ended&&r.evaluateCricket(draw).winner===null,'match: draw at round limit');
   const lead=make(Array(87).fill('MISS').concat(['T20','T20','T20']),true);check(r.evaluateCricket(lead).winner===1,'match: points decide the round limit');
   check(!r.evaluateCricket(make(Array(87).fill('MISS'),true)).ended,'match: P2 gets the final turn');
   const forged=structuredClone(ton);forged.darts[1].score=0;check(!r.evaluateCricket(forged).valid,'reject a wrong point value');
   const wrongTurn=structuredClone(m1);wrongTurn.darts[3].playerIndex=0;check(!r.evaluateCricket(wrongTurn).valid,'reject out of turn');
   for(const s of [closed,winning,draw]){s.status='completed';s.result=r.cricketResult(r.evaluateCricket(s));check(r.validCricketSession(s),'valid completed cricket')}
   const badResult=structuredClone(winning);badResult.result.winner=1;check(!r.validCricketSession(badResult),'reject false winner');
   check(r.gameName(winning)==='CRICKET · 2P'&&r.gameOutcome(winning)==='P1 WIN'&&r.gameOutcome(closed)==='ALL CLOSED'&&r.gameScore(closed)==='7.88','labels');
   const pending=structuredClone(m1);pending.readyTurn=0;check(r.awaitingPlayer(pending),'match handoff is pending until confirmed');
   return {winning,closed};
  }""")
  unit.close();print('PASS cricket engine: marks, points, dead numbers, closing win, round limit, validation',flush=True)
  for filename in ['index.html','preview.html']:
   for mobile in [False,True]:
    ctx=browser.new_context(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 800},is_mobile=mobile,has_touch=mobile)
    ctx.route('https://raw.githubusercontent.com/**/barrels.json',lambda r:r.fulfill(path=str(ROOT/'data/barrels.json'),content_type='application/json',headers={'Access-Control-Allow-Origin':'*'}))
    pg=ctx.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));pg.on('dialog',lambda d:d.accept())
    pg.goto(f'http://127.0.0.1:{server.server_port}/index.html' if filename=='index.html' else (ROOT/filename).as_uri());pg.evaluate("document.getElementById('startupFx').style.display='none'")
    # Solo: pick CRICKET from the GAME selector.
    pg.select_option('#gameSelect','cricket')
    assert state(pg)['active']['gameType']=='cricket' and pg.locator('#cricketBoard').is_visible()
    assert pg.locator('#cricketBoard .ck-row').count()==7 and pg.locator('#board .hit.cricket-off').count()==56
    assert pg.locator('#roundlabel').inner_text()=='ROUND 1 / 15'
    for seg in ['T20','T20','T20']:hit(pg,seg)
    assert pg.locator('#score').inner_text()=='120' and 'MPR 9.00' in pg.locator('#scoreCaption').inner_text()
    assert pg.locator('#throws .throw b').all_text_contents()==['T20','T20','T20'] and '3 MARK · +60' in pg.locator('#throws').inner_text()
    assert pg.locator('#cricketBoard .ck-row').first.locator('.ck-mark').get_attribute('aria-label')=='3 MARK'
    skip(pg)
    for seg in ['T19','T18','T17']:hit(pg,seg)
    skip(pg)
    for seg in ['T16','T15','IB']:hit(pg,seg)
    skip(pg);hit(pg,'OB')
    assert pg.locator('#resultpanel').is_visible() and 'ALL CLOSED' in pg.locator('#resultCaption').inner_text()
    pg.screenshot(path=str(ART/f'cricket-solo-{filename}-{mobile}.png'))
    click(pg,'saveResult');saved=state(pg)['sessions'][0]
    assert saved['status']=='completed' and saved['result']['reason']=='closed' and saved['result']['points']==[120]
    assert 'CRICKET' in pg.locator('#sessions').text_content() and 'MPR' in pg.locator('#sessions').text_content()
    # COUNT-UP analysis stays empty.
    assert pg.locator('#roundTotal').inner_text().startswith('記録 0R')
    with pg.expect_download() as info:click(pg,'exportcsv')
    assert ',cricket,' in pathlib.Path(info.value.path()).read_text(encoding='utf-8-sig')
    # 2 players: the setup sheet offers CRICKET and its rules.
    click(pg,'againFromHistory');click(pg,'matchSetup');pg.select_option('#matchStartScore','cricket')
    assert '15ラウンド' in pg.locator('#matchRules').inner_text()
    pg.locator('#matchForm').evaluate('f=>f.requestSubmit()')
    active=state(pg)['active'];assert active['gameType']=='cricket' and [x['name'] for x in active['players']]==['プレーヤー1','プレーヤー2']
    for seg in ['T20','T20','S20']:hit(pg,seg)
    assert pg.locator('#turnChange').is_visible() and pg.locator('#progress').inner_text()=='P1 · LAST TURN'
    assert pg.locator('.match-player strong').all_text_contents()==['80','0']
    hit(pg,'T19');assert len(state(pg)['active']['darts'])==3
    pg.screenshot(path=str(ART/f'cricket-match-{filename}-{mobile}.png'))
    # After the handoff, P1's last-turn marks stay lit for P2 to see.
    click(pg,'confirmTurn');assert pg.locator('#cricketBoard .ck-row').first.locator('.ck-mark.p1.recent i').inner_text()=='+7'
    assert 'own-p1' in pg.locator('#cricketBoard .ck-row').first.get_attribute('class') and pg.locator('.ck-head .p2.current').count()==1
    hit(pg,'T20');hit(pg,'T20')
    assert pg.locator('.match-player strong').all_text_contents()==['80','0'] and pg.locator('#cricketBoard .ck-row.dead').count()==1
    click(pg,'undo');click(pg,'undo');assert len(state(pg)['active']['darts'])==3 and pg.locator('#turnChange').is_hidden()
    # A saved winning match replays to the same winner and goes to history.
    load(pg,dict(fixtures['winning'],status='active',result=None))
    assert 'あお WIN' in pg.locator('#resultCaption').inner_text()
    click(pg,'saveResult');assert state(pg)['sessions'][0]['result']['winner']==0 and 'P1 WIN' in pg.locator('#sessions').text_content()
    # Back to 01 keeps the existing behaviour.
    click(pg,'againFromHistory');pg.select_option('#gameSelect','501')
    assert state(pg)['active']['gameType']=='zero-one' and pg.locator('#cricketBoard').is_hidden() and pg.locator('#board .hit.cricket-off').count()==0
    assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert not errors,errors
    ctx.close();print(f'PASS {filename} mobile={mobile}: solo cricket, all closed, history, 2P handoff, dead number, undo, win',flush=True)
  browser.close()
finally:server.shutdown();server.server_close()
print('ALL PASS')
