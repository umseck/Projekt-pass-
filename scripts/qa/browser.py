"""Real Chromium + local HTTPS + production API + isolated PostgreSQL.
Synthetic accounts only. Run npm test first. No real messages are sent.
"""
from pathlib import Path
import subprocess,json,time,base64,hashlib,zipfile,io,os
from PIL import Image,ImageDraw
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'qa/browser';OUT.mkdir(parents=True,exist_ok=True)
server=subprocess.Popen(['node','scripts/qa/server.mjs'],cwd=ROOT,stdout=subprocess.PIPE,stderr=open(OUT/'server.log','w'),text=True)
line=server.stdout.readline();assert line,line
origin=json.loads(line)['origin'];report={'environment':'Local HTTPS + production handler + PGlite; simulated Supabase Auth','cases':[],'browser_errors':[],'downloads':[],'rights':[],'mobile':[],'offline':[]}
for i in range(6):
 im=Image.new('RGB',(900,550),(237-i*3,232-i*2,219));d=ImageDraw.Draw(im);d.rectangle((25,25,875,525),outline=(70,89,56),width=4);d.text((60,75),f'FIKTIVES TESTFOTO {i+1}',fill=(45,63,37));d.text((60,125),'KEINE REALE BAUSTELLE / KEIN AUSFUEHRUNGSNACHWEIS',fill=(45,63,37));im.save(OUT/f'photo-{i}.jpg',quality=80)
logo=Image.new('RGB',(350,90),'white');ImageDraw.Draw(logo).text((20,30),'TESTBETRIEB / LOGO',fill=(50,68,30));buf=io.BytesIO();logo.save(buf,format='PNG');logo_data='data:image/png;base64,'+base64.b64encode(buf.getvalue()).decode()
with zipfile.ZipFile(ROOT/'qa/generated/seamless.zip') as z:
 pdfpath=OUT/'TEST-Betriebshinweis.pdf';pdfpath.write_bytes(z.read('Unterlagen/dokument-001.pdf'))
def request(page,op,body=None):
 return page.evaluate('''async ([op,body])=>{const r=await fetch('/api/'+op,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body||{})});return {status:r.status,data:await r.json()};}''',[op,body or {}])
def open_parents(locator):
 for _ in range(6):
  p=locator.locator('xpath=ancestor::details[not(@open)]').first
  if not p.count():break
  p.locator(':scope > summary').click()
def saved(page):page.wait_for_function("document.querySelector('#bath-save')?.textContent==='Gespeichert'",timeout=20000)
def nooverflow(page,width,where):
 value=page.evaluate('document.documentElement.scrollWidth');offenders=page.evaluate('Array.from(document.body.querySelectorAll("*")).filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,12).map(e=>e.tagName+"."+e.className)') if value>width else [];assert value<=width,f'Overflow {where}: {value}>{width}; {offenders}'
def close_dialog(page):
 page.keyboard.press('Escape');page.wait_for_function("!document.querySelector('#modal').open")
