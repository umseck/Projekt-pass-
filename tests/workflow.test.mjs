import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createHandler} from '../server/api.mjs';
import {dispatchMail} from '../server/mail.mjs';
import {Window} from 'happy-dom';
import {workflowPage,participantPage,ownerEntry} from '../public/workflow.mjs';
const origin='https://projektpass.example',actor='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const cid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const wait=async fn=>{for(let i=0;i<200;i++){if(fn())return;await new Promise(r=>setTimeout(r,15));}throw Error('UI state not reached');};
async function setup(){
 const db=new PGlite();await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
 for(const file of ['schema','workflow'])await db.exec(await readFile(new URL('../database/'+file+'.sql',import.meta.url),'utf8'));
 await db.query('insert into pp_private.companies(id,profile) values($1,$2)',[cid,JSON.stringify({name:'Fachbetrieb',email:'betrieb@example.test',trade:'seamless'})]);
 await db.query('insert into pp_private.members(user_id,company_id) values($1,$2)',[actor,cid]);
 const pass=(await db.query('insert into pp_private.passes(company_id,number,token) values($1,1,$2) returning id',[cid,'a'.repeat(64)])).rows[0];
 const rpc=async(op,who,args)=>(await db.query('select public.'+(op.startsWith('flow_')?'pp_flow':'pp_api')+'($1,$2::uuid,$3::jsonb) result',[op,who,JSON.stringify(args)])).rows[0].result;
 const p=await rpc('activate',actor,{pass_id:pass.id,title:'Testbad'});
 const env={APP_ORIGIN:origin,SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co',SUPABASE_SECRET_KEY:'private',SUPABASE_PUBLISHABLE_KEY:'public'};
 let sends=[];
 const handle=createHandler(async(url,opts)=>{if(url.endsWith('/user'))return Response.json({id:opts.headers.Authorization.slice(7)});if(url==='https://api.resend.com/emails'){sends.push(JSON.parse(opts.body));return Response.json({id:'sent-'+sends.length});}const b=JSON.parse(opts.body);try{return Response.json(await rpc(b.op,b.actor,b.args));}catch(e){return Response.json({message:e.message},{status:400});}});
 const request=async(op,args={},who=actor)=>{const r=await handle(new Request(origin+'/api/'+op,{method:'POST',headers:{origin,'Content-Type':'application/json',...(who?{cookie:'__Host-pp_session='+who}:{})},body:JSON.stringify(args)}),env);return {status:r.status,body:await r.json()};};
 const api=async(op,args)=>{const r=await request(op,args);if(r.status!==200)throw Error(r.body.error);return r.body;};
 return {db,rpc,p,api,request,env,sends};
}
test('workflow privacy, scoped recipients, invitation retry, revocation, frozen handover and owner journal',async()=>{
 const {db,rpc,p,request,env,sends}=await setup();
 try{
 const project_id=p.id,id=crypto.randomUUID();
 const invite=await request('flow_participant',{project_id,id,name:'Kunde',email:'kunde@example.test',role:'customer'});assert.equal(invite.status,200);assert.equal(invite.body.delivery.configured,false);assert.equal(sends.length,0);
 const token=invite.body.access_link.split('/').pop();
 const retry=await request('flow_participant',{project_id,id,name:'Kunde',email:'kunde@example.test',role:'customer'});assert.equal(retry.body.access_link,invite.body.access_link);assert.equal((await db.query('select count(*)::int n from pp_private.mail_outbox')).rows[0].n,1);
 assert.equal((await request('flow_get',{project_id},other)).status,404);
 assert.equal((await request('flow_mail_claim',{project_id})).status,404);
 assert.equal((await request('flow_portal',{token},null)).status,200);
 assert.equal((await request('scan',{token:'a'.repeat(64)},null)).status,404);
 const note=crypto.randomUUID();assert.equal((await request('flow_post',{project_id,id:note,body:'Nur Kunde',recipients:[id],notify:true})).status,200);
 await request('flow_post',{project_id,id:note,body:'Retry',recipients:[id],notify:true});
 await request('flow_post',{project_id,id:crypto.randomUUID(),body:'GEHEIM INTERN',internal:true,recipients:[id],notify:true});
 assert.equal((await request('flow_post',{project_id,id:crypto.randomUUID(),body:'Fremd',recipients:[crypto.randomUUID()]})).status,403);
 const portal=(await request('flow_portal',{token},null)).body;assert.equal(portal.messages.length,1);assert.ok(!JSON.stringify(portal).includes('GEHEIM'));assert.equal(portal.participants,undefined);
 const reply=await request('flow_reply',{token,id:crypto.randomUUID(),body:'Frage',recipients:[id],internal:true},null);assert.equal(reply.status,200);
 assert.equal((await request('flow_get',{project_id})).body.messages.length,3);
 const entry={project_id,id:crypto.randomUUID(),kind:'Wartung',title:'Kontrolle',body:'Geprüft',performed_on:'2026-09-26'};
 assert.equal((await request('flow_entry',entry)).status,400);
 let current=await rpc('save',actor,{id:p.id,version:p.version,title:'Testbad',content:{trade:'seamless',surface:{name:'Quartz R'}},internal:{name:'Privat'}});
 current=await rpc('handover',actor,{id:p.id,version:current.version});
 assert.equal(current.handover_snapshot.content.surface.name,'Quartz R');
 assert.equal((await request('save',{id:p.id,version:current.version,title:'Geändert',content:{surface:{name:'Anders'}},internal:{}})).status,409);
 assert.equal((await request('flow_entry',entry)).status,200);assert.equal((await request('flow_entry',entry)).status,200);
 const keyed=await request('owner_key',{id:p.id,version:current.version});assert.equal(keyed.status,200);
 assert.equal((await request('flow_owner_entry',{...entry,id:crypto.randomUUID(),token:'a'.repeat(64),key:'b'.repeat(64)},null)).status,403);
 assert.equal((await request('flow_owner_entry',{...entry,id:crypto.randomUUID(),token:'a'.repeat(64),key:keyed.body.owner_key},null)).status,200);
 const customer=(await request('scan',{token:'a'.repeat(64)},null)).body;assert.equal(customer.journal.length,2);assert.equal(customer.journal[0].source==='business'||customer.journal[0].source==='owner',true);assert.equal(customer.content.surface.name,'Quartz R');assert.ok(!JSON.stringify(customer).includes('GEHEIM'));assert.equal(customer.messages,undefined);
 env.RESEND_API_KEY='test';env.MAIL_FROM='Projektpass <noreply@example.test>';
 const sent=await request('flow_dispatch',{project_id});assert.equal(sent.status,200);assert.equal(sends.length,2);assert.ok(sends.every(x=>x.to.length===1));assert.ok(sends.every(x=>!x.text.includes('GEHEIM')));
 await request('flow_dispatch',{project_id});assert.equal(sends.length,2);
 await request('flow_revoke',{project_id,id});assert.equal((await request('flow_portal',{token},null)).status,404);
 const finalProject=await rpc('project',actor,{id:p.id});await rpc('delete',actor,{id:p.id,version:finalProject.version});for(const table of ['participants','messages','journal','mail_outbox'])assert.equal((await db.query('select count(*)::int n from pp_private.'+table)).rows[0].n,0);
 await db.exec('set role anon');await assert.rejects(()=>db.query('select * from pp_private.participants'),/permission denied/);await assert.rejects(()=>rpc('flow_get',actor,{project_id}),/permission denied/);
 }finally{await db.close();}
});
test('mailer records failures honestly and uses stable idempotency keys for retries',async()=>{
 let state='pending',keys=[];const job={id:crypto.randomUUID(),email:'a@example.test',subject:'Test',body:'Link'};
 const rpc=async(op,actor,args)=>{if(op==='flow_mail_claim')return state==='sent'?[]:[job];state=args.provider_id?'sent':'error';return {};};
 const env={RESEND_API_KEY:'secret',MAIL_FROM:'a@example.test',APP_ORIGIN:origin};
 assert.equal((await dispatchMail(env,rpc,actor,'p',async()=>{throw Error('offline');})).failed,1);assert.equal(state,'error');
 const fetcher=async(url,args)=>{keys.push(args.headers['Idempotency-Key']);return Response.json({id:'provider'});};
 assert.equal((await dispatchMail(env,rpc,actor,'p',fetcher)).sent,1);assert.equal((await dispatchMail(env,rpc,actor,'p',fetcher)).sent,0);assert.equal(keys[0],'projektpass-'+job.id);
});
test('real workflow UI adds participant, posts a scoped message, opens private portal and publishes journal after handover',async()=>{
 const {db,p,api,rpc}=await setup();const win=new Window({url:origin+'/#work/'+p.id});win.document.body.innerHTML='<main id="app"></main><dialog id="modal"></dialog>';
 globalThis.document=win.document;globalThis.window=win;globalThis.FormData=win.FormData;globalThis.confirm=()=>true;
 const $=(s,r=win.document)=>r.querySelector(s),input=(id,value)=>{$(id).value=value;},submit=id=>$(id).dispatchEvent(new win.Event('submit',{cancelable:true}));
 const ctx={api,isCurrent:()=>true,setDirty:()=>{},notify:()=>{},shell:html=>$('#app').innerHTML=html,
  modal:(title,html)=>{$('#modal').innerHTML='<h2>'+title+'</h2>'+html;$('#modal').showModal();},
  run:async(button,fn)=>{await fn();},bindForm:(id,fn)=>{$(id).onsubmit=e=>{e.preventDefault();fn($(id)).catch(e=>{$('.form-message',$(id)).textContent=e.message;});}}};
 try{
 await workflowPage(p.id,ctx);assert.ok($('#app').textContent.includes('Bauphase'));assert.equal($('#notify-mail').disabled,true);
 input('#participant-name','Kunde');input('#participant-email','kunde@example.test');submit('#participant-form');await wait(()=>$('#participant-link'));
 const token=$('#participant-link').value.split('/').pop();$('#modal').close();
 input('#entry-body','Abdichtung fertig');$('[name="recipient"]').checked=true;submit('#message-form');await wait(()=>$('#app').textContent.includes('Abdichtung fertig')&&!$('#entry-body').value);
 await participantPage(token,ctx);assert.ok($('#app').textContent.includes('Abdichtung fertig'));input('#entry-body','Danke');submit('#reply-form');await wait(()=>$('#app').textContent.includes('Danke')&&!$('#entry-body').value);
 const current=await rpc('project',actor,{id:p.id});await rpc('handover',actor,{id:p.id,version:current.version});await workflowPage(p.id,ctx);assert.ok($('#new-entry'));
 $('#new-entry').click();input('#entry-title','Silikon kontrolliert');input('#journal-body','Keine Auffälligkeiten');submit('#journal-form');await wait(()=>$('#app').textContent.includes('Silikon kontrolliert'));
 const customer=await rpc('scan',null,{token:'a'.repeat(64)});assert.equal(customer.journal.length,1);assert.equal(customer.journal[0].body,'Keine Auffälligkeiten');
 }finally{await win.happyDOM.abort();win.close();await db.close();}
});
