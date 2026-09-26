import {dispatchMail,mailReady} from './mail.mjs';
import {HttpError,validate,text,email,fail} from './validation.mjs';

const COOKIE='__Host-pp_session';
const publicOps=new Set(['flow_portal','flow_reply','flow_owner_entry','scan','owner_save','access_info','access_activate']);
const controlOps=new Set(['bootstrap','passes_add','operator_list','operator_company','operator_create','operator_save','operator_invite','access_info','access_begin','access_redeem']);
const flowOps=new Set(['flow_get','flow_link','flow_portal','flow_reply','flow_participant','flow_revoke','flow_post','flow_entry','flow_owner_entry','flow_dispatch']);
const operations=new Set([...flowOps,'company_save','activate','project','preview','save','handover','owner_key','visibility','delete',...controlOps,...publicOps]);
export function randomToken(){return [...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function hash(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export const securityHeaders={
 'Cache-Control':'no-store, private','Pragma':'no-cache','Content-Type':'application/json; charset=utf-8',
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow',
 'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"
};
function cookie(value,maxAge){return `${COOKIE}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;}
function session(request){return (request.headers.get('cookie')||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);}
async function readBody(request){
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new HttpError(415,'JSON erwartet.');
 const max=6000000;const reader=request.body?.getReader();if(!reader)fail();
 let total=0,parts=[];
 while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;
   if(total>max){await reader.cancel();throw new HttpError(413,'Zu viele Fotos. Bitte weniger oder kleinere Bilder wählen.');}parts.push(value);}
 const bytes=new Uint8Array(total);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{fail();}
}
export function createHandler(fetcher=fetch){const upstream=(url,options={})=>fetcher(url,{...options,signal:AbortSignal.timeout(15000)});return async function handle(request,env,ctx){
 let extra={};
 try{
   const endpoint=new URL(request.url);const op=endpoint.pathname.split('/').pop();
   if(request.method!=='POST')throw new HttpError(405,'Bitte die Projektpass-Oberfläche verwenden.');
   // Reject cross-origin writes AND reads; no tokens in URLs or access logs.
   if(!env.APP_ORIGIN||endpoint.origin!==env.APP_ORIGIN||request.headers.get('origin')!==env.APP_ORIGIN)
     throw new HttpError(403,'Bitte PROJEKTPASS über seine eigene Adresse öffnen.');
   if(!env.SUPABASE_URL||!env.SUPABASE_SECRET_KEY||!env.SUPABASE_PUBLISHABLE_KEY)
     throw new HttpError(503,'Der Betriebszugang wird noch eingerichtet.');
   const base=env.SUPABASE_URL.replace(/\/$/,'');
   if(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(base))throw new HttpError(503,'Die Verbindung ist noch nicht eingerichtet.');
   const b=await readBody(request);
   const authHeaders={'apikey':env.SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'};
   let result;
   if(op==='login'){
     const email=text(b.email,254),password=b.password;if(!email||typeof password!=='string'||!password||password.length>256)fail();
     const r=await upstream(base+'/auth/v1/token?grant_type=password',{method:'POST',headers:authHeaders,body:JSON.stringify({email,password})});
     const data=await r.json();
     if(!r.ok||!data.access_token)throw new HttpError(401,'Anmeldung nicht möglich. Bitte E-Mail und Passwort prüfen.');
     // Check the database-backed business membership or operator role before issuing a session.
     const check=await rpc('bootstrap',data.user.id,{});
     extra['Set-Cookie']=cookie(data.access_token,Math.min(data.expires_in||3600,3600));
     result=check;
   }else if(op==='access_info'){
     const args=validate(op,b);
     result=await rpc('access_info',null,{token_hash:await hash(args.token)});
   }else if(op==='access_activate'){
     const args=validate(op,b),token_hash=await hash(args.token);
     // Validate and rate-limit the invitation before touching Supabase Auth.
     const invite=await rpc('access_begin',null,{token_hash});
     const address=email(invite.email||args.email);
     const created=await upstream(base+'/auth/v1/admin/users',{method:'POST',
       headers:{apikey:env.SUPABASE_SECRET_KEY,'Content-Type':'application/json'},
       body:JSON.stringify({email:address,password:args.password,email_confirm:true})});
     const createdData=await created.json();
     const alreadyExists=['email_exists','user_already_exists'].includes(createdData.code||createdData.error_code);
     if(!created.ok&&!alreadyExists){
       if(created.status===429)throw new HttpError(429,'Zu viele Versuche. Bitte in einigen Minuten erneut versuchen.');
       if(createdData.code==='weak_password'||createdData.error_code==='weak_password')
         throw new HttpError(400,'Bitte ein stärkeres Passwort wählen.');
       throw new HttpError(503,'Der Zugang konnte noch nicht eingerichtet werden. Bitte erneut versuchen.');
     }
     // Existing users must prove ownership with their password. Never reset it here.
     const signed=await upstream(base+'/auth/v1/token?grant_type=password',{method:'POST',headers:authHeaders,
       body:JSON.stringify({email:address,password:args.password})});
     const auth=await signed.json();
     if(!signed.ok||!auth.access_token||!auth.user?.id||String(auth.user.email||'').toLowerCase()!==address)
       throw new HttpError(401,'Anmeldung nicht möglich. Falls diese E-Mail bereits einen Zugang hat, verwenden Sie dessen Passwort.');
     await rpc('access_redeem',auth.user.id,{token_hash,email:address});
     result=await rpc('bootstrap',auth.user.id,{});
     extra['Set-Cookie']=cookie(auth.access_token,Math.min(auth.expires_in||3600,3600));
   }else if(op==='logout'){
     const access=session(request);
     extra['Set-Cookie']=cookie('',0);
     if(access)try{await upstream(base+'/auth/v1/logout',{method:'POST',headers:{...authHeaders,Authorization:'Bearer '+access}});}catch{}
     result={ok:true};
   }else{
     if(!operations.has(op)||['access_begin','access_redeem'].includes(op))throw new HttpError(404,'Nicht gefunden.');
     const args=validate(op,b);let actor=null;
     if(!publicOps.has(op)){
       const access=session(request);if(!access)throw new HttpError(401,'Bitte melden Sie sich beim Betrieb an.');
       const r=await upstream(base+'/auth/v1/user',{headers:{...authHeaders,Authorization:'Bearer '+access}});
       if(!r.ok){extra['Set-Cookie']=cookie('',0);throw new HttpError(401,'Ihre Sitzung ist abgelaufen. Bitte erneut anmelden.');}
       actor=(await r.json()).id;
       if(!actor)throw new HttpError(401,'Bitte erneut anmelden.');
     }
     let ownerKey;
     if(op==='owner_save'||op==='flow_owner_entry'){args.key_hash=await hash(args.key);delete args.key;}
     if(op==='owner_key'){ownerKey=randomToken();args.key_hash=await hash(ownerKey);}
     if(op==='operator_create')args.tokens=Array.from({length:20},()=>randomToken());
     if(op==='passes_add')args.tokens=Array.from({length:args.quantity},()=>randomToken());
     let accessToken;
     if(op==='operator_invite'){accessToken=randomToken();args.token_hash=await hash(accessToken);}
     if(flowOps.has(op)){args.origin=env.APP_ORIGIN;if(op==='flow_participant')args.access_token=randomToken();}
     result=await rpc(op,actor,args);
     if(flowOps.has(op)&&actor){result={...result,mail_configured:mailReady(env)};if(['flow_participant','flow_post','flow_dispatch'].includes(op)){if(ctx?.waitUntil&&mailReady(env)){ctx.waitUntil(dispatchMail(env,rpc,actor,args.project_id,upstream).catch(()=>{}));result.delivery={configured:true,queued:true};}else result.delivery=await dispatchMail(env,rpc,actor,args.project_id,upstream);}}
     if(ownerKey)result={...result,owner_key:ownerKey};
     if(accessToken)result={...result,access_link:env.APP_ORIGIN+'/#access/'+accessToken};
   }
   return new Response(JSON.stringify(result),{headers:{...securityHeaders,...extra}});

   async function rpc(operation,actor,args){
     const r=await upstream(base+'/rest/v1/rpc/'+(operation.startsWith('flow_')?'pp_flow':controlOps.has(operation)?'pp_control':'pp_api'),{method:'POST',headers:{apikey:env.SUPABASE_SECRET_KEY,
       'Content-Type':'application/json'},body:JSON.stringify({op:operation,actor,args})});
     const data=await r.json();
     if(!r.ok){
       const code=String(data.message||'');
       if(code.includes('PP_INVITE_INVALID')||code.includes('PP_SETUP_COMPLETE'))throw new HttpError(410,'Dieser Einrichtungslink ist abgelaufen oder bereits verwendet. Bitte melden Sie sich an oder lassen Sie einen neuen Link erstellen.');
       if(code.includes('PP_RATE_LIMIT'))throw new HttpError(429,'Zu viele Versuche. Bitte in 15 Minuten erneut versuchen.');
       if(code.includes('PP_ACCOUNT_IN_USE'))throw new HttpError(409,'Dieser Zugang gehört bereits zu einem anderen Betrieb. Bitte eine andere E-Mail-Adresse verwenden.');
       if(code.includes('PP_ALREADY_ACTIVE'))throw new HttpError(409,'Für diesen Betrieb ist bereits ein Zugang eingerichtet.');
       if(code.includes('PP_HANDOVER_LOCKED'))throw new HttpError(409,'Die Übergabe ist abgeschlossen. Bitte eine Ergänzung oder Korrektur im Scheckheft eintragen.');
       if(code.includes('PP_PARTICIPANT_EXISTS'))throw new HttpError(409,'Diese E-Mail-Adresse ist bereits beteiligt.');
       if(code.includes('PP_LIMIT'))throw new HttpError(400,'Das Limit für diesen Projektbereich ist erreicht.');
       if(code.includes('PP_NOT_HANDED_OVER'))throw new HttpError(400,'Das Scheckheft öffnet sich nach der Übergabe.');
       if(code.includes('PP_CONFLICT'))throw new HttpError(409,'Es gibt einen neueren Stand. Ihre Eingaben sind noch hier. Kopieren Sie Änderungen und laden Sie das Projekt neu.');
       if(code.includes('PP_NOT_FOUND'))throw new HttpError(404,controlOps.has(operation)?'Dieser Betrieb wurde nicht gefunden.':'Dieser Projektpass ist noch nicht übergeben oder derzeit nicht freigegeben.');
       if(code.includes('PP_FORBIDDEN'))throw new HttpError(403,'Für diesen Bereich fehlt die Berechtigung.');
       if(code.includes('PP_UNAUTHORIZED'))throw new HttpError(401,'Bitte erneut anmelden.');
       throw new HttpError(502,'Speichern derzeit nicht möglich. Ihre Eingaben bleiben hier. Bitte erneut versuchen.');
     }
     return data;
   }
 }catch(error){
   // Never log bodies, tokens, photos, passwords or upstream error details.
   return new Response(JSON.stringify({error:error instanceof HttpError?error.message:'Verbindung unterbrochen. Bitte erneut versuchen.'}),
     {status:error instanceof HttpError?error.status:503,headers:{...securityHeaders,...extra}});
 }
};}
export const handle=createHandler();
