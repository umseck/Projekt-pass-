"""Browser -> production handler -> PostgreSQL, with simulated Auth and test data only."""
from pathlib import Path
import subprocess,json,time,zipfile,hashlib,os,traceback
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'qa/quality';OUT.mkdir(parents=True,exist_ok=True)
report={'status':'running','auth':'Synthetic Auth upstream; not live Supabase authentication','cases':[],'widths':[],'downloads':[],'rights':[],'console_errors':[],'offline':[]}
process=subprocess.Popen(['node','scripts/quality/server.mjs'],cwd=ROOT,stdout=subprocess.PIPE,stderr=open(OUT/'server.log','w'),text=True)
origin=json.loads(process.stdout.readline())['origin']
def api(page,op,data={}):
 return page.evaluate("async ([o,b])=>{const r=await fetch('/api/'+o,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});return {status:r.status,data:await r.json()}}",[op,data])
def reveal(locator):
 for _ in range(6):
  ds=locator.locator('xpath=ancestor::details[not(@open)]')
  if not ds.count():break
  ds.last.locator(':scope > summary').click()
def save(page):page.wait_for_function("document.querySelector('#bad-save-state')?.textContent==='Gespeichert'",timeout=30000)
def no_overflow(page,width,scope):
 actual=page.evaluate('document.documentElement.scrollWidth');assert actual<=width,f'{scope}: overflow {actual}>{width}'
def step(page,n):page.locator('[data-step="'+str(n)+'"]').click();page.wait_for_selector('[data-step="'+str(n)+'"][aria-current="step"]')
def publish(page):
 step(page,3);page.locator('#bad-publish-consent').check();page.locator('#bad-next').click();page.wait_for_selector('.bad-customer')
def open_document(page,area_id,public=True):
 b=page.locator('#bad-add-document');reveal(b);b.click();page.locator('#doc-name').fill('QA Betriebshinweis' if public else 'PRIVATE_FILE_SENTINEL');page.locator('#doc-type').select_option('business');page.locator('#doc-kind').select_option('business');page.locator('#doc-source').fill('QA Testbetrieb');page.locator('#doc-date').fill('2026-10-04');page.locator('#doc-text').fill('FIKTIVER TESTHINWEIS. Keine reale Pflegeempfehlung. Individuelle QA-Kontrolle am 2027-10-03.');page.locator('#doc-file').set_input_files(str(ROOT/'qa/bad/seamless.pdf'))
 if public:page.locator('#doc-public').check()
 deps=page.locator('.bad-dialog [data-dependency]');deps.first.check();page.locator('#doc-save').click();page.wait_for_function("!document.querySelector('.bad-dialog').open")