try:
 with sync_playwright() as playwright:
  browser=playwright.chromium.launch(executable_path=os.environ.get('CHROMIUM_BIN','/usr/bin/chromium'),headless=True)
  ctx=browser.new_context(ignore_https_errors=True,viewport={'width':390,'height':844},accept_downloads=True);page=ctx.new_page();page.on('pageerror',lambda e:report['browser_errors'].append(str(e)));page.goto(origin+'/#login');page.locator('#email').fill('test@example.test');page.locator('#password').fill('LOCAL-TEST-ONLY');page.locator('#login button[type="submit"]').click();page.wait_for_selector('#search')
  config=page.evaluate("fetch('/__qa/config').then(r=>r.json())")
  anon=browser.new_context(ignore_https_errors=True,viewport={'width':390,'height':844},accept_downloads=True);public=anon.new_page();public.on('pageerror',lambda e:report['browser_errors'].append(str(e)));public.goto(origin)
  for n,kind in enumerate(['seamless','tile','mixed']):
   start=time.monotonic();print('Start',kind,flush=True);boot=request(page,'bootstrap')['data'];prof=boot['company'];st=config['standards'][kind];prof.update({'trade':st['trade'],'standards':{st['trade']:st['value']},'logo':logo_data});r=request(page,'company_save',{'profile':prof,'version':boot['company_version']});assert r['status']==200,r
   page.goto(origin+'/?qa='+str(n)+'#activate/'+config['passes'][n]['id']);page.wait_for_selector('#title');page.locator('#title').fill('TEST '+kind+' · ÄÖÜ äöü ß');page.locator('#activate button[type="submit"]').click();page.wait_for_selector('#bath-dashboard');project_id=page.url.split('#bath/')[1]
   page.locator('.area-dashboard-card[data-open-area="0"]').click();page.wait_for_selector('#bath-area');count=page.locator('#bath-area option').count();saved(page)
   early=request(page,'preview',{'id':project_id});assert early['status']==200;assert 'TEST-surface' not in json.dumps(early['data']);assert 'TEST-tile' not in json.dumps(early['data'])
   for i in range(count):
    page.locator('#bath-area').select_option(str(i));page.wait_for_selector('#bath-care-text',state='attached')
    for width in [320,375,390,430,768,1024,1440]:page.set_viewport_size({'width':width,'height':900});nooverflow(page,width,f'{kind} editor area {i}')
    page.set_viewport_size({'width':390,'height':844});colours=page.locator('[data-bath-color]')
    for index in range(colours.count()):
     field=colours.nth(index)
     if field.is_visible():field.fill('TEST-Sonderfarbe / Muster M-004' if kind=='mixed' and i else 'TEST-Oliv' if i%2 else 'TEST-Sand')
    primary='tile' if page.locator('[data-material-kind="tile"]').count() else 'surface';field=page.locator('[data-bath-color="'+primary+'"]');field.focus();before=field.bounding_box();saved(page);assert field.evaluate('(el)=>document.activeElement===el');after=field.bounding_box();assert abs(before['y']-after['y'])<2,'Autosave jumps input'
    if kind=='mixed' and i>0:page.locator('[data-ownership="waterproofing"]').select_option('external');page.locator('[data-ownership="silicone"]').select_option('unknown')
    for k in page.locator('[data-confirm-material]').evaluate_all('(xs)=>xs.map(x=>x.dataset.confirmMaterial)'):
     button=page.locator('[data-confirm-material="'+k+'"]')
     if button.is_enabled():button.click()
    role='finish' if primary=='surface' else 'tile';upload=page.locator('[data-bath-pdf="'+role+'"]');open_parents(upload);upload.set_input_files(str(pdfpath));pub=page.locator('[data-doc-public="'+role+':0"]');pub.wait_for(state='attached');open_parents(pub);assert not pub.is_checked();pub.check()
    if i==0:
     private_path=OUT/'PRIVATE_FILENAME_SENTINEL.pdf';private_path.write_bytes(pdfpath.read_bytes());upload=page.locator('[data-bath-pdf="'+role+'"]');open_parents(upload);upload.set_input_files(str(private_path));page.locator('[data-doc-public="'+role+':1"]').wait_for(state='attached')
    field=page.locator('#bath-care-text');open_parents(field);field.fill('FIKTIVER TESTHINWEIS – keine reale Pflegeempfehlung.');page.locator('#bath-care-source').fill('Fiktiver Testbetrieb – keine Herstellerquelle');page.locator('#bath-care-date').fill('2026-10-04');page.locator('#bath-care-kind').select_option('business');page.locator('#bath-care-confirm').check();assert page.locator('#bath-care-confirm').is_checked()
    for j in [j for j in range(6) if j%count==i]:
     upload=page.locator('#bath-photos');open_parents(upload);page.locator('#bath-photo-stage').select_option('finished' if kind=='mixed' or j>=count else 'before');page.locator('#bath-photo-caption').fill(f'FIKTIVES Testfoto {j+1} – kein Ausführungsnachweis');existing=page.locator('[data-photo-public]').count();upload.set_input_files(str(OUT/f'photo-{j}.jpg'));pbox=page.locator('[data-photo-public="'+str(existing)+'"]');pbox.wait_for(state='attached');open_parents(pbox);assert not pbox.is_checked();pbox.check()
    if primary=='tile':field=page.locator('#bath-spares');open_parents(field);field.fill('TEST: 4 Restfliesen im beschrifteten Karton, Abstellraum.')
    saved(page)
   page.locator('[data-bath-step="2"]').click();page.wait_for_selector('[data-confirm-area]');standard=page.locator('#bath-standard');open_parents(standard);standard.click();page.wait_for_function("document.querySelector('#bath-standard-status').textContent.includes('Standard gespeichert')")
   for i in range(count):page.locator('[data-confirm-area="'+str(i)+'"]').check()
   saved(page);page.locator('#bath-next').click();page.wait_for_selector('#copy-link');token=config['passes'][n]['token'];public.goto(origin+'/#p/'+token);public.wait_for_selector('#bath-quick-answers');text=public.locator('.customer-dossier').inner_text();assert 'PRIVATE_FILENAME_SENTINEL' not in text
   raw=request(public,'scan',{'token':token});assert raw['status']==200;assert 'PRIVATE_FILENAME_SENTINEL' not in json.dumps(raw['data']);assert 'confirmed_actor' not in json.dumps(raw['data']);assert len([p for a in raw['data']['content']['areas'] for p in a['photos']])==6
   assert all(a['care'].get('text') for a in raw['data']['content']['areas']),raw['data']['content']['areas']
   for width in [320,375,390,430,768,1024,1440]:
    public.set_viewport_size({'width':width,'height':900});nooverflow(public,width,kind+' customer');report['mobile'].append({'case':kind,'width':width,'editor_all_areas':True,'customer':True,'horizontal_overflow':False})
   public.set_viewport_size({'width':390,'height':844});public.screenshot(path=str(OUT/(kind+'-customer.png')),full_page=True)
   denied=request(public,'project',{'id':project_id});assert denied['status']==401;report['rights'].append({'case':kind,'unauthenticated_project':denied['status']});public.locator('#export').click();public.wait_for_selector('#bath-export-zip')
   for ext in ['pdf','zip','html']:
    button='#bath-export' if ext=='html' else '#bath-export-'+ext
    with public.expect_download() as event:public.locator(button).click()
    download=event.value;assert download.failure() is None;dest=OUT/(kind+'.'+ext);download.save_as(str(dest));data=dest.read_bytes();assert len(data)>100;report['downloads'].append({'file':dest.name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
   close_dialog(public);assert public.locator('#export').evaluate('(el)=>document.activeElement===el'),'Dialog focus did not return'
   public.locator('#customer-area').select_option(index=count-1);public.locator('#bath-maintenance').click();public.wait_for_selector('#bath-inquiry-open');assert raw['data']['content']['areas'][count-1]['name'] in public.locator('#bath-inquiry-text').inner_text();before=public.url;public.locator('#bath-inquiry-open').click();assert public.url==before;assert 'bewusst bestätigen' in public.locator('#bath-inquiry-error').inner_text();close_dialog(public)
   report['cases'].append({'case':kind,'areas':count,'standard_saved_via_ui':True,'activated_via_ui':True,'care_confirmed_via_ui':True,'photo_uploads':6,'private_pdf_excluded':True,'published_via_ui':True,'customer_anonymous':True,'inquiry_consent_checked':True,'elapsed_seconds':round(time.monotonic()-start,2)});(OUT/(kind+'-snapshot.json')).write_text(json.dumps(raw['data'],ensure_ascii=False));print('Done',kind,flush=True)
  for kind in ['seamless','tile','mixed']:
   target=OUT/(kind+'-offline');target.mkdir(exist_ok=True)
   with zipfile.ZipFile(OUT/(kind+'.zip')) as archive:
    assert archive.testzip() is None;manifest=json.loads(archive.read('Manifest.json'));assert len([f for f in manifest['files'] if f['path'].startswith('Fotos/')])==6
    for f in manifest['files']:
     data=archive.read(f['path']);assert len(data)==f['size'];assert hashlib.sha256(data).hexdigest()==f['sha256']
    archive.extractall(target)
   offline=browser.new_context(offline=True,viewport={'width':390,'height':844});off=offline.new_page();net=[];off.on('request',lambda r:net.append(r.url) if r.url.startswith(('http:','https:')) else None);off.goto((target/'index.html').as_uri());off.locator('img').evaluate_all('(xs)=>xs.forEach(x=>x.loading="eager")');off.wait_for_function('Array.from(document.images).every(x=>x.complete && x.naturalWidth>0)');assert not net;nooverflow(off,390,'offline');assert 'PRIVATE_FILENAME_SENTINEL' not in off.locator('body').inner_text();off.screenshot(path=str(OUT/(kind+'-offline.png')),full_page=True);report['offline'].append({'case':kind,'crc_and_sha256_verified':True,'network_requests':0,'images_decoded':off.locator('img').count(),'opened_file_url':True});offline.close()
  assert not report['browser_errors'],report['browser_errors'];browser.close()
 report['status']='passed';(OUT/'report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False));print(json.dumps(report,indent=2,ensure_ascii=False))
except Exception as error:
 report['status']='failed';report['error']=str(error);(OUT/'report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
 try:page.screenshot(path=str(OUT/'failure-editor.png'),full_page=True);(OUT/'failure-editor.html').write_text(page.content())
 except Exception:pass
 try:public.screenshot(path=str(OUT/'failure-customer.png'),full_page=True)
 except Exception:pass
 raise
finally:
 server.terminate();server.wait(timeout=10)
