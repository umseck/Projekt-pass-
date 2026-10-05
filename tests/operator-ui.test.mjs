import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {PGlite} from '@electric-sql/pglite';
import {createHandler} from '../server/api.mjs';
import {areaConfirmed} from '../public/bath-model.mjs';

const operator='11111111-1111-4111-8111-111111111111',member='22222222-2222-4222-8222-222222222222';
const origin='https://projektpass.example';
const wait=async(check,label='expected UI')=>{for(let i=0;i<180;i++){if(await check())return;await new Promise(resolve=>setTimeout(resolve,20));}throw Error('UI did not reach '+label);};

test('operator onboarding → first mixed bath → reusable independent standard; access and business roles remain isolated',async()=>{
 const db=new PGlite();await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
 for(const file of ['schema.sql','operator.sql','workflow.sql','customer-continuation.sql'])await db.exec(await readFile(new URL('../database/'+file,import.meta.url),'utf8'));
 await db.query('insert into pp_private.operators(user_id) values($1)',[operator]);
 let authCreates=0;
 const json=(value,status=200)=>new Response(JSON.stringify(value),{status});
 const handle=createHandler(async(url,opts)=>{
  const b=opts.body?JSON.parse(opts.body):{};
  if(url.endsWith('/admin/users')){authCreates++;return json({id:member,email:b.email});}
  if(url.includes('/token')){const id=b.email==='operator@example.test'?operator:member;return json({access_token:id,expires_in:3600,user:{id,email:b.email}});}
  if(url.endsWith('/user'))return json({id:opts.headers.Authorization.slice(7)});
  if(url.endsWith('/logout'))return json({ok:true});
  const functionName=url.endsWith('/pp_customer')?'pp_customer':url.endsWith('/pp_flow')?'pp_flow':url.endsWith('/pp_control')?'pp_control':'pp_api';
  try{return json((await db.query(`select public.${functionName}($1,$2::uuid,$3::jsonb) result`,[b.op,b.actor,JSON.stringify(b.args)])).rows[0].result);}catch(e){return json({message:e.message},400);}
 });
 const win=new Window({url:origin+'/#login'});win.document.body.innerHTML='<div id="app"></div><dialog id="modal"></dialog><div id="notice"></div>';
 const catalog=JSON.parse(await readFile(new URL('../public/catalog.json',import.meta.url),'utf8'));
 Object.assign(globalThis,{window:win,document:win.document,location:win.location,history:win.history,FormData:win.FormData,confirm:()=>true,FileReader:win.FileReader});
 let cookie='',bootstrapRequests=0;
 globalThis.fetch=async(path,opts)=>{
  if(path==='/api/bootstrap')bootstrapRequests++;
  if(path==='/catalog.json')return json(catalog);
  const r=await handle(new Request(origin+path,{...opts,headers:{...opts?.headers,origin,cookie}}),{APP_ORIGIN:origin,SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co',SUPABASE_SECRET_KEY:'test_secret',SUPABASE_PUBLISHABLE_KEY:'test_public'});
  if(r.headers.has('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return r;
 };
 const $=s=>win.document.querySelector(s),input=(s,value,event='input')=>{assert.ok($(s),'input exists: '+s);$(s).value=value;$(s).dispatchEvent(new win.Event(event,{bubbles:true}));},submit=s=>$(s).dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));
 const pickOwn=async(kind)=>{$('[data-bath-product="'+kind+'"]').click();await wait(()=>$('#catalog-picker'));$('[data-catalog-pick="own-'+kind+'-0"]').click();await wait(()=>!$('#modal').open);};
 try{
  await import('../public/app.mjs?operator-mvp-integration');await wait(()=>$('#login'));
  input('#email','operator@example.test');input('#password','Operator password 123');submit('#login');await wait(()=>$('#businesses'));
  assert.equal(bootstrapRequests,0,'login result reused');assert.ok($('a[href="#business-new"]'));
  win.location.hash='business-new';await wait(()=>$('#operator-business'));input('#name','Testbetrieb <A>');input('#email','member@example.test');submit('#operator-business');await wait(()=>$('#business-access'));
  assert.equal($('h1').textContent,'Testbetrieb <A>');assert.equal((await db.query('select count(*)::int n from pp_private.passes')).rows[0].n,20);
  submit('#business-access');await wait(()=>$('#access-link'));const link=$('#access-link').value;assert.match(link,/#access\/[a-f0-9]{64}$/);
  assert.ok($('#created-access').textContent.includes('keine E-Mail versendet'));assert.equal((await db.query('select kind from pp_private.access_invites')).rows[0].kind,'business');
  $('#logout').click();await wait(()=>$('#login'));win.location.hash=link.split('#')[1];await wait(()=>$('#access-setup'));assert.equal($('#setup-email').value,'member@example.test');assert.equal($('#setup-email').readOnly,true);
  input('#setup-password','Business password 123');input('#setup-repeat','different password');submit('#access-setup');await wait(()=>$('.form-message').textContent.includes('nicht überein'));assert.equal(authCreates,0);
  input('#setup-repeat','Business password 123');submit('#access-setup');await wait(()=>$('#settings'));assert.equal(authCreates,1);assert.ok(!win.location.href.includes('#access/'));assert.equal($('a[href="#admin"]'),null);
  assert.equal($('#trade').value,'');input('#trade','seamless','change');
  for(const [kind,maker,name] of [['surface','Testhersteller','TEST-Oberfläche'],['finish','Testhersteller','TEST-Versiegelung'],['silicone','Testhersteller','TEST-Anschlussfuge']]){
   $('[data-favorite-new="'+kind+'"]').click();input('#favorite-maker',maker);input('#favorite-name',name);$('[data-favorite-apply]').click();
  }
  submit('#settings');await wait(()=>$('#search'));assert.equal((await db.query('select profile from pp_private.companies')).rows[0].profile.trade,'seamless');
  win.location.hash='passes';await wait(()=>$('#add-passes'));$('#add-passes').click();input('#quantity','100');submit('#add-passes-form');await wait(()=>win.document.querySelectorAll('.pass-card').length===120);
  assert.equal((await db.query('select count(*)::int n from pp_private.passes')).rows[0].n,120);assert.ok($('#export-pass-links'));
  const passes=(await db.query('select id,token from pp_private.passes order by number desc limit 2')).rows;
  win.location.hash='activate/'+passes[0].id;await wait(()=>$('#activate'));input('#title','Gemischtes TEST-Bad');submit('#activate');await wait(()=>$('#bath-title'));
  input('#bath-object-label','TEST-Bad Obergeschoss');input('#bath-completed-on','2026-10-01');input('#bath-scope','Duschwand fugenlos beschichtet, bestehender Fliesenboden dokumentiert.');$('#bath-next').click();await wait(()=>$('#bath-dashboard'));
  $('[data-open-area="0"]').click();await wait(()=>$('#bath-area-name'));input('#bath-area-name','Duschwand');
  await pickOwn('surface');await pickOwn('finish');await pickOwn('silicone');input('#bath-color-surface','TEST-Sand');input('#bath-color-silicone','TEST-Anthrazit');input('#bath-batch-surface','PROJECT-ONLY-CHARGE');input('[data-role-status="waterproofing"]','unknown','change');
  // A second surface may use a different system; no whole-house model or single-product assumption.
  $('#bath-add').click();await wait(()=>$('#bath-add-area'));input('#bath-new-name','Bestehender Fliesenboden');input('#bath-new-trade','tile');submit('#bath-add-area');await wait(()=>$('#bath-area-name')?.value==='Bestehender Fliesenboden');input('#bath-position','floor','change');input('#bath-area-scope','existing','change');
  input('[data-role-status="tile"]','unknown','change');
  $('[data-bath-step="3"]').click();await wait(()=>$('#bath-release-confirm'));
  $('#bath-standard').click();await wait(()=>$('#bath-standard-status').textContent.includes('Standard gespeichert'));
  const savedStandard=(await db.query('select profile from pp_private.companies')).rows[0].profile.standards.seamless;
  assert.equal(savedStandard.surface.color,'');assert.equal(savedStandard.surface.batch,'');assert.equal(savedStandard.area_templates.length,2);assert.equal(savedStandard.area_templates[1].trade,'tile');assert.equal(savedStandard.area_templates[0].products.surface.color,'');assert.equal(savedStandard.area_templates[0].photos,undefined);assert.equal(savedStandard.area_templates[0].confirmation,undefined);
  $('[data-confirm-area="0"]').click();$('[data-confirm-area="1"]').click();$('#bath-gaps-confirm').click();$('#bath-release-confirm').click();$('#bath-next').click();await wait(()=>$('#copy-link'));
  const first=(await db.query('select * from pp_private.projects')).rows[0],original=structuredClone(first.handover_snapshot);
  assert.equal(original.content.areas.length,2);assert.equal(original.content.areas[1].trade,'tile');assert.equal(original.content.areas[1].scope,'existing');assert.equal(areaConfirmed(original.content.areas[0]),true);
  win.location.hash='activate/'+passes[1].id;await wait(()=>$('#activate'));assert.ok($('#activate').textContent.includes('Mit meinem üblichen Aufbau starten'));input('#title','Zweites TEST-Bad');submit('#activate');await wait(()=>$('#bath-title'));
  input('#bath-object-label','Zweites TEST-Objekt');input('#bath-completed-on','2026-10-02');input('#bath-scope','TEST-Aufbau übernommen.');$('#bath-next').click();await wait(()=>$('#bath-dashboard'));assert.ok($('#bath-dashboard').textContent.includes('Duschwand'));assert.ok($('#bath-dashboard').textContent.includes('Bestehender Fliesenboden'));
  $('[data-open-area="0"]').click();await wait(()=>$('#bath-color-surface'));assert.equal($('#bath-color-surface').value,'');assert.equal($('#bath-batch-surface').value,'');input('#bath-color-surface','NEUE PROJEKTFARBE');
  win.location.hash='home';await wait(()=>$('#search'));const profileAfter=(await db.query('select profile from pp_private.companies')).rows[0].profile;
  assert.deepEqual(profileAfter.standards.seamless,savedStandard,'editing copied project never changes business standard');assert.deepEqual((await db.query('select handover_snapshot from pp_private.projects where id=$1',[first.id])).rows[0].handover_snapshot,original,'future project never alters original handover');
  win.location.hash='admin';await wait(()=>$('[role="alert"]'));assert.ok($('[role="alert"]').textContent.includes('nur für den Betreiber'));
  win.location.hash='login';await wait(()=>$('#login'));input('#email','operator@example.test');input('#password','Operator password 123');submit('#login');await wait(()=>$('#businesses'));
  win.location.hash='business-new/me';await wait(()=>$('#operator-business'));input('#name','Eigener TEST-Betrieb');submit('#operator-business');await wait(()=>$('#settings'));input('#trade','seamless','change');submit('#settings');await wait(()=>$('#search'));
  assert.ok($('a[href="#admin"]'));assert.equal((await db.query('select count(*)::int n from pp_private.members where user_id=$1',[operator])).rows[0].n,1);
 }finally{await win.happyDOM.abort();await db.close();win.close();}
});
