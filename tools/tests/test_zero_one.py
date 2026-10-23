"""01 rules and browser workflows; synthetic 200S and in-memory cloud only."""
import functools, http.server, json, pathlib, threading
from playwright.sync_api import sync_playwright

ROOT=pathlib.Path(__file__).resolve().parents[2]
ART=ROOT/'.test-artifacts'; ART.mkdir(exist_ok=True)
class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
class Server(http.server.ThreadingHTTPServer):
    request_queue_size=128
server=Server(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
KEY='dtl-data-v1'
def state(pg): return pg.evaluate("JSON.parse(localStorage.getItem('dtl-data-v1'))")
def click_id(pg,id): pg.locator('#'+id).evaluate('e=>e.click()')
def hit(pg,seg):
    if seg=='MISS': click_id(pg,'miss'); return
    if seg.startswith('S'): seg+='O'
    pg.locator('#board .hit[data-segment="'+seg+'"]').dispatch_event('click')
def key(pg,code,value): pg.evaluate("([code,key])=>document.dispatchEvent(new KeyboardEvent('keydown',{code,key,bubbles:true}))",[code,value])
def hide_fx(pg): pg.evaluate("document.getElementById('startupFx').style.display='none'")
def load(pg,active,sessions=None):
    pg.evaluate("([active,sessions])=>localStorage.setItem('dtl-data-v1',JSON.stringify({schemaVersion:1,active,sessions,bindings:{},soundEnabled:false}))",[active,sessions or []])
    pg.reload();hide_fx(pg)
def backup(pg):
    with pg.expect_download() as info: click_id(pg,'exportjson')
    return pathlib.Path(info.value.path()).read_bytes()
FAKE="""(()=>{const st={sessions:{},meta:null},cbs=[];window.__remote=st;
window.__DTL_CLOUD_FAKE={onUser(cb){cbs.push(cb);return()=>{}},login(){cbs.forEach(cb=>cb({uid:'u1',name:'Tester'}))},logout(){cbs.forEach(cb=>cb(null))},
async listSessions(){return Object.values(st.sessions).map(JSON.parse)},async putSession(u,s){st.sessions[s.id]=JSON.stringify(s)},async deleteSession(u,id){delete st.sessions[id]},async getMeta(){return st.meta},async putMeta(u,m){st.meta=m}}})()"""

try:
 with sync_playwright() as p:
    browser=p.chromium.launch()
    unit=browser.new_page()
    unit.add_script_tag(content=(ROOT/'game/zero-one.js').read_text(encoding='utf-8'))
    fixtures=unit.evaluate("""()=>{
      const r={points:s=>s==='IB'||s==='OB'?50:s==='MISS'?0:Number(s.slice(1))*({S:1,D:2,T:3}[s[0]]||0)};
      RETRO_DARTS_MODULES.connectZeroOne(r);
      const check=(ok,name)=>{if(!ok)throw Error(name)};
      const targetScore=s=>s==='BULL'?50:r.points(s);
      const reachable=[new Set([0])],scores=Array.from(new Set(['S','D','T'].flatMap((ring,i)=>Array.from({length:20},(_,j)=>(j+1)*(i+1))).concat([50])));
      for(let n=1;n<=3;n++)reachable.push(new Set([...reachable[n-1]].flatMap(v=>scores.map(s=>v+s))));
      for(let left=1;left<=180;left++)for(let available=1;available<=3;available++){
        const routes=r.checkoutRoutes(left,available),shortest=[1,2,3].find(n=>n<=available&&reachable[n].has(left));
        check(Boolean(routes.length)===Boolean(shortest),'route existence '+left+'/'+available);
        for(const route of routes)check(route.length===shortest&&route.reduce((sum,s)=>sum+targetScore(s),0)===left,'route total/length');
        check(new Set(routes.map(x=>x.join(','))).size===routes.length,'unique routes');
      }
      check(JSON.stringify(r.checkoutRoutes(20,1))===JSON.stringify([['S20'],['D10']]),'20 singles/double choices');
      check(r.checkoutRoutes(50,1)[0][0]==='BULL'&&!r.checkoutRoutes(25,1).length,'50-point bull');
      check(r.checkoutRoutes(61,2)[0].join(',')==='BULL,S11','61 route');
      check(r.checkoutRoutes(180,3)[0].join(',')==='T20,T20,T20','180 route');
      check(!r.checkoutRoutes(181,3).length&&!r.checkoutRoutes(0,3).length&&!r.checkoutRoutes(20,0).length,'out of range');
      const make=(segments,start=301)=>{
        const s={id:'z'+start,schemaVersion:1,gameType:'zero-one',startedAt:'2026-10-22T01:00:00Z',endedAt:null,status:'active',rules:{startScore:start,inRule:'straight',outRule:'open',bullMode:'fat',maxRounds:20},darts:[]};
        for(const segment of segments){const q=r.evaluateZero(s);s.darts.push({id:'d'+s.darts.length,sessionId:s.id,roundIndex:q.round,dartIndex:q.dart,timestamp:s.startedAt,segment,zone:null,score:r.points(segment),inputSource:'manual',aim:'BULL'})}return s;
      };
      for(const n of [301,501,701])check(r.evaluateZero(make([],n)).remaining===n,'start '+n);
      const clear=make(['T20','T20','T20','T20','T20','S1']);
      check(r.evaluateZero(clear).ended&&r.evaluateZero(clear).reason==='checkout'&&r.evaluateZero(clear).round===2,'checkout');
      const bust=make(['T20','T20','T20','T20','T19','S5']);
      check(r.evaluateZero(bust).remaining===121&&r.evaluateZero(bust).round===3,'third dart bust');
      const undo=structuredClone(bust);undo.darts.pop();check(r.evaluateZero(undo).remaining===4&&r.evaluateZero(undo).dart===3,'undo bust');
      const firstBust=make(['T20','T20','T20','T20','D20','S1','T20']);
      check(r.evaluateZero(firstBust).remaining===20&&r.evaluateZero(firstBust).round===4&&r.evaluateZero(firstBust).dart===1,'first dart bust');
      const short=make(['T20','T20','T20','T20','D20','S1','T20','S19','S1']);
      check(r.evaluateZero(short).ended&&short.darts.at(-2).roundIndex===4,'open out one + skipped darts');
      const limit=make(Array(60).fill('MISS'));check(r.evaluateZero(limit).reason==='round-limit','round limit');
      const last=make(['T20','T20','T20','T20','T20',...Array(54).fill('MISS'),'S1']);check(r.evaluateZero(last).reason==='checkout','checkout at limit');
      const finalBust=make(['T20','T20','T20','T20','T20',...Array(52).fill('MISS'),'S2']);check(r.evaluateZero(finalBust).reason==='round-limit'&&r.evaluateZero(finalBust).remaining===1,'bust at limit');
      for(const s of [clear,short,limit,last,finalBust]){s.status='completed';check(r.validZeroSession(s),'valid completion')}
      const bad=structuredClone(clear);bad.darts.push({...bad.darts[0],roundIndex:3});check(!r.validZeroSession(bad),'reject extra dart');
      const badRound=structuredClone(short);badRound.darts.at(-1).roundIndex=3;check(!r.validZeroSession(badRound),'reject bad round');
      const badScore=structuredClone(clear);badScore.darts[0].score=50;check(!r.validZeroSession(badScore),'reject bad score');
      const fakeComplete=structuredClone(undo);fakeComplete.status='completed';check(!r.validZeroSession(fakeComplete),'reject false completed');
      const badRules=structuredClone(clear);badRules.rules.outRule='double';check(!r.validZeroSession(badRules),'reject unsupported rules');
      const fakeResult=structuredClone(clear);fakeResult.result={reason:'round-limit',remaining:5};check(!r.validZeroSession(fakeResult),'reject false result');
      const limitBefore=structuredClone(limit);limitBefore.status='active';limitBefore.darts.pop();
      const countup={...clear,id:'countup-old',gameType:'countup',darts:Array.from({length:24},(_,i)=>({id:'cu'+i,sessionId:'countup-old',roundIndex:Math.floor(i/3)+1,dartIndex:i%3+1,timestamp:clear.startedAt,segment:'S20',score:20,aim:'BULL'}))};delete countup.rules;
      const guide20=make(['T20','T20','T20','T17','OB']);
      const guide61=make(['T20','T20','T20','T20']);
      return {clear,bust,undo,short,limit,limitBefore,last,finalBust,countup,guide20,guide61};
    }""")
    unit.close();print('PASS 01 engine: scoring, open out, short rounds, bust, undo, limit, validation',flush=True)
    for filename in ['index.html','preview.html']:
      for mobile in [False,True]:
        context=browser.new_context(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 900},is_mobile=mobile,has_touch=mobile)
        context.route('https://raw.githubusercontent.com/**/barrels.json',lambda r:r.fulfill(path=str(ROOT/'data/barrels.json'),content_type='application/json',headers={'Access-Control-Allow-Origin':'*'}))
        pg=context.new_page();errors=[];dialogs=[]
        pg.on('pageerror',lambda e:errors.append(str(e)))
        pg.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
        pg.add_init_script(FAKE)
        url=f'http://127.0.0.1:{server.server_port}/index.html' if filename=='index.html' else (ROOT/filename).as_uri()
        pg.goto(url);hide_fx(pg)
        assert pg.locator('#appVersion').inner_text()=='v0.9.0-beta.1'
        pg.select_option('#gameSelect','501');assert pg.locator('#score').inner_text()=='501'
        pg.locator('#board').scroll_into_view_if_needed()
        box=pg.locator('#board svg').bounding_box()
        x,y=box['x']+box['width']/2,box['y']+box['height']/2
        if mobile:pg.touchscreen.tap(x,y)
        else:pg.mouse.click(x,y)
        assert pg.locator('#score').inner_text()=='451'
        click_id(pg,'undo')
        hit(pg,'OB');assert pg.locator('#score').inner_text()=='451'
        key(pg,'Tab','Tab');assert len(state(pg)['active']['darts'])==1
        click_id(pg,'undo');pg.select_option('#gameSelect','701');assert pg.locator('#score').inner_text()=='701'
        pg.select_option('#gameSelect','301')
        for _ in range(3):hit(pg,'T20')
        assert pg.locator('#score').inner_text()=='121'
        hit(pg,'S1');assert len(state(pg)['active']['darts'])==3
        key(pg,'Enter','Enter');hit(pg,'T20');hit(pg,'T20');hit(pg,'S2')
        assert pg.locator('#score').inner_text()=='121' and 'BUST' in pg.locator('#roundBreakLabel').inner_text()
        key(pg,'Enter','Enter');hit(pg,'T20');assert state(pg)['active']['darts'][-1]['roundIndex']==3
        click_id(pg,'undo');click_id(pg,'undo')
        assert pg.locator('#score').inner_text()=='1'
        pg.reload();hide_fx(pg);assert pg.locator('#score').inner_text()=='1'
        # Physical-board key simulation: S1 outer is KeyQ / Q.
        key(pg,'KeyQ','Q');assert pg.locator('#score').inner_text()=='0'
        assert state(pg)['active']['darts'][-1]['inputSource']=='board'
        hit(pg,'IB');assert len(state(pg)['active']['darts'])==6
        click_id(pg,'undo');assert pg.locator('#score').inner_text()=='1'
        hit(pg,'S1');assert pg.locator('#resultpanel').is_visible()
        pg.screenshot(path=str(ART/f'zero-one-{filename}-{mobile}.png'),full_page=True)
        if mobile:assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth')
        pg.reload();hide_fx(pg);assert pg.locator('#resultpanel').is_visible()
        key(pg,'Tab','Tab');assert state(pg)['sessions'][0]['result']['reason']=='checkout'
        assert '301 / 01' in pg.locator('#sessiondetail').inner_text()
        assert 'REMAINING' in pg.locator('#sessiondetail').inner_text()
        saved=state(pg)['sessions'][0]
        payload=backup(pg)
        with pg.expect_download() as csv_info:click_id(pg,'exportcsv')
        csv=pathlib.Path(csv_info.value.path()).read_text(encoding='utf-8-sig')
        assert csv.splitlines()[0].endswith('game_type,start_score,player_index,player_name') and ',zero-one,301' in csv
        # Restore mixed games without changing the existing COUNT-UP analytics.
        load(pg,None,[fixtures['countup']])
        before=pg.locator('#metrics').inner_text()
        pg.locator('#importjson').set_input_files({'name':'01.json','mimeType':'application/json','buffer':payload})
        assert len(state(pg)['sessions'])==2
        assert pg.locator('#metrics').inner_text()==before
        assert pg.locator('#roundTotal').inner_text().startswith('記録 8R')
        click_id(pg,'authChip');click_id(pg,'cloudLogin')
        pg.wait_for_function('Object.keys(window.__remote.sessions).length===2')
        assert saved['id'] in pg.evaluate('Object.keys(window.__remote.sessions)')
        # Empty local history then pull both game types from the fake cloud.
        pg.evaluate("()=>{const v=JSON.parse(localStorage.getItem('dtl-data-v1'));v.sessions=[];localStorage.setItem('dtl-data-v1',JSON.stringify(v));}")
        # In-memory store is refreshed by reload, fake remote is re-seeded from saved values.
        remote=pg.evaluate('window.__remote');pg.reload();hide_fx(pg)
        bad_remote=dict(fixtures['clear'],id='invalid-01')
        bad_remote['darts']=[dict(d) for d in bad_remote['darts']];bad_remote['darts'][0]['score']=999
        remote['sessions']['invalid-01']=json.dumps(bad_remote)
        pg.evaluate('v=>Object.assign(window.__remote,v)',remote)
        click_id(pg,'authChip');click_id(pg,'cloudLogin')
        pg.wait_for_function("JSON.parse(localStorage.getItem('dtl-data-v1')).sessions.length===2")
        assert pg.locator('#metrics').inner_text()==before
        # Rejected import must leave records intact.
        malformed=json.loads(payload);malformed['sessions'][0]['darts'][0]['score']=999
        pg.locator('#importjson').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':json.dumps(malformed).encode()})
        assert len(state(pg)['sessions'])==2 and '復元できませんでした' in dialogs[-1]
        # Limit and replay/undo survive reload; no phantom darts.
        load(pg,fixtures['limitBefore'],[fixtures['countup']]);hit(pg,'MISS')
        assert 'ROUND LIMIT' in pg.locator('#resultCaption').inner_text()
        click_id(pg,'undo');assert len(state(pg)['active']['darts'])==59
        hit(pg,'MISS');click_id(pg,'saveResult');assert state(pg)['sessions'][0]['result']['reason']=='round-limit'
        # Early exit and switching keep the current game instead of discarding it.
        click_id(pg,'againFromHistory');hit(pg,'S20');pg.select_option('#gameSelect','countup')
        assert state(pg)['sessions'][0]['status']=='abandoned' and state(pg)['active']['gameType']=='countup'
        assert pg.locator('#checkoutGuide').is_hidden()
        # Checkout candidates follow remaining darts, undo, reload and terminal state.
        load(pg,fixtures['guide20'])
        assert pg.locator('#score').inner_text()=='20'
        assert pg.locator('.checkout-route').all_text_contents()==['S20','D10']
        assert '残り 1投' in pg.locator('#checkoutTitle').inner_text()
        pg.screenshot(path=str(ART/f'checkout-{filename}-{mobile}.png'),full_page=True)
        assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth')
        hit(pg,'S1');assert pg.locator('.checkout-route').first.inner_text()=='S19'
        assert '次ラウンド 3投' in pg.locator('#checkoutTitle').inner_text()
        click_id(pg,'undo');pg.reload();hide_fx(pg)
        assert pg.locator('.checkout-route').all_text_contents()==['S20','D10']
        hit(pg,'S20');assert pg.locator('#checkoutGuide').is_hidden()
        click_id(pg,'undo');assert pg.locator('#checkoutGuide').is_visible()
        load(pg,fixtures['guide61']);assert pg.locator('.checkout-route').first.inner_text()=='BULL + S11'
        hit(pg,'MISS');assert '残り1投で上がれる候補はありません' in pg.locator('#checkoutRoutes').inner_text()
        click_id(pg,'undo');assert pg.locator('.checkout-route').first.inner_text()=='BULL + S11'
        # A failed result commit keeps the completed active game and permits retry.
        active=dict(fixtures['clear'],status='active');load(pg,active)
        pg.evaluate("(()=>{const original=Storage.prototype.setItem;window.__restoreStorage=()=>{Storage.prototype.setItem=original};Storage.prototype.setItem=function(k,v){if(k==='dtl-data-v1')throw new Error('quota');return original.call(this,k,v)}})()")
        click_id(pg,'saveResult');assert pg.locator('#resultpanel').is_visible()
        assert not state(pg)['sessions'] and state(pg)['active']['id']==active['id']
        pg.evaluate('window.__restoreStorage()');click_id(pg,'saveResult');assert len(state(pg)['sessions'])==1
        assert not errors,errors
        context.close()
        print(f'PASS {filename} mobile={mobile}: UI, 200S, undo, reload, limit, history, backup, mixed analysis, cloud, failure recovery',flush=True)
    browser.close()
finally:
 server.shutdown();server.server_close()
print('ALL PASS')


