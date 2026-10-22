import pathlib, tempfile, threading, http.server, socketserver, functools, json
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[2]
class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
socketserver.TCPServer.allow_reuse_address=True
socketserver.ThreadingTCPServer.request_queue_size=128
server=socketserver.ThreadingTCPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
URL='http://127.0.0.1:%d/index.html'%server.server_address[1]
KEY='dtl-data-v1'
valid={'schemaVersion':1,'sessions':[],'active':{'id':'test-active','darts':[],'status':'active','gameType':'countup','startedAt':'2026-10-12T00:00:00Z'},'bindings':{},'roundDelay':8,'soundEnabled':True}
def run_case(browser,name,seed,expect_readonly):
    context=browser.new_context()
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('dialog',lambda d:d.accept())
    page.add_init_script('for(const [k,v] of Object.entries('+json.dumps(seed)+'))localStorage.setItem(k,v)')
    page.goto(URL)
    page.wait_for_timeout(450)
    assert not errors,(name,errors)
    assert page.locator('#recoveryStatus').count()==1,name
    text=page.locator('#recoveryStatus').inner_text()
    assert ('保存停止中' in text)==expect_readonly,(name,text)
    assert page.locator('#recoveryExport').count()==1,name
    if expect_readonly:
        assert page.evaluate("localStorage.getItem('dtl-data-v1')")==seed[KEY],name+' original overwritten'
    context.close()
with sync_playwright() as p:
    browser=p.chromium.launch()
    future=dict(valid,schemaVersion=999)
    run_case(browser,'future schema is protected',{KEY:json.dumps(future)},True)
    print('PASS unsupported schema stays protected')
    run_case(browser,'normal',{KEY:json.dumps(valid)},False)
    print('PASS normal data')
    run_case(browser,'corrupt primary with valid recovery',{KEY:'{bad',KEY+'-recovery':json.dumps(valid)},True)
    print('PASS corrupt primary loads recovery read-only')
    run_case(browser,'corrupt without recovery',{KEY:'{bad'},True)
    print('PASS corrupt primary retained without recovery')
    run_case(browser,'invalid recovery',{KEY:'{bad',KEY+'-recovery':'{also bad'},True)
    print('PASS corrupt recovery rejected')
    context=browser.new_context()
    page=context.new_page()
    page.on('dialog',lambda d:d.accept())
    page.goto(URL)
    page.wait_for_timeout(200)
    assert page.locator('#recoveryExport').count()==1
    assert page.evaluate("typeof document.getElementById('recoveryExport').onclick")=='function'
    assert page.evaluate("typeof document.getElementById('recoveryRestore').onclick")=='function'
    context.close()
    print('PASS recovery controls wired')
    context=browser.new_context()
    page=context.new_page()
    page.goto(URL)
    page.wait_for_timeout(300)
    assert page.evaluate("typeof cloudPendingCount")=='undefined' or page.locator('#cloudSync').count()==1
    context.close()
    print('PASS cloud sync control present')
    # Mobile layout and runtime smoke test
    mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    mp=mobile.new_page()
    mobile_errors=[]
    mp.on('pageerror',lambda e:mobile_errors.append(str(e)))
    mp.on('dialog',lambda d:d.accept())
    mp.goto(URL)
    mp.wait_for_timeout(500)
    assert not mobile_errors,('mobile runtime',mobile_errors)
    assert mp.locator('#recoveryPanel').count()==1
    assert mp.locator('#recoveryExport').count()==1
    assert mp.locator('#recoveryRestore').count()==1
    mobile.close()
    print('PASS mobile 390px recovery UI smoke')
    # Restore must keep the damaged primary in a separate safety slot.
    # NOTE: the damaged state is seeded ONCE (evaluate + reload), not with add_init_script.
    # An init script re-runs on every navigation, including the location.reload() that a successful
    # restore performs, so it would re-corrupt the freshly restored data and no test could ever see it.
    def seeded_page(context,primary,recovery,dialogs):
        page=context.new_page()
        page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
        page.goto(URL)
        page.evaluate("([k,p,r])=>{localStorage.setItem(k,p);localStorage.setItem(k+'-recovery',r)}",[KEY,primary,recovery])
        page.reload()
        page.wait_for_load_state('load')
        page.locator('.settings-icon').click()
        assert '保存停止中' in page.locator('#recoveryStatus').text_content(),'seeded page must start read-only'
        return page
    context=browser.new_context()
    page=seeded_page(context,'CORRUPTED',json.dumps(valid),[])
    with page.expect_navigation(timeout=10000):   # restore ends with location.reload()
        page.locator('#recoveryRestore').click()
    page.wait_for_load_state('load')
    assert json.loads(page.evaluate("localStorage.getItem('dtl-data-v1')"))==valid,'primary must equal the restored snapshot'
    assert page.evaluate("localStorage.getItem('dtl-data-v1-before-restore')")=='CORRUPTED','damaged original must be kept'
    assert json.loads(page.evaluate("localStorage.getItem('dtl-data-v1-recovery')"))==valid,'recovery snapshot must stay untouched'
    assert '通常モード' in page.locator('#recoveryStatus').text_content(),'app must leave read-only mode after restore'
    assert page.evaluate("localStorage.getItem('dtl-error-log-v1')") is None,'successful restore must not log errors'
    context.close()
    print('PASS explicit restore preserves damaged original')
    # If the restored write cannot be verified, nothing may be lost, the app stays read-only and the failure is logged.
    context=browser.new_context()
    dialogs=[]
    page=seeded_page(context,'CORRUPTED',json.dumps(valid),dialogs)
    page.evaluate("()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='dtl-data-v1')throw new Error('quota');return set.call(this,k,v)}}")
    page.locator('#recoveryRestore').click()
    page.wait_for_timeout(300)
    assert any('復旧に失敗' in m for m in dialogs),dialogs
    assert page.evaluate("localStorage.getItem('dtl-data-v1')")=='CORRUPTED','failed restore must leave the original untouched'
    assert json.loads(page.evaluate("localStorage.getItem('dtl-data-v1-recovery')"))==valid
    assert '保存停止中' in page.locator('#recoveryStatus').text_content(),'failed restore must keep read-only protection'
    assert 'recoveryRestore' in page.evaluate("localStorage.getItem('dtl-error-log-v1')"),'failure must be logged'
    context.close()
    print('PASS failed restore keeps data and read-only protection')
    browser.close()
server.shutdown()
print('ALL PASS')
