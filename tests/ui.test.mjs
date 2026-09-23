import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {createHandler} from '../server/api.mjs';
const actor='11111111-1111-4111-8111-111111111111',cid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',pid='33333333-3333-4333-8333-333333333333',token='a'.repeat(64);
const wait=async check=>{for(let i=0;i<100;i++){if(check())return;await new Promise(r=>setTimeout(r,20));}throw Error('UI did not reach expected state');};
test('real UI → API → SQL: login, favorites, save, handover, customer, owner and reload',async()=>{
 const db=new PGlite();await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');await db.exec(await readFile(new URL('../database/schema.sql',import.meta.url),'utf8'));
 const profile={name:'Fliesenbetrieb',email:'test@example.test',care_notes:{tile:'Pflege vom Betrieb'},favorites:{tile:[{manufacturer:'Marazzi',name:'Mystone',color:'Beige',format:'60 × 120'}],grout:[{name:'PCI Nanofug Premium',color:'Basalt'}],silicone:[{name:'OTTOSEAL S100',color:'Anthrazit'}]}};
 await db.query('insert into pp_private.companies(id,profile) values($1,$2)',[cid,JSON.stringify(profile)]);await db.query('insert into pp_private.members(user_id,company_id) values($1,$2)',[actor,cid]);await db.query('insert into pp_private.passes(id,company_id,number,token) values($1,$2,7,$3)',[pid,cid,token]);
 const origin='https://projektpass.example',env={APP_ORIGIN:origin,SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co',SUPABASE_SECRET_KEY:'secret',SUPABASE_PUBLISHABLE_KEY:'public'};
 const handle=createHandler(async(url,opts)=>{
  if(url.includes('/token'))return new Response(JSON.stringify({access_token:'jwt',expires_in:3600,user:{id:actor}}));
  if(url.endsWith('/user'))return new Response(JSON.stringify({id:actor}));
  const b=JSON.parse(opts.body);try{const r=await db.query('select public.pp_api($1,$2::uuid,$3::jsonb) result',[b.op,b.actor,JSON.stringify(b.args)]);return new Response(JSON.stringify(r.rows[0].result));}catch(e){return new Response(JSON.stringify({message:e.message}),{status:400});}
 });
 const win=new Window({url:origin+'/#login'});win.document.body.innerHTML='<div id="app"></div><dialog id="modal"></dialog><div id="notice"></div>';
 let cookie='';globalThis.window=win;globalThis.document=win.document;globalThis.location=win.location;globalThis.FormData=win.FormData;globalThis.confirm=()=>true;
 globalThis.fetch=async(path,options)=>{const r=await handle(new Request(origin+path,{...options,headers:{...options.headers,origin,cookie}}),env);if(r.headers.has('Set-Cookie'))cookie=r.headers.get('Set-Cookie').split(';')[0];return r;};
 const $=s=>win.document.querySelector(s),input=(s,value)=>{$(s).value=value;$(s).dispatchEvent(new win.Event('input',{bubbles:true}));},submit=s=>$(s).dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));
 try{
  await import('../public/app.mjs?integration');await wait(()=>$('#login'));
  input('#email','installer@example.test');input('#password','pass');submit('#login');await wait(()=>$('#search'));
  win.location.hash='activate/'+pid;await wait(()=>$('#activate'));input('#title','Bad Maier');submit('#activate');await wait(()=>$('#edit'));
  $('[data-favorite="tile:0"]').click();$('[data-favorite="grout:0"]').click();$('[data-favorite="silicone:0"]').click();
  assert.equal($('#tile-name').value,'Mystone');assert.equal($('#grout-color').value,'Basalt');
  input('#customer_name','PRIVATE CUSTOMER');input('#address','PRIVATE ADDRESS');
  $('#preview').click();await wait(()=>$('#handover'));assert.ok(!$('#app').textContent.includes('PRIVATE ADDRESS'));assert.ok(!$('#app').textContent.includes('Keine Bilder'));
  $('[data-panel="joints"]').click();assert.equal($('#panel-joints').hidden,false);assert.ok($('#panel-joints').textContent.includes('Basalt'));
  $('#handover').click();await wait(()=>$('#copy-link'));assert.ok($('#app').textContent.includes('Bereit für'));
  win.location.hash='p/'+token;await wait(()=>$('#owner-edit'));
  assert.ok(!$('#app').textContent.includes('PRIVATE CUSTOMER'));assert.equal($('#handover'),null);
  const row=(await db.query('select id,version from pp_private.projects')).rows[0];
  const minted=await handle(new Request(origin+'/api/owner_key',{method:'POST',headers:{origin,cookie,'Content-Type':'application/json'},body:JSON.stringify({id:row.id,version:row.version})}),env);const key=(await minted.json()).owner_key;
  $('#owner-edit').click();$('#add-entry').click();input('#key',key);input('#owner-company-0','Huber Sanitär');input('#owner-name-0-0','Grohe Armatur');submit('#owner');await wait(()=>!$('#modal').open);
  assert.ok($('#app').textContent.includes('Grohe Armatur'));assert.ok($('#app').textContent.includes('Von Ihnen ergänzt'));
  assert.equal((await db.query('select content from pp_private.projects')).rows[0].content.tile.name,'Mystone');
  win.location.hash='login';await wait(()=>$('#login'));win.location.hash='p/'+token;await wait(()=>$('#owner-edit'));assert.ok($('#app').textContent.includes('Grohe Armatur'));
  $('#help').click();assert.ok($('#modal').textContent.includes('E-Mail-Programm'));assert.ok(!$('#modal').textContent.includes('erfolgreich versendet'));
 }finally{await win.happyDOM.abort();await db.close();win.close();}
});
