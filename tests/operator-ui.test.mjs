import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {PGlite} from '@electric-sql/pglite';
import {createHandler} from '../server/api.mjs';
const operator='11111111-1111-4111-8111-111111111111',member='22222222-2222-4222-8222-222222222222';
const origin='https://projektpass.example';
const wait=async check=>{for(let i=0;i<150;i++){if(check())return;await new Promise(resolve=>setTimeout(resolve,20));}throw Error('UI did not reach expected state');};
test('operator UI creates a business, hands off a one-time link, and the business enrolls and adds passes',async()=>{
 const db=new PGlite();await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
 await db.exec(await readFile(new URL('../database/schema.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../database/operator.sql',import.meta.url),'utf8'));
 await db.query('insert into pp_private.operators(user_id) values($1)',[operator]);
 let authCreates=0;
 const json=(value,status=200)=>new Response(JSON.stringify(value),{status});
 const handle=createHandler(async(url,opts)=>{
   const b=opts.body?JSON.parse(opts.body):{};
   if(url.endsWith('/admin/users')){authCreates++;return json({id:member,email:b.email});}
   if(url.includes('/token')){const id=b.email==='owner@example.test'?operator:member;return json({access_token:id,expires_in:3600,user:{id,email:b.email}});}
   if(url.endsWith('/user'))return json({id:opts.headers.Authorization.slice(7)});
   if(url.endsWith('/logout'))return json({ok:true});
   const functionName=url.endsWith('/pp_control')?'pp_control':'pp_api';
   try{return json((await db.query(`select public.${functionName}($1,$2::uuid,$3::jsonb) result`,[b.op,b.actor,JSON.stringify(b.args)])).rows[0].result);}
   catch(e){return json({message:e.message},400);}
 });
 const win=new Window({url:origin+'/#login'});win.document.body.innerHTML='<div id="app"></div><dialog id="modal"></dialog><div id="notice"></div>';
 globalThis.window=win;globalThis.document=win.document;globalThis.location=win.location;globalThis.history=win.history;globalThis.FormData=win.FormData;globalThis.confirm=()=>true;
 let cookie='';globalThis.fetch=async(path,opts)=>{const r=await handle(new Request(origin+path,{...opts,headers:{...opts.headers,origin,cookie}}),{APP_ORIGIN:origin,SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co',SUPABASE_SECRET_KEY:'test_secret',SUPABASE_PUBLISHABLE_KEY:'test_public'});if(r.headers.has('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return r;};
 const $=s=>win.document.querySelector(s),input=(s,value)=>{$(s).value=value;$(s).dispatchEvent(new win.Event('input',{bubbles:true}));},submit=s=>$(s).dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));
 try{
   await import('../public/app.mjs?operator-integration');await wait(()=>$('#login'));
   input('#email','owner@example.test');input('#password','Owner password 123');submit('#login');await wait(()=>$('#businesses'));
   assert.ok($('#app').textContent.includes('Betreiberverwaltung'));assert.ok($('a[href="#business-new"]'));
   win.location.hash='business-new';await wait(()=>$('#operator-business'));
   input('#name','Testbetrieb <A>');input('#email','member@example.test');submit('#operator-business');
   await wait(()=>$('#business-access'));
   assert.equal($('h1').textContent,'Testbetrieb <A>');assert.equal((await db.query('select count(*)::int n from pp_private.passes')).rows[0].n,20);
   submit('#business-access');await wait(()=>$('#access-link'));
   const link=$('#access-link').value;assert.match(link,/#access\/[a-f0-9]{64}$/);
   assert.ok($('#created-access').textContent.includes('keine E-Mail versendet'));
   assert.equal((await db.query('select kind from pp_private.access_invites')).rows[0].kind,'business');
   $('#logout').click();await wait(()=>$('#login'));
   win.location.hash=link.split('#')[1];await wait(()=>$('#access-setup'));
   assert.equal($('#setup-email').value,'member@example.test');assert.equal($('#setup-email').readOnly,true);
   input('#setup-password','Business password 123');input('#setup-repeat','different password');submit('#access-setup');
   await wait(()=>$('.form-message').textContent.includes('nicht überein'));assert.equal(authCreates,0);
   input('#setup-repeat','Business password 123');submit('#access-setup');await wait(()=>$('#search'));
   assert.equal(authCreates,1);assert.ok(!win.location.href.includes('#access/'));assert.equal($('a[href="#admin"]'),null);
   assert.ok($('#app').textContent.includes('Testbetrieb <A>'));
   win.location.hash='passes';await wait(()=>$('#add-passes'));
   $('#add-passes').click();input('#quantity','100');submit('#add-passes-form');
   await wait(()=>win.document.querySelectorAll('.pass-card').length===120);
   assert.ok($('#export-pass-links'));assert.equal((await db.query('select count(*)::int n from pp_private.passes')).rows[0].n,120);
   win.location.hash='admin';await wait(()=>$('[role=alert]'));
   assert.ok($('[role=alert]').textContent.includes('nur für den Betreiber'));
 }finally{await win.happyDOM.abort();await db.close();win.close();}
});
