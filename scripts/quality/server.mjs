// Loopback-only QA harness: REAL application handler + PostgreSQL, SYNTHETIC Auth.
// Never deploy this process or use production accounts/secrets in it.
import https from 'node:https';
import path from 'node:path';
import {readFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {PGlite} from '@electric-sql/pglite';
import {createHandler} from '../../server/api.mjs';
import {makeFixture,demoCompany} from '../../public/bad/fixtures.mjs';
import {createStandard,newDraft,id,clone} from '../../public/bad/model.mjs';
import {runBad} from '../../server/bad/service.mjs';
import {validateBad} from '../../server/bad/validation.mjs';
const root=path.resolve(import.meta.dirname,'../..'),out=path.join(root,'qa/quality');await mkdir(out,{recursive:true});
execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',out+'/key.pem','-out',out+'/cert.pem','-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
const db=new PGlite();await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');for(const f of ['schema.sql','operator.sql','workflow.sql','bad_v2.sql'])await db.exec(await readFile(root+'/database/'+f,'utf8'));
const owner='11111111-1111-4111-8111-111111111111',foreign='22222222-2222-4222-8222-222222222222',cid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',otherCid='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const assets=JSON.parse(await readFile(root+'/public/bad/test-assets.json','utf8'));
const company={...demoCompany,name:'QA TESTBETRIEB ÄÖÜ – keine reale Baustelle',contact:'QA Verantwortlicher',email:'qa@example.invalid',logo:assets.photos[0],onboarding_complete:true};
for(const [c,a] of [[cid,owner],[otherCid,foreign]]){await db.query('insert into pp_private.companies(id,profile) values($1,$2)',[c,JSON.stringify(company)]);await db.query('insert into pp_private.members(user_id,company_id) values($1,$2)',[a,c]);}
const standards=[['seamless',0],['tile',0],['mixed',2]].map(([k,i])=>{const d=makeFixture(k),s=createStandard(d,d.areas[i].id,'QA '+k);return s;});
for(const s of standards)await db.query('insert into pp_private.bad_standards(id,company_id,data) values($1,$2,$3)',[s.id,cid,JSON.stringify(s)]);
const config={projects:[],standards:standards.map(s=>({id:s.id,name:s.name})),owner,foreign};
for(const [i,kind] of ['seamless','tile','mixed'].entries()){
 const p=id(),pass=id(),token=(id()+id()).replaceAll('-','');const source=makeFixture(kind),d=newDraft({title:'QA '+kind});
 d.areas=clone(source.areas);d.sections=clone(source.sections);d.scopes=clone(source.scopes);d.scopes.forEach(s=>{if(s.kind==='own')s.kind='unknown';});
 d.project={...source.project,title:'QA '+kind};d.internal_notes=clone(source.internal_notes);
 await db.query('insert into pp_private.passes(id,company_id,number,token) values($1,$2,$3,$4)',[pass,cid,i+1,token]);await db.query('insert into pp_private.projects(id,company_id,pass_id,title,company_snapshot) values($1,$2,$3,$4,$5)',[p,cid,pass,d.project.title,JSON.stringify(company)]);
 await db.query('insert into pp_private.bad_drafts(project_id,company_id,data) values($1,$2,$3)',[p,cid,JSON.stringify(d)]);config.projects.push({id:p,token,kind,areas:d.areas});
}
let origin;const calls=[];
const fetcher=async(url,opts={})=>{const b=opts.body?JSON.parse(opts.body):{};
 if(url.includes('/token'))return b.password==='QA-local-only'?Response.json({access_token:b.email==='foreign@example.test'?foreign:owner,expires_in:3600,user:{id:b.email==='foreign@example.test'?foreign:owner}}):Response.json({error:'invalid'},{status:401});
 if(url.endsWith('/user')){const actor=opts.headers.Authorization?.slice(7);return [owner,foreign].includes(actor)?Response.json({id:actor}):Response.json({error:'expired'},{status:401});}
 if(url.endsWith('/logout'))return Response.json({ok:true});
 const fn=url.endsWith('/pp_bad')?'pp_bad':url.endsWith('/pp_control')?'pp_control':'pp_api';
 try{return Response.json((await db.query(`select public.${fn}($1,$2::uuid,$3::jsonb) result`,[b.op,b.actor,JSON.stringify(b.args)])).rows[0].result);}catch(e){return Response.json({message:e.message},{status:400});}
};
const handle=createHandler(fetcher),mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'};
const server=https.createServer({key:await readFile(out+'/key.pem'),cert:await readFile(out+'/cert.pem')},async(req,res)=>{
 try{const url=new URL(req.url,origin);if(url.pathname.startsWith('/api/')){const parts=[];for await(const p of req)parts.push(p);const begin=performance.now();const r=await handle(new Request(url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(parts)}),{APP_ORIGIN:origin,SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co',SUPABASE_SECRET_KEY:'QA_ONLY',SUPABASE_PUBLISHABLE_KEY:'QA_ONLY'});const bytes=Buffer.from(await r.arrayBuffer());calls.push({operation:url.pathname,status:r.status,ms:Math.round(performance.now()-begin),bytes:bytes.length});res.writeHead(r.status,Object.fromEntries(r.headers));res.end(bytes);return;}
 if(url.pathname==='/__qa/config'||url.pathname==='/__qa/stats'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(url.pathname.endsWith('config')?config:calls));return;}
 let file=path.resolve(root,'public',url.pathname==='/'?'index.html':decodeURIComponent(url.pathname).slice(1));if(!file.startsWith(root+'/public/'))throw Error();const bytes=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found');}
});server.listen(0,'127.0.0.1',()=>{origin='https://127.0.0.1:'+server.address().port;console.log(JSON.stringify({origin}));});process.on('SIGTERM',async()=>{server.close();await db.close();process.exit(0);});