try:
 with sync_playwright() as p:
  launch={'headless':True}
  if os.environ.get('CHROMIUM_BIN'):launch['executable_path']=os.environ['CHROMIUM_BIN']
  browser=p.chromium.launch(**launch);ctx=browser.new_context(ignore_https_errors=True,viewport={'width':390,'height':844},accept_downloads=True);page=ctx.new_page();page.on('pageerror',lambda e:report['console_errors'].append(str(e)))
  page.goto(origin+'/#login');page.locator('#email').fill('owner@example.test');page.locator('#password').fill('QA-local-only');page.locator('#login button[type="submit"]').click();page.wait_for_selector('#search');config=page.evaluate("fetch('/__qa/config').then(r=>r.json())")
  anon=browser.new_context(ignore_https_errors=True,viewport={'width':390,'height':844},accept_downloads=True);customer=anon.new_page();customer.goto(origin);customer.on('pageerror',lambda e:report['console_errors'].append(str(e)))
  for case in config['projects']:
   begin=time.monotonic();print('START',case['kind'],flush=True);page.goto(origin+'/#bath/'+case['id']);page.wait_for_selector('#bad-next');step(page,1)
   for a in case['areas']:
    idx=0 if a['trade']=='seamless' else 1
    if a['type']=='niche' and a['trade']=='seamless':idx=2
    # Standards sorted by updated_at; identify by their exact visible name.
    title=['QA seamless','QA tile','QA mixed'][idx];card=page.locator('article.bad-usage').filter(has=page.get_by_role('heading',name=title,exact=True));card.locator('[data-standard]').click()
    [el.uncheck() for el in page.locator('.bad-dialog [data-select-area]').all()];page.locator('[data-select-area="'+a['id']+'"]').check();page.locator('#bad-apply-areas').click();page.wait_for_function("!document.querySelector('.bad-dialog').open")
   step(page,2)
   for i,a in enumerate(case['areas']):
    page.locator('[data-area="'+a['id']+'"]').click();page.wait_for_selector('#bad-section');uses=page.locator('[data-usage]');assert uses.count()>0
    first=uses.first;field=first.locator('[data-field="spec.color"]');field.fill('QA-Sand' if i%2==0 else 'QA-Oliv');field.focus();before=field.bounding_box();save(page);assert field.evaluate('(el)=>document.activeElement===el');assert abs(before['y']-field.bounding_box()['y'])<2
    for w in [320,375,390,430,768,1024,1440]:page.set_viewport_size({'width':w,'height':900});no_overflow(page,w,'editor');report['widths'].append({'case':case['kind'],'area':a['type'],'width':w,'editor':True})
    page.set_viewport_size({'width':390,'height':844})
    if case['kind']=='mixed' and a['type']=='shower_wall':
     u=page.locator('[data-usage]').filter(has=page.get_by_text('Elastischer Dichtstoff / Silikon',exact=True)).first;v=u.locator('[data-field="product.variant_status"]');reveal(v);v.select_option('unknown');u.locator('[data-field="product.name"]').fill('QA abweichendes Silikon – Variante unbekannt')
    if a['trade']=='tile' and i>0:
     u=page.locator('[data-usage]').first;v=u.locator('[data-field="product.name"]');reveal(v);v.fill('QA zweite Fliese Wand 30 x 60')
    ids=page.locator('[data-confirm-use]').evaluate_all('(xs)=>xs.map(x=>x.dataset.confirmUse)')
    for uid in ids:page.locator('[data-confirm-use="'+uid+'"]').click()
    b=page.locator('#bad-save-standard');b.click();page.locator('#bad-standard-name').fill('QA eigener Standard '+case['kind']+' '+str(i));page.locator('#bad-standard-save').click();page.wait_for_function("!document.querySelector('.bad-dialog').open")
    open_document(page,a['id']);b=page.locator('[data-confirm-doc]').last;reveal(b);b.click()
    # Explicit customer-care declaration with exact dependencies.
    b=page.locator('#bad-add-care');reveal(b);b.click();page.locator('#binding-text').fill('FIKTIVE PFLEGEANWEISUNG – ausschließlich Softwaretest.');page.locator('.bad-dialog label').filter(has_text='Schlussversiegelung' if a['trade']=='seamless' else 'Fliese / Naturstein').locator('input').check();page.locator('#binding-confirm').check();page.locator('#binding-save').click();page.wait_for_function("!document.querySelector('.bad-dialog').open")
    for j in range(i,6,len(case['areas'])):
     upload=page.locator('#bad-photo-upload');reveal(upload);page.locator('[data-field="photo-step"]').select_option('finished');page.locator('[data-field="photo-caption"]').fill('FIKTIVES TESTFOTO '+str(j));page.locator('#bad-photo-public').check();n=page.locator('[data-photo-public]').count();upload.set_input_files(str(ROOT/'qa/quality/photo.jpg'));page.wait_for_function('(n)=>document.querySelectorAll("[data-photo-public]").length>n',arg=n)
    if i==0:
     open_document(page,a['id'],False);b=page.locator('#bad-internal-note');reveal(b);b.fill('PRIVATE_NOTE_SENTINEL')
     b=page.locator('#bad-add-maintenance');reveal(b);b.click();page.locator('#binding-text').fill('Individuell vereinbarte QA-Nachkontrolle');page.locator('#binding-from').fill('2027-10-03');page.locator('.bad-dialog [data-dependency]').first.check();page.locator('#binding-confirm').check();page.locator('#binding-save').click();page.wait_for_function("!document.querySelector('.bad-dialog').open")
    save(page)
   draft=api(page,'bad_get',{'id':case['id']})['data'];bad=api(customer,'bad_get',{'id':case['id']});assert bad['status']==401;report['rights'].append({'case':case['kind'],'anonymous_edit':401})
   publish(page);customer.goto(origin+'/#p/'+case['token']);customer.wait_for_selector('.bad-customer');snapshot=api(customer,'bad_read',{'token':case['token']})['data']['snapshot'];assert snapshot and len(snapshot['photos'])==6;assert 'PRIVATE_' not in json.dumps(snapshot);assert config['owner'] not in json.dumps(snapshot);assert len(snapshot['care'])==len(case['areas']);old=snapshot
   if case['kind']=='mixed':
    page.goto(origin+'/#bath/'+case['id']);page.wait_for_selector('#bad-next');step(page,2);page.locator('[data-area="'+case['areas'][0]['id']+'"]').click();first=page.locator('[data-usage]').first;uid=first.get_attribute('data-usage');first.locator('[data-field="spec.color"]').fill('QA berichtigt');page.locator('[data-confirm-use="'+uid+'"]').click();step(page,3);page.locator('[data-field="release.reason"]').fill('QA: falschen Farbton berichtigt');page.locator('#bad-publish-consent').check();page.locator('#bad-next').click();page.wait_for_selector('.bad-customer')
    assert api(customer,'bad_read',{'token':case['token'],'number':1})['data']['snapshot']==old
    page.goto(origin+'/#bath/'+case['id']);page.wait_for_selector('#bad-next');step(page,2);page.locator('[data-area="'+case['areas'][0]['id']+'"]').click();page.locator('#bad-new-work').click();page.locator('#work-date').fill('2028-10-03');page.locator('#work-region').fill('Links vor der Tür, ungefähr 0,4 m²');page.locator('#work-description').fill('QA Teilreparatur nach zwei Jahren');page.locator('#work-add').click();page.wait_for_function("!document.querySelector('.bad-dialog').open");page.locator('#bad-add-free').click();entry=page.locator('[data-usage]').last;entry.locator('[data-field="product.manufacturer"]').fill('QA Prüfmuster');entry.locator('[data-field="product.name"]').fill('QA Reparaturprodukt');entry.locator('[data-field="product.variant"]').fill('B');entry.locator('[data-field="product.variant_status"]').select_option('known');entry.locator('[data-confirm-use]').click();publish(page)
    customer.reload();customer.wait_for_selector('.bad-customer');snapshot=api(customer,'bad_read',{'token':case['token']})['data']['snapshot'];assert snapshot['release']['number']==3;assert 'Für einen später bearbeiteten Teilbereich fehlt' in customer.locator('.bad-customer').inner_text();assert api(customer,'bad_read',{'token':case['token'],'number':1})['data']['snapshot']==old
   for w in [320,375,390,430,768,1024,1440]:customer.set_viewport_size({'width':w,'height':900});no_overflow(customer,w,'customer')
   customer.set_viewport_size({'width':390,'height':844});customer.screenshot(path=str(OUT/(case['kind']+'-customer.png')),full_page=True)
   for ext in ['pdf','zip']:
    with customer.expect_download() as event:customer.locator('[data-export="'+ext+'"]').click()
    d=event.value;assert d.failure() is None;dest=OUT/(case['kind']+'-live-path.'+ext);d.save_as(str(dest));raw=dest.read_bytes();report['downloads'].append({'file':dest.name,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
   customer.locator('[data-inquiry]').first.click();customer.locator('#bad-inquiry-preview').click();before=customer.url;customer.locator('#bad-mail-open').click();assert customer.url==before;assert 'bewusst' in customer.locator('#bad-inquiry-error').inner_text();customer.keyboard.press('Escape');assert not customer.locator('.bad-dialog').evaluate('(el)=>el.open')
   report['cases'].append({'kind':case['kind'],'standards_via_ui':True,'confirmations_via_ui':True,'photo_uploads':6,'release':snapshot['release']['number'],'private_files_excluded':True,'seconds':round(time.monotonic()-begin,2)});(OUT/(case['kind']+'-snapshot.json')).write_text(json.dumps(snapshot,ensure_ascii=False));print('DONE',case['kind'],flush=True)
  for case in config['projects']:
   k=case['kind'];dest=OUT/(k+'-offline');dest.mkdir(exist_ok=True)
   with zipfile.ZipFile(OUT/(k+'-live-path.zip')) as z:
    assert z.testzip() is None;manifest=json.loads(z.read('Manifest.json'));assert 'PRIVATE_' not in z.read('Projektpass.json').decode()
    for f in manifest['files']:
     b=z.read(f['path']);assert len(b)==f['size'];assert hashlib.sha256(b).hexdigest()==f['sha256']
    z.extractall(dest)
   off=browser.new_context(offline=True,viewport={'width':390,'height':844});op=off.new_page();net=[];op.on('request',lambda r:net.append(r.url) if r.url.startswith(('http:','https:')) else None);op.goto((dest/'index.html').as_uri());op.locator('img').evaluate_all('(xs)=>xs.forEach(x=>x.loading="eager")');op.wait_for_function('Array.from(document.images).every(x=>x.complete&&x.naturalWidth>0)');assert not net;no_overflow(op,390,'offline');report['offline'].append({'case':k,'sha256_verified':True,'file_url_opened':True,'network_requests':0,'decoded_images':op.locator('img').count()});off.close()
  report['api_timings']=page.evaluate("fetch('/__qa/stats').then(r=>r.json())");assert not report['console_errors'];browser.close();report['status']='passed'
except Exception as e:
 report['status']='failed';report['error']=str(e);report['traceback']=traceback.format_exc();raise
finally:
 (OUT/'browser-report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False));process.terminate();process.wait(timeout=10)
