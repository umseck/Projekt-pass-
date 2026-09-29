import {HttpError,uuid,validate} from './validation.mjs';
import {createTestService} from './private-test-service.mjs';
import {legacyArea} from '../public/bath-model.mjs';
import {securityHeaders} from './api.mjs';

export class IntegratedStore {
 constructor(rpc,id){this.rpc=rpc;this.id=id;}
 async transaction(fn){
  const current=await this.rpc('load',{project_id:this.id});
  const p=current.project;
  if(!p.content.areas?.length){const a=legacyArea(p.content);a.id=p.id;p.content={...p.content,areas:[a]};}
  const before=p.version,originalState=JSON.stringify(current.state);
  const state={...current.state,projects:{[p.id]:p},company:p.company_snapshot||{},company_version:1};
  const result=await fn(state);
  const next=state.projects[p.id];const args={project_id:this.id,version:current.version,state};
  if(next.version!==before)args.save=validate('save',{id:p.id,version:before,title:next.title,internal:next.internal||{},content:next.content});
  delete state.projects;delete state.company;delete state.company_version;
  if(args.save||JSON.stringify(state)!==originalState)await this.rpc('commit',args);
  return result;
 }
}
export function createAIHandler(fetcher=fetch){return async(request,env)=>{
 try{
  const url=new URL(request.url),op=url.pathname.split('/').pop();
  if(request.method!=='POST'||!env.APP_ORIGIN||url.origin!==env.APP_ORIGIN||request.headers.get('origin')!==env.APP_ORIGIN)throw new HttpError(403,'Bitte Projektpass über seine eigene Adresse öffnen.');
  if(!env.SUPABASE_URL||!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(env.SUPABASE_URL)||!env.SUPABASE_PUBLISHABLE_KEY||!env.SUPABASE_SECRET_KEY)throw new HttpError(503,'Zugang noch nicht eingerichtet.');
  const token=(request.headers.get('cookie')||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('__Host-pp_session='))?.slice(18);
  if(!token)throw new HttpError(401,'Bitte im Projektpass anmelden.');
  const auth=await fetcher(env.SUPABASE_URL+'/auth/v1/user',{headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});
  if(!auth.ok)throw new HttpError(401,'Bitte erneut anmelden.');
  const actor=(await auth.json()).id;if(!actor)throw new HttpError(401,'Bitte erneut anmelden.');
  const rpc=async(operation,args={})=>{
   const response=await fetcher(env.SUPABASE_URL+'/rest/v1/rpc/pp_ai',{method:'POST',headers:{apikey:env.SUPABASE_SECRET_KEY,'Content-Type':'application/json'},body:JSON.stringify({op:operation,actor,args}),signal:AbortSignal.timeout(20000)});
   const data=await response.json();if(!response.ok){const m=String(data.message||'');throw new HttpError(m.includes('PP_CONFLICT')?409:m.includes('PP_FORBIDDEN')?403:m.includes('PP_NOT_FOUND')?404:m.includes('PP_LIMIT')?413:m.includes('PP_HANDOVER_LOCKED')?409:503,m.includes('PP_CONFLICT')?'Inzwischen geändert. Eingabe bleibt gespeichert; bitte erneut laden.':m.includes('PP_FORBIDDEN')?'KI-Test ist nur für das freigeschaltete eigene Konto verfügbar.':m.includes('PP_LIMIT')?'Der interne Testspeicher ist voll (20 MB). Die neue Eingabe bleibt lokal gespeichert.':m.includes('PP_HANDOVER_LOCKED')?'Der Übergabestand ist geschützt.':'Aktion nicht gespeichert. Bitte erneut versuchen.');}return data;
  };
  await rpc('capability');
  if(op==='capability')return Response.json({allowed:true},{headers:securityHeaders});
  if(!['status','project','inputs','submit','process','reject','accept'].includes(op))throw new HttpError(404,'Nicht gefunden.');
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw new HttpError(415,'JSON erwartet.');
  let total=0;const parts=[],reader=request.body?.getReader();if(!reader)throw new HttpError(400,'Eingabe fehlt.');
  while(true){const {value,done}=await reader.read();if(done)break;total+=value.length;if(total>6000000){await reader.cancel();throw new HttpError(413,'Eingabe zu groß.');}parts.push(value);}
  let b;try{b=JSON.parse(Buffer.concat(parts).toString());}catch{throw new HttpError(400,'Ungültige Eingabe.');}
  const id=uuid(b.project_id||b.id),store=new IntegratedStore(rpc,id);
  // Explicit developer attestation is required per processing request; never infer billing.
  const config={...env,PP_AI_ENABLED:env.PP_AI_ENABLED||'true',PP_FREE_PROJECT_CONFIRMED:b.free_project_confirmed===true?'true':'false'};
  const service=createTestService(store,config,{fetcher});
  const result=await service(op,{...b,project_id:id});
  if(op==='status')result.free_project_confirmed=false;
  return Response.json(result,{headers:securityHeaders});
 }catch(e){return Response.json({error:e instanceof HttpError?e.message:'Verarbeitung unterbrochen. Eingabe behalten und erneut versuchen.'},{status:e instanceof HttpError?e.status:503,headers:securityHeaders});}
};}
export const handleAI=createAIHandler();
