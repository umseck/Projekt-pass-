"""Actual Chromium interaction, downloaded bytes and offline package checks.
Run after npm test. Uses synthetic fixtures, never real accounts or mail sending.
Dependencies: Python playwright + Pillow; a Playwright-installed Chromium.
"""
import hashlib,http.server,json,threading,zipfile,functools,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'qa/bad/browser';OUT.mkdir(parents=True,exist_ok=True)
class QuietHandler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(ROOT/'public')))
threading.Thread(target=server.serve_forever,daemon=True).start()
base='http://127.0.0.1:'+str(server.server_port)
report={'engine':'Chromium','synthetic_data_only':True,'cases':[],'errors':[],'downloads':[],'offline':[]}
with sync_playwright() as p:
 launch={'headless':True}
 if os.environ.get('CHROMIUM_BIN'):launch['executable_path']=os.environ['CHROMIUM_BIN']
 browser=p.chromium.launch(**launch)
 for width in [360,390,1440]:
  for kind in ['seamless','tile','mixed']:
   page=browser.new_page(viewport={'width':width,'height':900},device_scale_factor=1)
   page.on('pageerror',lambda e:report['errors'].append(str(e)))
   page.goto(base+'/bad-preview.html');page.wait_for_selector('#bad-next')
   page.locator('[data-demo="'+kind+'"]').click();page.wait_for_timeout(500);page.wait_for_selector('[data-step="0"][aria-current="step"]')
   for step in range(4):
    page.locator('[data-step="'+str(step)+'"]').click();page.wait_for_selector('[data-step="'+str(step)+'"][aria-current="step"]')
    assert page.evaluate('document.documentElement.scrollWidth')<=width,'Horizontal scroll in editor'
    if step==2:
     field=page.locator('[data-usage] [data-field="spec.color"]').first
     field.fill('Browser-Testfarbton');field.focus();before=field.bounding_box();page.wait_for_timeout(1300)
     assert field.evaluate('(el)=>document.activeElement===el'),'Autosave moved input focus'
     after=field.bounding_box();assert abs(before['y']-after['y'])<2,'Autosave moved input position'
     assert field.input_value()=='Browser-Testfarbton'
     page.locator('[data-confirm-use]').first.click()
   page.locator('#bad-publish-consent').check();page.locator('#bad-next').click();page.wait_for_selector('[data-export="zip"]')
   assert 'Fassung 1' in page.locator('.bad-meta').inner_text()
   assert page.evaluate('document.documentElement.scrollWidth')<=width,'Horizontal scroll in customer dossier'
   if kind=='mixed':
    page.locator('.bad-customer details').evaluate_all('(xs)=>xs.forEach(x=>x.open=true)')
    assert 'Vorher: Foto fehlt.' in page.locator('.bad-customer').inner_text()
   assert 'INTERNAL_NOTE_SECRET' not in page.locator('.bad-customer').inner_text()
   page.screenshot(path=str(OUT/(kind+'-'+str(width)+'.png')),full_page=True)
   report['cases'].append({'scenario':kind,'width':width,'four_steps':True,'autosave_stable':True,'released':True,'horizontal_scroll':False})
   if width==390:
    for extension in ['zip','pdf']:
     with page.expect_download() as event:page.locator('[data-export="'+extension+'"]').click()
     download=event.value;assert download.failure() is None
     dest=OUT/(kind+'-browser.'+extension);download.save_as(str(dest));data=dest.read_bytes();assert len(data)>100
     if extension=='pdf':assert data.startswith(b'%PDF-') and b'%%EOF' in data[-1024:]
     report['downloads'].append({'name':dest.name,'size':len(data),'sha256':hashlib.sha256(data).hexdigest()})
    # Without consent, only the validation message appears; no mail/navigation.
    page.locator('[data-inquiry]').first.click();page.locator('#bad-inquiry-preview').click();before=page.url;page.locator('#bad-mail-open').click();assert page.url==before;assert 'bewusst' in page.locator('#bad-inquiry-error').inner_text();page.locator('.bad-dialog .bad-close').click()
   page.close()
 # Read ZIP bytes independently and open extracted HTML without a server.
 for kind in ['seamless','tile','mixed']:
  path=ROOT/'qa/bad'/kind
  path.mkdir(exist_ok=True)
  with zipfile.ZipFile(ROOT/'qa/bad'/(kind+'.zip')) as z:
   assert z.testzip() is None;manifest=json.loads(z.read('Manifest.json'))
   files=manifest['files'] if isinstance(manifest,dict) else manifest
   for item in files:
    name=item.get('path',item.get('name'));data=z.read(name)
    assert hashlib.sha256(data).hexdigest()==item['sha256']
    assert len(data)==item.get('size',item.get('bytes'))
   z.extractall(path)
  context=browser.new_context(offline=True,viewport={'width':390,'height':844})
  page=context.new_page();external=[];page.on('request',lambda r:external.append(r.url) if r.url.startswith(('https:','http:')) else None)
  page.goto((path/'index.html').as_uri());page.wait_for_load_state('load')
  # Lazy photos also load in this fully expanded offline dossier.
  page.locator('img').evaluate_all('(xs)=>xs.forEach(x=>x.loading="eager")');page.wait_for_function('Array.from(document.images).every(x=>x.complete && x.naturalWidth>0)')
  assert not external,'Offline copy depends on network';assert page.evaluate('document.documentElement.scrollWidth')<=390
  page.screenshot(path=str(OUT/(kind+'-offline.png')),full_page=True)
  report['offline'].append({'scenario':kind,'files_verified':len(files),'images':page.locator('img').count(),'network_requests':0,'opened_file_url':True})
  context.close()
 browser.close()
server.shutdown();assert not report['errors'],report['errors'];(OUT/'report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
