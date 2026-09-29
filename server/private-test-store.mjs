import {mkdir,open,readFile,rename,chmod} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {HttpError,fail,text,uuid,validate,company as cleanCompany,content as cleanContent} from './validation.mjs';
import {newArea,areaIssues,bathKinds,replaceProduct} from '../public/bath-model.mjs';
import {customerCopy} from '../public/bath-customer.mjs';
import {callGemini,cleanSuggestions} from './gemini.mjs';

const digest=v=>createHash('sha256').update(v).digest('hex');
export class FileStore{
 constructor(dir){this.dir=dir;this.tail=Promise.resolve();}
 async init(){await mkdir(this.dir,{recursive:true,mode:0o700});await chmod(this.dir,0o700);}
 async read(){try{return JSON.parse(await readFile(join(this.dir,'state.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;return {schema:1,projects:{},inputs:{},requests:[],audit:[],company:cleanCompany({name:'Eigener Entwicklungstest',email:'test@example.invalid',trade:'seamless',standards:{},favorites:{}}),company_version:1};}}
 async transaction(fn){const previous=this.tail;let release;this.tail=new Promise(r=>release=r);await previous;
  try{const state=await this.read(),result=await fn(state),encoded=JSON.stringify(state);if(Buffer.byteLength(encoded)>80000000)throw new HttpError(413,'Der private Testspeicher ist voll (80 MB). Originaldatei bitte lokal aufbewahren.');
   const temp=join(this.dir,randomUUID()+'.tmp'),file=await open(temp,'wx',0o600);try{await file.writeFile(encoded);await file.sync();}finally{await file.close();}await rename(temp,join(this.dir,'state.json'));return result;
  }finally{release();}}
}
export function cleanInput(b){
 const files=b.files||[];if(!Array.isArray(files)||files.length>3)fail('Höchstens drei Dateien je Eingabe.');
 let total=0;const cleaned=files.map(f=>{
  const mime=text(f.mime,80),allowed=['image/jpeg','application/pdf','audio/webm','audio/m4a','audio/wav','audio/mpeg','audio/ogg'];
  if(!allowed.includes(mime)||typeof f.data!=='string'||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(f.data))fail('Bitte JPEG, PDF oder unterstützte Audiodatei wählen.');
  const bytes=Buffer.from(f.data,'base64');total+=bytes.length;if(bytes.length<3||bytes.length>2000000||total>4000000)fail('Maximal 2 MB je Datei und 4 MB je Eingabe.');
  const hex=bytes.subarray(0,12).toString('hex'),ascii=bytes.subarray(0,12).toString('ascii');
  const ok=mime==='image/jpeg'?hex.startsWith('ffd8ff'):mime==='application/pdf'?ascii.startsWith('%PDF-'):mime==='audio/webm'?hex.startsWith('1a45dfa3'):mime==='audio/ogg'?ascii.startsWith('OggS'):mime==='audio/wav'?ascii.startsWith('RIFF')&&ascii.endsWith('WAVE'):mime==='audio/m4a'?ascii.slice(4,8)==='ftyp':ascii.startsWith('ID3')||hex.startsWith('fff');
  if(!ok)fail('Dateiinhalt passt nicht zum gewählten Format.');
  return {name:text(f.name,160),mime,data:f.data};
 });
 const value={text:text(b.text,5000),files:cleaned,internal:b.internal===true};if(!value.text&&!files.length)fail('Bitte eine Nachricht oder Datei ergänzen.');
 return value;
}
const getProject=(s,id)=>{const p=s.projects[uuid(id)];if(!p)throw new HttpError(404,'Testprojekt nicht gefunden.');return p;};
const editable=p=>{if(p.status==='handed_over')throw new HttpError(409,'Übergebenes Testprojekt ist geschützt. Bitte neues Testprojekt anlegen.');};
const checkVersion=(p,version)=>{if(p.version!==version)throw new HttpError(409,'Der Badaufbau wurde inzwischen geändert. Vorschlag erneut prüfen und aktuellen Stand laden.');};
const audit=(s,event)=>{s.audit.push({id:randomUUID(),at:new Date().toISOString(),...event});};
export function createTestService(store,env,{fetcher=fetch}={}){
 return async function service(op,b={}){
  if(op==='process'){
   const job=await store.transaction(s=>{
    const p=getProject(s,b.project_id);editable(p);const input=s.inputs[uuid(b.input_id)];if(!input||input.project_id!==p.id)throw new HttpError(404,'Eingabe nicht gefunden.');
    if(input.internal)throw new HttpError(403,'Interne Notizen werden nicht an Gemini übertragen.');
    if(input.state==='processing'&&Date.now()-Date.parse(input.started_at)<60000)throw new HttpError(409,'Diese Eingabe wird bereits verarbeitet.');
    if(['review','accepted','rejected'].includes(input.state))throw new HttpError(409,'Diese Eingabe wurde bereits verarbeitet.');
    if(input.attempts>=3)throw new HttpError(429,'Drei Versuche erreicht. Original bleibt gespeichert; bitte manuell übernehmen.');
    if(env.PP_AI_ENABLED!=='true'||!env.GEMINI_API_KEY||env.PP_FREE_PROJECT_CONFIRMED!=='true')throw new HttpError(503,'Gemini ist noch nicht freigeschaltet. Original gespeichert; Schlüssel und Gratis-Testprojekt serverseitig konfigurieren.');
    const now=Date.now(),today=new Date().toISOString().slice(0,10),daily=s.requests.filter(r=>r.at.startsWith(today));
    if(daily.length>=20||s.requests.some(r=>now-Date.parse(r.at)<15000))throw new HttpError(429,'Testlimit erreicht (20 Aufrufe/Tag, 15 Sekunden Abstand). Original gespeichert; später erneut starten.');
    const id=randomUUID();s.requests.push({id,at:new Date().toISOString(),model:env.GEMINI_MODEL||'gemini-3.5-flash-lite',state:'started'});
    input.state='processing';input.attempts++;input.started_at=new Date().toISOString();input.error='';input.run_id=id;input.base_version=p.version;
    return {input:structuredClone(input),project:structuredClone(p),id};
   });
   let result,error;try{result=await callGemini({env,input:job.input,project:job.project,fetcher});}catch(e){error=e instanceof HttpError?e:new HttpError(503,'Verarbeitung unterbrochen. Original gespeichert.');}
   return store.transaction(s=>{const input=s.inputs[job.input.id],request=s.requests.find(r=>r.id===job.id);if(input.run_id!==job.id)throw new HttpError(409,'Verarbeitung wurde bereits neu gestartet.');
    if(error){input.state='error';input.error=error.message;request.state='error';request.status=error.status;request.elapsed_ms=Date.now()-Date.parse(input.started_at);}
    else{input.state='review';input.result=result;input.error='';request.state='completed';Object.assign(request,result.metrics);}
    return {input:structuredClone(input)};
   });
  }
  return store.transaction(s=>{
   if(op==='status')return {ai_enabled:env.PP_AI_ENABLED==='true',key_configured:Boolean(env.GEMINI_API_KEY),free_project_confirmed:env.PP_FREE_PROJECT_CONFIRMED==='true',model:env.GEMINI_MODEL||'gemini-3.5-flash-lite',projects:Object.values(s.projects).map(p=>({id:p.id,title:p.title,status:p.status})),company:s.company,company_version:s.company_version,requests:s.requests};
   if(op==='create'){
    if(Object.keys(s.projects).length>=20)fail('Bis zu 20 private Testbäder.');
    const trade=b.trade==='tile'?'tile':'seamless',standard=b.use_standard?s.company.standards[trade]:null;
    const templates=standard?.area_templates?.length?standard.area_templates:[{name:'Wand',position:'walls',trade,products:standard||{}},{name:'Boden',position:'floor',trade,products:standard||{}}];
    const p={id:randomUUID(),title:text(b.title,150)||'Mein Testbad',pass_number:Object.keys(s.projects).length+1,version:1,status:'draft',internal:{},company:structuredClone(s.company),content:cleanContent({trade,areas:templates.map(t=>newArea(t.trade,t.products,t.name,t.position))})};s.projects[p.id]=p;return p;
   }
   if(op==='company_save'){if(b.version!==s.company_version)throw new HttpError(409,'Betriebsstandard wurde geändert.');s.company=cleanCompany(b.profile);s.company_version++;return {company:s.company,company_version:s.company_version};}
   const p=getProject(s,b.project_id||b.id);
   if(op==='project')return structuredClone(p);
   if(op==='inputs')return {inputs:Object.values(s.inputs).filter(i=>i.project_id===p.id),version:p.version};
   if(op==='customer')return {copy:customerCopy(p.snapshot||p),project:customerProject(p)};
   if(op==='save'){
    editable(p);checkVersion(p,b.version);const args=validate('save',b);audit(s,{type:'manual_change',project_id:p.id,from_version:p.version,before:structuredClone(p.content)});Object.assign(p,args,{version:p.version+1});return structuredClone(p);
   }
   if(op==='handover'){
    editable(p);checkVersion(p,b.version);const issues=p.content.areas.flatMap(areaIssues);if(issues.length)fail(issues.join(' · '));
    p.status='handed_over';p.handed_over_at=new Date().toISOString();p.handover_snapshot={company:structuredClone(s.company),handed_over_at:p.handed_over_at};p.version++;p.snapshot=customerProject(p);audit(s,{type:'handover',project_id:p.id,version:p.version});return structuredClone(p);
   }
   editable(p);
   if(op==='submit'){
    const value=cleanInput(b),fingerprint=digest(JSON.stringify([p.id,value.text,value.internal,value.files.map(f=>[f.mime,f.data])]));
    const duplicate=Object.values(s.inputs).find(i=>i.fingerprint===fingerprint);if(duplicate)return {input:duplicate,duplicate:true};
    if(Object.values(s.inputs).filter(i=>i.project_id===p.id).length>=60)fail('Bis zu 60 Eingaben je Testbad.');
    const input={...value,id:randomUUID(),project_id:p.id,fingerprint,created_at:new Date().toISOString(),state:value.internal?'internal':'saved',attempts:0,error:''};s.inputs[input.id]=input;return {input,duplicate:false};
   }
   const input=s.inputs[uuid(b.input_id)];if(!input||input.project_id!==p.id)throw new HttpError(404,'Eingabe nicht gefunden.');
   if(op==='reject'){if(input.state!=='review')fail('Kein offener Vorschlag.');input.state='rejected';audit(s,{type:'reject',project_id:p.id,input_id:input.id});return {ok:true};}
   if(op==='accept'){
    if(input.internal||!['review','saved','error'].includes(input.state))fail('Eingabe kann nicht übernommen werden.');
    checkVersion(p,b.version);if(b.confirm!==true)fail('Bitte Änderungen ausdrücklich bestätigen.');
    // Human-edited values use the same narrow validator. No arbitrary JSON paths.
    const reviewed=cleanSuggestions({question:'',suggestions:b.suggestions},p,input);if(!reviewed.suggestions.length)fail('Bitte mindestens einen Vorschlag wählen.');
    const next=structuredClone(p.content),before=structuredClone(p.content);const created=new Map();
    for(const v of reviewed.suggestions){
     let targets=v.area_ids.map(id=>next.areas.find(a=>a.id===id));
     if(!targets.length&&v.new_area){const name=v.new_area.toLocaleLowerCase('de');let a=created.get(name)||next.areas.find(a=>a.name.toLocaleLowerCase('de')===name);
      if(!a){a=newArea(v.material_kind==='tile'||v.material_kind==='adhesive'||v.material_kind==='grout'?'tile':next.trade,{},v.new_area,v.position);next.areas.push(a);created.set(name,a);}targets=[a];}
     if(!targets.length)fail('Bitte eine betroffene Fläche auswählen oder benennen.');
     for(const a of targets){
      if(v.type==='material'){
       if(!bathKinds[a.trade].includes(v.material_kind))fail('Material passt nicht zum Gewerk dieser Fläche. Bitte eine passende neue Teilfläche anlegen.');
       const old=a.products[v.material_kind]||{},fields=Object.fromEntries(Object.entries(v.values).filter(([,value])=>value));
       if(!Object.keys(fields).length)fail('Keine lesbare Materialangabe. Bitte manuell ergänzen.');
       const identityChanged=['manufacturer','name','article_number'].some(k=>fields[k]&&fields[k]!==old[k]);
       const product=identityChanged?{...fields,documents:[]}: {...old,...fields};
       if(!product.name)fail('Bitte den Produktnamen ergänzen.');replaceProduct(a,v.material_kind,product);a.care={...a.care,confirmed:false};
       if(v.material_kind==='surface'&&identityChanged)a.products.finish={};
      }else if(v.type==='spares'){if(!v.text)fail('Reserveangabe fehlt.');a.spares=v.text;}
      else if(v.type==='documentation'){if(!v.text)fail('Notiz fehlt.');a.note=[a.note,v.text].filter(Boolean).join('\n');}
      else if(v.type==='photo'){const f=input.files[v.file_index];a.photos.push(`data:${f.mime};base64,${f.data}`);}
      else if(v.type==='document'){if(!a.products[v.material_kind]?.name)fail('PDF bitte einem dokumentierten Produkt zuordnen.');const f=input.files[v.file_index];if(Buffer.from(f.data,'base64').length>1000000)fail('Kunden-PDF darf höchstens 1 MB groß sein.');(a.products[v.material_kind].documents||=[]).push({name:f.name,type:'PDF',data:`data:${f.mime};base64,${f.data}`,url:'',source:'Vom Betrieb ausdrücklich zugeordnet',document_date:''});}
      a.confirmation='';
     }
    }
    const clean=cleanContent(next);if(Buffer.byteLength(JSON.stringify(clean))>5500000)fail('Kundeninhalt ist zu groß. Weniger Dateien freigeben.');
    p.content=clean;p.version++;input.state='accepted';input.confirmed_at=new Date().toISOString();input.confirmed_suggestions=reviewed.suggestions;
    audit(s,{type:'confirm',project_id:p.id,input_id:input.id,version:p.version,before,confirmed:reviewed.suggestions});return {project:structuredClone(p),input:structuredClone(input)};
   }
   throw new HttpError(404,'Unbekannte Testaktion.');
  });
 };
}
// Original uploads, AI proposals, private notes and audit history never enter this projection.
export function customerProject(p){return {id:p.id,title:p.title,pass_number:p.pass_number,status:p.status,handed_over_at:p.handed_over_at,company:structuredClone(p.company),handover_snapshot:structuredClone(p.handover_snapshot),content:structuredClone(p.content),owner_additions:[],journal:[]};}
