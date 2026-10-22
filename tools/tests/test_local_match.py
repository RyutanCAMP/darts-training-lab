"""Two-player local 01: player names, turn boundaries, replay and data isolation."""
import functools, http.server, json, pathlib, threading
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
def key(pg,code,value):pg.evaluate("([code,key])=>document.dispatchEvent(new KeyboardEvent('keydown',{code,key,bubbles:true}))",[code,value])
def load(pg,active,sessions=None):
 pg.evaluate("([active,sessions])=>localStorage.setItem('dtl-data-v1',JSON.stringify({schemaVersion:1,active,sessions,bindings:{},soundEnabled:false}))",[active,sessions or []]);pg.reload();pg.evaluate("document.getElementById('startupFx').style.display='none'")
FAKE="""(()=>{const st={sessions:{},meta:null},cbs=[];window.__remote=st;window.__setUser=u=>cbs.forEach(cb=>cb(u));window.__DTL_CLOUD_FAKE={onUser(cb){cbs.push(cb);return()=>{}},login(){window.__setUser({uid:'u',name:'Tester'})},async listSessions(){return Object.values(st.sessions).map(JSON.parse)},async putSession(u,s){st.sessions[s.id]=JSON.stringify(s)},async getMeta(){return st.meta},async putMeta(u,m){st.meta=m}}})()"""
try:
 with sync_playwright() as p:
  browser=p.chromium.launch();unit=browser.new_page()
  unit.add_script_tag(content=(ROOT/'game/zero-one.js').read_text(encoding='utf-8'))
  fixtures=unit.evaluate("""()=>{
   const r={points:s=>s==='IB'||s==='OB'?50:s==='MISS'?0:Number(s.slice(1))*({S:1,D:2,T:3}[s[0]]||0)};RETRO_DARTS_MODULES.connectZeroOne(r);
   const check=(v,n)=>{if(!v)throw Error(n)};
   const make=segments=>{
    const s={id:'match',schemaVersion:1,gameType:'zero-one',status:'active',startedAt:'2026-10-22T01:00:00Z',players:[{id:'p1',name:'あお'},{id:'p2',name:'りん'}],rules:{startScore:301,inRule:'straight',outRule:'open',bullMode:'fat',maxRounds:20},readyTurn:0,darts:[]};
    for(const segment of segments){const q=r.evaluateZero(s);s.darts.push({id:'d'+s.darts.length,sessionId:s.id,playerIndex:q.playerIndex,roundIndex:q.round,dartIndex:q.dart,timestamp:s.startedAt,segment,score:r.points(segment),zone:null,inputSource:'manual',aim:'BULL'})}
    s.readyTurn=r.evaluateZero(s).turnIndex;return s;
   };
   const start=make([]);check(r.isMatch(start)&&r.evaluateZero(start).playerIndex===0,'P1 starts');
   const turn=make(['T20','T20','T20']);check(r.evaluateZero(turn).scores.join(',')==='121,301'&&r.evaluateZero(turn).playerIndex===1&&r.evaluateZero(turn).round===1,'P2 same round');
   const p1=make(['T20','T20','T20','S20','S20','S20','T20','T20','S1']);check(r.evaluateZero(p1).winner===0&&r.evaluateZero(p1).scores.join(',')==='0,241','P1 win');
   const p2=make(['MISS','MISS','MISS','T20','T20','T20','MISS','MISS','MISS','T20','T20','S1']);check(r.evaluateZero(p2).winner===1,'P2 win');
   const bust=make(['T20','T20','T20','MISS','MISS','MISS','T20','T20','S2']);check(r.evaluateZero(bust).scores.join(',')==='121,301'&&r.evaluateZero(bust).playerIndex===1,'bust affects P1 only');
   const undone=structuredClone(bust);undone.darts.pop();check(r.evaluateZero(undone).playerIndex===0&&r.evaluateZero(undone).dart===3&&r.evaluateZero(undone).remaining===1,'undo bust restores player');
   const short=make(['T20','T20','T20','MISS','MISS','MISS','T17','OB','MISS','MISS','MISS','MISS','T20']);check(r.evaluateZero(short).playerIndex===1&&r.evaluateZero(short).round===3&&r.evaluateZero(short).scores[0]===20,'first dart bust skips correctly');
   const limit=make(Array(120).fill('MISS'));check(r.evaluateZero(limit).ended&&r.evaluateZero(limit).winner===null&&r.evaluateZero(limit).round===20,'draw at 120 darts');
   const beforeLimit=make(Array(117).fill('MISS'));check(!r.evaluateZero(beforeLimit).ended&&r.evaluateZero(beforeLimit).playerIndex===1,'P2 gets final turn');
   for(const s of [p1,p2,limit]){s.status='completed';const q=r.evaluateZero(s);s.result={reason:q.reason,remaining:q.remaining,winner:q.winner,scores:q.scores};check(r.validZeroSession(s),'valid completed match')}
   const wrong=structuredClone(p1);wrong.darts[3].playerIndex=0;check(!r.validZeroSession(wrong),'reject out of turn');
   const badWinner=structuredClone(p2);badWinner.result.winner=0;check(!r.validZeroSession(badWinner),'reject false winner');
   const badName=structuredClone(p1);badName.players[1].name=' ';check(!r.validZeroSession(badName),'reject blank name');
   const bound=structuredClone(p1);bound.players[0].account={provider:'google',uid:'u'};check(r.validZeroSession(bound),'accept account identity');
   bound.players[1].account={provider:'google',uid:'u'};check(!r.validZeroSession(bound),'reject account on both players');
   const badAccount=structuredClone(p1);badAccount.players[0].account={provider:'google',uid:''};check(!r.validZeroSession(badAccount),'reject empty account id');
   const extra=structuredClone(p1);extra.darts.push({...extra.darts.at(-1),id:'extra'});check(!r.validZeroSession(extra),'reject throw after win');
   const pending=structuredClone(turn);pending.readyTurn=0;check(r.awaitingPlayer(pending),'pending turn derives from saved acknowledgement');
   const solo={...p1,id:'solo',players:undefined,darts:p1.darts.filter(d=>d.playerIndex===0).map(d=>{const x={...d};delete x.playerIndex;return x}),result:undefined};check(r.validZeroSession(solo),'solo stays valid');
   return {start,turn,p1,p2,bust,short,limit,beforeLimit,pending,solo};
  }""")
  unit.close();print('PASS local match engine: players, rounds, bust/undo, both winners, final turn, validation',flush=True)
  for filename in ['index.html','preview.html']:
   for mobile in [False,True]:
    ctx=browser.new_context(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 900},is_mobile=mobile,has_touch=mobile)
    ctx.route('https://raw.githubusercontent.com/**/barrels.json',lambda r:r.fulfill(path=str(ROOT/'data/barrels.json'),content_type='application/json',headers={'Access-Control-Allow-Origin':'*'}))
    pg=ctx.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)));pg.on('dialog',lambda d:d.accept());pg.add_init_script(FAKE)
    pg.goto(f'http://127.0.0.1:{server.server_port}/index.html' if filename=='index.html' else (ROOT/filename).as_uri());pg.evaluate("document.getElementById('startupFx').style.display='none'")
    if filename=='preview.html':ctx.set_offline(True)
    click(pg,'matchSetup');assert pg.locator('#matchSheet').is_visible()
    pg.screenshot(path=str(ART/f'match-names-{filename}-{mobile}.png'),full_page=True)
    assert pg.input_value('#playerOneName')=='プレーヤー1' and pg.input_value('#playerTwoName')=='プレーヤー2'
    pg.fill('#playerOneName','');pg.locator('#matchForm').evaluate('f=>f.requestSubmit()');assert pg.locator('#matchSheet').is_visible() and state(pg) is None
    pg.fill('#playerOneName',' あお ');pg.fill('#playerTwoName','りん');pg.select_option('#matchStartScore','301');pg.locator('#matchForm').evaluate('f=>f.requestSubmit()')
    assert state(pg)['active']['players'][0]['name']=='あお' and pg.locator('#matchSheet').is_hidden()
    assert 'あお' in pg.locator('.match-player.current').inner_text()
    for _ in range(3):hit(pg,'T20')
    assert pg.locator('#turnChange').is_visible() and 'りん' in pg.locator('#nextPlayerName').inner_text()
    hit(pg,'IB');assert len(state(pg)['active']['darts'])==3
    pg.reload();pg.evaluate("document.getElementById('startupFx').style.display='none'");assert pg.locator('#turnChange').is_visible()
    key(pg,'KeyA','A');assert len(state(pg)['active']['darts'])==3
    pg.screenshot(path=str(ART/f'match-switch-{filename}-{mobile}.png'),full_page=True)
    key(pg,'Enter','Enter');assert pg.locator('#turnChange').is_hidden()
    for _ in range(3):hit(pg,'S20')
    click(pg,'confirmTurn');hit(pg,'T20');hit(pg,'T20');hit(pg,'S2')
    assert pg.locator('#turnChange').is_visible()
    assert pg.locator('.match-player strong').all_text_contents()==['121','241']
    click(pg,'undo');assert pg.locator('#turnChange').is_hidden() and pg.locator('#score').inner_text()=='1'
    hit(pg,'S1');assert 'あお WIN' in pg.locator('#resultCaption').inner_text()
    hit(pg,'IB');assert len(state(pg)['active']['darts'])==9
    click(pg,'undo');hit(pg,'S1');click(pg,'saveResult')
    saved=state(pg)['sessions'][0];assert saved['result']['winner']==0 and saved['result']['scores']==[0,241]
    assert 'あお' in pg.locator('#sessiondetail').inner_text() and 'りん' in pg.locator('#sessiondetail').inner_text()
    assert pg.locator('#sessiondetail tbody tr').count()==9
    assert 'P2' in pg.locator('#sessiondetail tbody').inner_text()
    with pg.expect_download() as info:click(pg,'exportjson')
    payload=pathlib.Path(info.value.path()).read_bytes()
    with pg.expect_download() as info:click(pg,'exportcsv')
    csv=pathlib.Path(info.value.path()).read_text(encoding='utf-8-sig');assert ',1,あお' in csv and ',2,りん' in csv
    # Local matches never enter the existing COUNT-UP analysis or cloud.
    assert pg.locator('#roundTotal').inner_text().startswith('記録 0R')
    click(pg,'againFromHistory');click(pg,'authChip');click(pg,'cloudLogin');pg.wait_for_timeout(200)
    assert pg.evaluate('Object.keys(window.__remote.sessions).length')==0
    # Backup round trip, P2 win, last-round draw, and safe switch back to solo.
    load(pg,None)
    pg.locator('#importjson').set_input_files({'name':'match.json','mimeType':'application/json','buffer':payload})
    assert state(pg)['sessions'][0]['players']==saved['players']
    load(pg,dict(fixtures['p2'],status='active'));assert 'りん WIN' in pg.locator('#resultCaption').inner_text()
    load(pg,fixtures['beforeLimit']);hit(pg,'MISS');hit(pg,'MISS');hit(pg,'MISS')
    assert 'DRAW' in pg.locator('#resultCaption').inner_text();click(pg,'saveResult');assert state(pg)['sessions'][0]['result']['winner'] is None
    click(pg,'againFromHistory');click(pg,'soloMode');assert 'players' not in state(pg)['active'] and pg.locator('#matchPlayers').is_hidden()
    # Malicious-looking display names stay text and CSV quoting retains commas.
    unusual=dict(fixtures['start']);unusual['players']=[{'id':'p1','name':'<img src=x>'},{'id':'p2','name':'A,"B"'}]
    load(pg,unusual);assert pg.locator('#matchPlayers img').count()==0 and '<img src=x>' in pg.locator('#matchPlayers').inner_text()
    assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth')
    # Failed handoff acknowledgement and result save keep the current match intact.
    load(pg,fixtures['pending'])
    pg.evaluate("(()=>{const original=Storage.prototype.setItem;window.__restore=()=>{Storage.prototype.setItem=original};Storage.prototype.setItem=function(k,v){if(k==='dtl-data-v1')throw Error('quota');return original.call(this,k,v)}})()")
    click(pg,'confirmTurn');assert pg.locator('#turnChange').is_visible()
    pg.evaluate('window.__restore()');click(pg,'confirmTurn');assert pg.locator('#turnChange').is_hidden()
    # Default guests need no typing. Account selection can be assigned to either slot.
    load(pg,None);click(pg,'matchSetup');pg.locator('#matchForm').evaluate('f=>f.requestSubmit()')
    assert [p['name'] for p in state(pg)['active']['players']]==['プレーヤー1','プレーヤー2']
    assert all('account' not in p for p in state(pg)['active']['players'])
    click(pg,'authChip');click(pg,'cloudLogin');click(pg,'matchSetup')
    pg.select_option('#playerOneIdentity','current')
    assert pg.input_value('#playerOneName')=='Tester' and pg.locator('#playerOneName').get_attribute('readonly') is not None
    pg.select_option('#playerTwoIdentity','current')
    assert pg.input_value('#playerOneName')=='プレーヤー1' and pg.input_value('#playerTwoName')=='Tester'
    assert pg.input_value('#playerOneIdentity')=='guest'
    pg.screenshot(path=str(ART/f'match-account-{filename}-{mobile}.png'),full_page=True)
    pg.locator('#matchForm').evaluate('f=>f.requestSubmit()')
    assert state(pg)['active']['players'][1]['account']=={'provider':'google','uid':'u'}
    hit(pg,'S1');click(pg,'newgame')
    assert state(pg)['active']['players'][1]['account']['uid']=='u' and state(pg)['sessions'][0]['players'][1]['account']['uid']=='u'
    account_saved=state(pg)['sessions'][0]
    click(pg,'matchSetup');pg.select_option('#playerOneIdentity','current')
    pg.evaluate('window.__setUser(null)')
    assert pg.input_value('#playerOneIdentity')=='guest' and pg.input_value('#playerOneName')=='プレーヤー1'
    assert pg.locator('#playerOneIdentity option').count()==1
    assert state(pg)['sessions'][0]==account_saved
    pg.evaluate("window.__setUser({uid:'u',name:'Tester'})")
    pg.select_option('#playerOneIdentity','current')
    pg.evaluate("window.__setUser({uid:'new-user',name:'新アカウント'})")
    assert pg.input_value('#playerOneIdentity')=='guest' and pg.input_value('#playerOneName')=='プレーヤー1'
    assert state(pg)['active']['players'][1]['account']['uid']=='u'
    assert not errors,errors
    ctx.close();print(f'PASS {filename} mobile={mobile}: names-first, handoff, undo, reload, winners, draw, history, backup, offline isolation',flush=True)
  browser.close()
finally:server.shutdown();server.server_close()
print('ALL PASS')
