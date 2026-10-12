import pathlib, tempfile, threading, http.server, socketserver, functools, json
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[2]
class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
socketserver.TCPServer.allow_reuse_address=True
server=socketserver.TCPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
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
    run_case(browser,'normal',{KEY:json.dumps(valid)},False)
    print('PASS normal data')
    run_case(browser,'corrupt primary with valid recovery',{KEY:'{bad',KEY+'-recovery':json.dumps(valid)},True)
    print('PASS corrupt primary loads recovery read-only')
    run_case(browser,'corrupt without recovery',{KEY:'{bad'},True)
    print('PASS corrupt primary retained without recovery')
    run_case(browser,'invalid recovery',{KEY:'{bad',KEY+'-recovery':'{also bad'},True)
    print('PASS corrupt recovery rejected')
    browser.close()
server.shutdown()
print('ALL PASS')
