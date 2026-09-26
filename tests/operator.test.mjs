import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createHandler,hash,randomToken} from '../server/api.mjs';
import {validate} from '../server/validation.mjs';
const operator='11111111-1111-4111-8111-111111111111',user='22222222-2222-4222-8222-222222222222',other='33333333-3333-4333-8333-333333333333';
const ca='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',cb='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
let db;
const call=async(op,args={},actor=operator)=>(await db.query('select public.pp_control($1,$2::uuid,$3::jsonb) result',[op,actor,JSON.stringify(args)])).rows[0].result;
const business=async(id,name)=>call('operator_create',{id,profile:{name,care_notes:{},favorites:{}},tokens:Array.from({length:20},randomToken)});
before(async()=>{db=new PGlite();await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');await db.exec(await readFile(new URL('../database/schema.sql',import.meta.url),'utf8'));await db.exec(await readFile(new URL('../database/operator.sql',import.meta.url),'utf8'));});
after(async()=>{await db.close();});

test('operator bootstrap is private, single-use and cannot be forged with user metadata',async()=>{
 for(const role of ['anon','authenticated']){
   await db.exec('set role '+role);await assert.rejects(()=>call('bootstrap'),/permission denied/);
   for(const table of ['operators','access_invites','pass_batches'])await assert.rejects(()=>db.query('select * from pp_private.'+table),/permission denied/);
   await db.exec('reset role');
 }
 const flags=(await db.query("select relrowsecurity from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='pp_private' and relkind='r'")).rows;
 assert.equal(flags.length,7);assert.ok(flags.every(x=>x.relrowsecurity));
 await db.query("insert into pp_private.access_invites(kind,token_hash,expires_at) values('operator',$1,now()+interval '1 day')",['a'.repeat(64)]);
 await db.exec('set role service_role');
 await assert.rejects(()=>call('bootstrap',{role:'operator'},user),/PP_FORBIDDEN/);
 assert.equal((await call('access_info',{token_hash:'a'.repeat(64)},null)).kind,'operator');
 await call('access_redeem',{token_hash:'a'.repeat(64),email:'owner@example.test'},operator);
 assert.equal((await call('bootstrap')).role,'operator');
 await assert.rejects(()=>call('access_redeem',{token_hash:'a'.repeat(64),email:'other@example.test'},other),/PP_INVITE_INVALID/);
 await db.exec('reset role');
 await db.query("insert into pp_private.access_invites(kind,token_hash,expires_at) values('operator',$1,now()+interval '1 day')",['b'.repeat(64)]);
 await db.exec('set role service_role');
 await assert.rejects(()=>call('access_info',{token_hash:'b'.repeat(64)},null),/PP_SETUP_COMPLETE/);
});

test('business creation is idempotent, role-checked and preserves optimistic editing',async()=>{
 await assert.rejects(()=>call('operator_create',{id:ca,profile:{name:'forged'},tokens:[]},user),/PP_FORBIDDEN/);
 const created=await business(ca,'Betrieb A');assert.equal(created.passes,20);
 assert.equal((await business(ca,'Do not overwrite')).profile.name,'Betrieb A');
 assert.equal((await call('operator_company',{id:ca})).passes,20);
 await business(cb,'Betrieb B');
 const saved=await call('operator_save',{id:ca,version:1,profile:{name:'Betrieb A neu'}});assert.equal(saved.version,2);
 await assert.rejects(()=>call('operator_save',{id:ca,version:1,profile:{name:'stale'}}),/PP_CONFLICT/);
 assert.equal((await call('operator_list')).companies.length,2);
});

test('invites expire, rotate, rate-limit, bind email and never move an existing membership',async()=>{
 await call('operator_invite',{id:ca,email:'member@example.test',token_hash:'c'.repeat(64),kind:'operator'});
 assert.equal((await call('access_info',{token_hash:'c'.repeat(64)},null)).kind,'business');
 await call('operator_invite',{id:ca,email:'member@example.test',token_hash:'d'.repeat(64)});
 await assert.rejects(()=>call('access_info',{token_hash:'c'.repeat(64)},null),/PP_INVITE_INVALID/);
 for(let i=0;i<5;i++)await call('access_begin',{token_hash:'d'.repeat(64)},null);
 await assert.rejects(()=>call('access_begin',{token_hash:'d'.repeat(64)},null),/PP_RATE_LIMIT/);
 await assert.rejects(()=>call('access_redeem',{token_hash:'d'.repeat(64),email:'wrong@example.test'},user),/PP_FORBIDDEN/);
 await call('access_redeem',{token_hash:'d'.repeat(64),email:'member@example.test'},user);
 assert.equal((await call('bootstrap',{},user)).role,'business');
 await assert.rejects(()=>call('operator_list',{},user),/PP_FORBIDDEN/);
 await assert.rejects(()=>call('operator_invite',{id:ca,email:'attacker@example.test',token_hash:'e'.repeat(64)}),/PP_ALREADY_ACTIVE/);
 await call('operator_invite',{id:cb,email:'member@example.test',token_hash:'e'.repeat(64)});
 await assert.rejects(()=>call('access_redeem',{token_hash:'e'.repeat(64),email:'member@example.test'},user),/PP_ACCOUNT_IN_USE/);
 assert.equal((await db.query('select company_id from pp_private.members where user_id=$1',[user])).rows[0].company_id,ca);
 await db.query("update pp_private.access_invites set expires_at=now()-interval '1 second' where company_id=$1",[cb]);
 await assert.rejects(()=>call('access_info',{token_hash:'e'.repeat(64)},null),/PP_INVITE_INVALID/);
 await call('operator_invite',{id:cb,email:'other@example.test',token_hash:'f'.repeat(64)});
 await call('access_redeem',{token_hash:'f'.repeat(64),email:'other@example.test'},other);
 assert.equal((await call('bootstrap',{},other)).company.name,'Betrieb B');
 assert.ok(!(JSON.stringify(await call('operator_list'))).includes('token_hash'));
});

test('operator can create its own workspace but cannot claim a previously existing business',async()=>{
 const tokens=Array.from({length:20},randomToken);
 await assert.rejects(()=>call('operator_create',{id:ca,profile:{name:'forged'},tokens,use_for_me:true}),/PP_FORBIDDEN/);
 const id=crypto.randomUUID(),args={id,profile:{name:'Own business'},tokens,use_for_me:true};
 assert.equal((await call('operator_create',args)).profile.onboarding_complete,false);
 assert.equal((await call('operator_create',args)).passes,20);
 assert.equal((await call('bootstrap')).company.name,'Own business');
 await assert.rejects(()=>call('operator_create',{...args,id:crypto.randomUUID(),tokens:Array.from({length:20},randomToken)}),/PP_ACCOUNT_IN_USE/);
 assert.equal((await call('operator_list')).companies.length,3);
});

test('businesses add more than 20 passes without duplicates or crossing company boundaries',async()=>{
 const id=crypto.randomUUID(),args={id,quantity:100,tokens:Array.from({length:100},randomToken)};
 assert.equal((await call('passes_add',args,user)).total,120);
 assert.equal((await call('passes_add',args,user)).total,120);
 await assert.rejects(()=>call('passes_add',args,other),/PP_FORBIDDEN/);
 assert.equal((await call('bootstrap',{},other)).passes.length,20);
 const another={id:crypto.randomUUID(),quantity:3,tokens:Array.from({length:3},randomToken)};
 assert.equal((await call('passes_add',another,user)).total,123);
 const numbers=(await call('bootstrap',{},user)).passes.map(p=>p.number);
 assert.deepEqual(numbers,Array.from({length:123},(_,i)=>i+1));
 const foreign=(await call('bootstrap',{},other)).passes[0];
 await assert.rejects(()=>db.query('select public.pp_api($1,$2::uuid,$3::jsonb)',['activate',user,JSON.stringify({pass_id:foreign.id,title:'foreign'})]),/PP_NOT_FOUND/);
 const regular=(await call('bootstrap',{},user)).passes[120];
 const project=(await db.query('select public.pp_api($1,$2::uuid,$3::jsonb) result',['activate',user,JSON.stringify({pass_id:regular.id,title:'Pass 121'})])).rows[0].result;
 assert.equal(project.pass_number,121);
 await assert.rejects(()=>db.query('select public.pp_api($1,$2::uuid,$3::jsonb)',['project',other,JSON.stringify({id:project.id})]),/PP_NOT_FOUND/);
});

const origin='https://projektpass.example';
const env={APP_ORIGIN:origin,SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_TEST_ONLY',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_TEST_ONLY'};
const request=(op,body={},extra={})=>new Request(origin+'/api/'+op,{method:'POST',headers:{origin,'Content-Type':'application/json',...extra},body:JSON.stringify(body)});
const json=(body,status=200)=>new Response(JSON.stringify(body),{status});
test('HTTP enrollment hashes links, fixes the invited email, binds verified Auth actor and keeps secrets server-side',async()=>{
 const calls=[],secret=randomToken();
 const handle=createHandler(async(url,options)=>{
   const b=options.body?JSON.parse(options.body):{};calls.push({url,options,body:b});
   if(url.endsWith('/admin/users'))return json({id:user,email:b.email});
   if(url.includes('/token'))return json({access_token:'PRIVATE_JWT',expires_in:3600,user:{id:user,email:'member@example.test'}});
   if(b.op==='access_begin')return json({kind:'business',email:'member@example.test'});
   if(b.op==='access_redeem')return json({ok:true});
   return json({role:'business',company:{name:'Betrieb'},passes:[],projects:[]});
 });
 const response=await handle(request('access_activate',{token:secret,email:'forged@example.test',password:'Good password 123',actor:operator,kind:'operator'}),env);
 assert.equal(response.status,200);
 assert.match(response.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Strict/);
 const body=await response.text();assert.ok(!body.includes('PRIVATE_JWT'));assert.ok(!body.includes(env.SUPABASE_SECRET_KEY));
 const begun=calls.find(c=>c.body.op==='access_begin');assert.equal(begun.body.args.token_hash,await hash(secret));assert.equal(begun.body.actor,null);
 const created=calls.find(c=>c.url.endsWith('/admin/users'));assert.equal(created.body.email,'member@example.test');assert.equal(created.options.headers.apikey,env.SUPABASE_SECRET_KEY);
 const redeemed=calls.find(c=>c.body.op==='access_redeem');assert.equal(redeemed.body.actor,user);assert.equal(redeemed.body.args.email,'member@example.test');
 assert.ok(!calls.filter(c=>c.url.includes('/rpc/')).some(c=>JSON.stringify(c.body).includes('Good password')));
});
test('invalid invitation cannot create Auth accounts and internal redemption is not a public endpoint',async()=>{
 let calls=0;const handle=createHandler(async()=>{calls++;return json({message:'PP_INVITE_INVALID'},400);});
 assert.equal((await handle(request('access_activate',{token:randomToken(),email:'a@example.test',password:'Good password 123'}),env)).status,410);assert.equal(calls,1);
 for(const op of ['access_begin','access_redeem'])assert.equal((await handle(request(op,{token_hash:'a'.repeat(64),actor:operator}),env)).status,404);
 assert.equal((await handle(request('operator_create',{id:ca,profile:{name:'evil'}}),env)).status,401);
 assert.throws(()=>validate('passes_add',{id:ca,quantity:101}));
 assert.deepEqual(validate('operator_invite',{id:ca,email:'A@EXAMPLE.TEST',kind:'operator',actor:operator}),{id:ca,email:'a@example.test'});
});
test('an existing email requires its current password and never triggers a password reset',async()=>{
 let redeemed=0,allowLogin=false;const calls=[];
 const handle=createHandler(async(url,options)=>{
   const b=options.body?JSON.parse(options.body):{};calls.push({url,method:options.method});
   if(b.op==='access_begin')return json({kind:'business',email:'member@example.test'});
   if(url.endsWith('/admin/users'))return json({code:'email_exists'},422);
   if(url.includes('/token'))return allowLogin?json({access_token:'jwt',user:{id:user,email:'member@example.test'}}):json({code:'invalid_credentials'},400);
   if(b.op==='access_redeem'){redeemed++;return json({ok:true});}
   return json({role:'business',company:{name:'Betrieb'},passes:[],projects:[]});
 });
 const body={token:randomToken(),password:'Existing password 123'};
 const denied=await handle(request('access_activate',body),env);assert.equal(denied.status,401);assert.equal(denied.headers.get('set-cookie'),null);assert.equal(redeemed,0);
 allowLogin=true;assert.equal((await handle(request('access_activate',body),env)).status,200);assert.equal(redeemed,1);
 assert.ok(calls.every(c=>c.method!=='PUT'&&!c.url.includes('/recover')));
});
