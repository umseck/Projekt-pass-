import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {createHandler} from '../server/api.mjs';
import {areaConfirmed,careValid} from '../public/bath-model.mjs';

const installer='11111111-1111-4111-8111-111111111111',owner='22222222-2222-4222-8222-222222222222',successor='44444444-4444-4444-8444-444444444444';
const cid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',pid='33333333-3333-4333-8333-333333333333',token='a'.repeat(64);
const origin='https://projektpass.example';
const wait=async(check,label='expected UI')=>{for(let i=0;i<180;i++){if(await check())return;await new Promise(r=>setTimeout(r,20));}throw Error('UI did not reach '+label);};

test('actual four-step UI → API → SQL: first bath, handover, customer history and ownership transfer',async()=>{
 const db=new PGlite();await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
 for(const file of ['schema.sql','operator.sql','workflow.sql','customer-continuation.sql'])await db.exec(await readFile(new URL('../database/'+file,import.meta.url),'utf8'));
 const profile={name:'Test-Fliesenbetrieb',email:'installer@example.test',trade:'tile',onboarding_complete:true};
 await db.query('insert into pp_private.companies(id,profile) values($1,$2)',[cid,JSON.stringify(profile)]);
 await db.query('insert into pp_private.members(user_id,company_id) values($1,$2)',[installer,cid]);
 await db.query('insert into pp_private.passes(id,company_id,number,token) values($1,$2,7,$3)',[pid,cid,token]);
 const env={APP_ORIGIN:origin,SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co',SUPABASE_SECRET_KEY:'test-secret',SUPABASE_PUBLISHABLE_KEY:'test-public'};
 const json=(data,status=200)=>new Response(JSON.stringify(data),{status});
 const handle=createHandler(async(url,opts)=>{
  const b=opts.body?JSON.parse(opts.body):{};
  if(url.includes('/token')){const id=b.email==='customer@example.test'?owner:b.email==='successor@example.test'?successor:installer;return json({access_token:id,expires_in:3600,user:{id,email:b.email}});}
  if(url.endsWith('/user'))return json({id:opts.headers.Authorization.slice(7)});
  if(url.endsWith('/logout'))return json({ok:true});
  if(url.endsWith('/admin/users'))return json({id:b.email==='successor@example.test'?successor:owner,email:b.email});
  const fn=url.endsWith('/pp_customer')?'pp_customer':url.endsWith('/pp_control')?'pp_control':'pp_api';
  try{return json((await db.query(`select public.${fn}($1,$2::uuid,$3::jsonb) result`,[b.op,b.actor,JSON.stringify(b.args)])).rows[0].result);}catch(e){return json({message:e.message},400);}
 });
 const win=new Window({url:origin+'/#login'});win.document.body.innerHTML='<div id="app"></div><dialog id="modal"></dialog><div id="notice"></div>';
 Object.assign(globalThis,{window:win,document:win.document,location:win.location,history:win.history,FormData:win.FormData,FileReader:win.FileReader,confirm:()=>true});
 const catalog=JSON.parse(await readFile(new URL('../public/catalog.json',import.meta.url),'utf8'));
 let cookie='',saveOffline=false;
 globalThis.fetch=async(path,opts)=>{
  if(path==='/catalog.json')return json(catalog);
  if(path==='/api/save'&&saveOffline)throw Error('Test: keine Verbindung');
  const r=await handle(new Request(origin+path,{...opts,headers:{...opts?.headers,origin,cookie}}),env);
  if(r.headers.has('Set-Cookie'))cookie=r.headers.get('Set-Cookie').split(';')[0];return r;
 };
 const $=s=>win.document.querySelector(s),input=(s,value,event='input')=>{assert.ok($(s),'input exists: '+s);$(s).value=value;$(s).dispatchEvent(new win.Event(event,{bubbles:true}));};
 const submit=s=>$(s).dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));
 const project=async()=>(await db.query('select * from pp_private.projects')).rows[0];
 const manual=async(kind,maker,name)=>{$('[data-bath-product="'+kind+'"]').click();await wait(()=>$('#catalog-manual'),'product picker');$('#catalog-manual').click();input('#manual-maker',maker);input('#manual-name',name);submit('#bath-manual');await wait(()=>!$('#modal').open,'manual product applied');};
 try{
  await import('../public/app.mjs?mvp-ui-integration');await wait(()=>$('#login'));
  input('#email','installer@example.test');input('#password','Installer password 123');submit('#login');await wait(()=>$('#search'),'business overview');
  win.location.hash='activate/'+pid;await wait(()=>$('#activate'));input('#title','Bad Maier');submit('#activate');await wait(()=>$('#bath-title'),'bath metadata');
  assert.equal(win.document.querySelectorAll('[data-bath-step]').length,4);
  input('#bath-object-label','Bad im Obergeschoss');input('#bath-completed-on','2026-10-01');input('#bath-scope','Boden gefliest, Fugen und Anschlussfugen hergestellt.');
  input('#bath-customer-name','PRIVATE CUSTOMER');input('#bath-address','PRIVATE ADDRESS');$('#bath-next').click();await wait(()=>$('#bath-dashboard'),'area overview');
  $('[data-open-area="0"]').click();await wait(()=>$('#bath-area-name'));input('#bath-area-name','Fliesenboden');input('#bath-position','floor','change');
  await manual('tile','Testhersteller','TEST-Fliese 60×60');input('#bath-color-tile','TEST-Sand');input('#bath-format-tile','60 × 60');
  await manual('grout','Testhersteller','TEST-Fuge');input('#bath-color-grout','TEST-Basalt');
  $('[data-bath-product="silicone"]').click();await wait(()=>$('#catalog-picker'));$('[data-catalog-pick="pci-silcofug-e"]').click();await wait(()=>!$('#modal').open);
  input('#bath-palette-silicone','16 · Silbergrau','change');
  assert.ok($('#bath-body').textContent.includes('Technisches Merkblatt'),'exact product documentation attached');
  input('[data-role-status="adhesive"]','unknown','change');input('#bath-status-note-adhesive','Auf der Rechnung nicht bezeichnet.');input('[data-role-status="waterproofing"]','not_applicable','change');
  await wait(async()=>$('#bath-save').textContent==='Gespeichert','initial save');
  saveOffline=true;input('#bath-color-grout','TEST-Neuer Farbton');await wait(()=>$('#bath-save').textContent==='Nicht gespeichert','offline save state');
  assert.equal($('#bath-color-grout').value,'TEST-Neuer Farbton');assert.equal((await project()).content.areas[0].products.grout.color,'TEST-Basalt');
  saveOffline=false;$('#bath-next').click();await wait(()=>$('#bath-editor').dataset.step==='2','files and care');
  assert.equal((await project()).content.areas[0].products.grout.color,'TEST-Neuer Farbton','step transition retries pending save');
  input('#bath-care-text','TEST-Pflegehinweis, keine reale Produktfreigabe.');input('#bath-care-source','Fiktive Test-Pflegeanleitung vom 01.10.2026');input('#bath-care-url','https://example.test/test-care.pdf');input('#bath-care-date','2026-10-01');$('#bath-care-confirm').click();
  input('#bath-spares','2 TEST-Fliesen im Regal Keller');input('#bath-note','TEST-Hinweis für spätere Reparatur.');$('#bath-next').click();await wait(()=>$('#bath-release-confirm'),'actual customer preview');
  assert.ok(!$('#bath-preview-content').textContent.includes('PRIVATE CUSTOMER'));assert.ok(!$('#bath-preview-content').textContent.includes('PRIVATE ADDRESS'));
  assert.match($('#bath-body').textContent,/keine rechtsgeschäftliche Bauabnahme/);
  $('#bath-next').click();await wait(()=>$('#bath-error').textContent.includes('Lücken'),'gap acknowledgement gate');assert.equal((await project()).status,'draft');
  const adhesiveGap=$('[data-gap-field="adhesive"]');assert.ok(adhesiveGap,'specific missing source has actionable gap link');adhesiveGap.click();assert.ok($('[data-product-panel="adhesive"]'),'gap opens matching area/material');
  $('[data-bath-step="3"]').click();await wait(()=>$('#bath-release-confirm'));$('#bath-gaps-confirm').click();$('#bath-next').click();await wait(()=>$('#bath-error').textContent.includes('ausdrücklich freigeben'),'release gate');
  $('[data-confirm-area="0"]').click();$('#bath-release-confirm').click();$('#bath-next').click();await wait(()=>$('#copy-link'),'handover ready');
  const handed=await project(),snapshot=structuredClone(handed.handover_snapshot);
  assert.equal(handed.status,'handed_over');assert.ok(snapshot.handed_over_at);assert.equal(areaConfirmed(snapshot.content.areas[0]),true);assert.equal(careValid(snapshot.content.areas[0]),true);
  assert.equal(snapshot.content.areas[0].roles_status.adhesive,'unknown');assert.equal(snapshot.content.areas[0].roles_status.waterproofing,'not_applicable');
  $('#handover-card').click();await wait(()=>$('#print-handover-card'));assert.ok($('#modal .takeaway-qr svg'));assert.ok(!$('#modal').textContent.includes('PRIVATE ADDRESS'));$('#modal .close').click();
  win.location.hash='p/'+token;await wait(()=>$('#customer-quick-result'),'anonymous bath view');$('[data-topic="color"]').click();assert.match($('#customer-quick-result').textContent,/TEST-Neuer Farbton/);$('[data-topic="care"]').click();assert.match($('#customer-quick-result').textContent,/Fiktive Test-Pflegeanleitung/);
  assert.equal($('#customer-add'),null);assert.equal($('#customer-transfer'),null);assert.ok(!$('#app').textContent.includes('PRIVATE CUSTOMER'));assert.ok(!$('#app').textContent.includes('PRIVATE ADDRESS'));
  const scan=await (await globalThis.fetch('/api/scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})})).json();
  assert.equal(scan.internal,undefined);assert.equal(scan.owner_key_hash,undefined);assert.equal(scan.permissions,undefined);assert.equal(scan.additions,undefined);
  const forged=await handle(new Request(origin+'/api/save',{method:'POST',headers:{origin:'https://foreign.example',cookie,'Content-Type':'application/json'},body:'{}'}),env);assert.equal(forged.status,403,'foreign origin cannot mutate');
  const frozen=await globalThis.fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:handed.id,version:handed.version,title:'Changed',content:handed.content,internal:{}})});assert.equal(frozen.status,409);
  assert.deepEqual((await project()).handover_snapshot,snapshot,'original remains unchanged after blocked edit');
  // An account-bound invitation gives write rights; the QR link keeps reading only the original.
  win.location.hash='ready/'+handed.id;await wait(()=>$('#customer-invite-form'),'personal customer invitation');input('#customer-invite-email','customer@example.test');submit('#customer-invite-form');await wait(()=>$('#customer-invite-result input'));const invite=$('#customer-invite-result input').value;
  assert.match(invite,/#customer-access\/[a-f0-9]{64}$/);assert.ok($('#customer-invite-result').textContent.includes('keine E-Mail'));
  $('#logout').click();await wait(()=>$('#login'));win.location.hash=invite.split('#')[1];await wait(()=>$('#customer-access-form'),'customer accepts invitation');input('#customer-access-password','Customer password 123');$('[name="accept"]').click();submit('#customer-access-form');await wait(()=>$('#customer-add'),'personal workspace');
  assert.equal((await db.query('select user_id from pp_private.customer_members where revoked_at is null')).rows[0].user_id,owner);
  assert.equal($('a[href="#settings"]'),null,'customer account is not a business account');
  $('#customer-add').click();await wait(()=>$('#customer-event-form'));input('#event-date','2026-10-02');input('#event-description','TEST-Wartung: Fugen kontrolliert.');input('#event-company','TEST-Wartungsbetrieb');input('#event-url','https://example.test/test-maintenance.pdf');input('#event-document-name','TEST-Wartungsnachweis');submit('#customer-event-form');await wait(()=>$('#customer-events').textContent.includes('TEST-Wartung'),'maintenance persisted');
  const event=(await db.query('select * from pp_private.customer_events')).rows[0];assert.equal(event.author_id,owner);assert.equal(event.author_label,'customer@example.test');assert.ok(event.recorded_at);assert.equal(event.event.occurred_on,'2026-10-02');assert.equal(event.event.company,'TEST-Wartungsbetrieb');assert.equal(event.event.documents[0].name,'TEST-Wartungsnachweis');assert.deepEqual((await project()).handover_snapshot,snapshot);
  // Repairing silicone changes that component, not the confirmed care of the tile surface.
  $('#customer-add').click();await wait(()=>$('#customer-event-form'));input('#event-kind','repair','change');input('#event-date','2026-10-03');input('#event-description','TEST-Silikonfuge ersetzt.');input('#event-effect','replaced');input('#event-role','silicone');input('#event-materials','TEST-Neues Silikon, TEST-Grau');submit('#customer-event-form');await wait(()=>$('#customer-events').textContent.includes('TEST-Silikonfuge ersetzt.'));
  $('[data-topic="care"]').click();assert.match($('#customer-quick-result').textContent,/Fiktive Test-Pflegeanleitung/);assert.match($('#customer-quick-result').textContent,/Silikon wurde/);assert.ok(!$('#customer-quick-result').textContent.includes('Für den heutigen Aufbau fehlt'));
  win.location.hash='home';await wait(()=>$('.customer-home'));assert.ok($('.customer-project-card[href="#customer/'+handed.id+'"]'));$('#customer-home-logout').click();await wait(()=>$('#login'));input('#email','customer@example.test');input('#password','Customer password 123');submit('#login');await wait(()=>$('.customer-home'),'customer can sign in again');win.location.hash='customer/'+handed.id;await wait(()=>$('#customer-add'));assert.match($('#customer-events').textContent,/TEST-Wartung/);
  // Accepting the transfer ends previous ownership and revokes the old QR capability.
  input('#transfer-email','successor@example.test');submit('#customer-transfer');await wait(()=>$('#customer-transfer-link input'));const transfer=$('#customer-transfer-link input').value;
  assert.equal((await db.query('select user_id from pp_private.customer_members where revoked_at is null')).rows[0].user_id,owner,'ownership stays until acceptance');
  $('#customer-logout').click();await wait(()=>$('#login'));win.location.hash=transfer.split('#')[1];await wait(()=>$('#customer-access-form'));assert.ok($('#app').textContent.includes('Online-Zugriff des bisherigen Verwalters'));input('#customer-access-password','Successor password 123');$('[name="accept"]').click();submit('#customer-access-form');await wait(()=>$('#customer-add'),'successor workspace');
  assert.match($('#customer-events').textContent,/TEST-Wartung/);assert.deepEqual((await project()).handover_snapshot,snapshot);assert.equal((await db.query('select user_id from pp_private.customer_members where revoked_at is null')).rows[0].user_id,successor);
  const oldScan=await globalThis.fetch('/api/scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});assert.equal(oldScan.status,404,'old physical QR link revoked after transfer');
  const oldOwner=await handle(new Request(origin+'/api/customer_project',{method:'POST',headers:{origin,cookie:'__Host-pp_session='+owner,'Content-Type':'application/json'},body:JSON.stringify({id:handed.id})}),env);assert.equal(oldOwner.status,403,'former owner loses online access');
  $('#customer-current-qr').click();await wait(()=>$('#customer-current-link'));const currentToken=$('#customer-current-link').value.split('/#p/')[1];assert.match(currentToken,/^[a-f0-9]{64}$/);assert.notEqual(currentToken,token);$('#modal .close').click();
  const currentScan=await (await globalThis.fetch('/api/scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:currentToken})})).json();assert.deepEqual(currentScan.content,snapshot.content);assert.equal(currentScan.additions,undefined,'customer extensions remain private even to new QR readers');
 }finally{await win.happyDOM.abort();await db.close();win.close();}
});

test('authenticated direct bath URL reload obtains its business context before mounting the editor',async()=>{
 const db=new PGlite();await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
 for(const file of ['schema.sql','operator.sql','workflow.sql','customer-continuation.sql'])await db.exec(await readFile(new URL('../database/'+file,import.meta.url),'utf8'));
 await db.query('insert into pp_private.companies(id,profile) values($1,$2)',[cid,JSON.stringify({name:'Reload TEST-Betrieb',trade:'tile',onboarding_complete:true})]);
 await db.query('insert into pp_private.members(user_id,company_id) values($1,$2)',[installer,cid]);
 await db.query('insert into pp_private.passes(id,company_id,number,token) values($1,$2,7,$3)',[pid,cid,token]);
 const activated=(await db.query("select public.pp_api('activate',$1,$2::jsonb) result",[installer,JSON.stringify({pass_id:pid,title:'Reload TEST-Bad'})])).rows[0].result;
 const handle=createHandler(async(url,opts)=>{
  if(url.endsWith('/user'))return Response.json({id:installer});
  const b=JSON.parse(opts.body),fn=url.endsWith('/pp_control')?'pp_control':url.endsWith('/pp_customer')?'pp_customer':'pp_api';
  try{return Response.json((await db.query(`select public.${fn}($1,$2::uuid,$3::jsonb) result`,[b.op,b.actor,JSON.stringify(b.args)])).rows[0].result);}catch(e){return Response.json({message:e.message},{status:400});}
 });
 const win=new Window({url:origin+'/#bath/'+activated.id});win.document.body.innerHTML='<div id="app"></div><dialog id="modal"></dialog><div id="notice"></div>';
 Object.assign(globalThis,{window:win,document:win.document,location:win.location,history:win.history,FormData:win.FormData,FileReader:win.FileReader,confirm:()=>true});
 const catalog=JSON.parse(await readFile(new URL('../public/catalog.json',import.meta.url),'utf8'));
 globalThis.fetch=async(path,opts)=>{if(path==='/catalog.json')return Response.json(catalog);return handle(new Request(origin+path,{...opts,headers:{...opts?.headers,origin,cookie:'__Host-pp_session='+installer}}),{APP_ORIGIN:origin,SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co',SUPABASE_SECRET_KEY:'test-secret',SUPABASE_PUBLISHABLE_KEY:'test-public'});};
 try{
  await import('../public/app.mjs?direct-bath-reload');await wait(()=>win.document.querySelector('#bath-title'),'authenticated direct editor reload');
  assert.equal(win.document.querySelector('#bath-title').value,'Reload TEST-Bad');assert.equal(win.document.querySelector('#login'),null);
  win.location.hash='home';await wait(()=>win.document.querySelector('#search'),'clean editor navigation');
 }finally{await win.happyDOM.abort();await db.close();win.close();}
});
