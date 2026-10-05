import {bathEditor} from './bath-editor.mjs';
import {newArea,materialBasis,areaIssues} from './bath-model.mjs';
import {esc} from './ui.mjs';

// An isolated trial: all persistence is tab-scoped and contains fiktive Testdaten.
// No API endpoint, Supabase session, production token or real account is used.
export const TRIAL_STORAGE_KEY='projektpass-fiktives-testbad-v3';
const clone=value=>structuredClone(value);
const companyCopy=company=>Object.fromEntries(['name','contact','email','phone','website','logo'].filter(k=>company?.[k]!==undefined).map(k=>[k,clone(company[k])]));
const business={name:'Musterbetrieb · fiktive Testdaten',contact:'Mustermeister',email:'musterbetrieb@example.test',phone:'',website:'',trade:'seamless',standards:{
 seamless:{surface:{manufacturer:'EPI',name:'Quartz R'},finish:{manufacturer:'EPI',name:'Corestone Sealer'},waterproofing:{manufacturer:'PCI',name:'Seccoral 1K'},silicone:{manufacturer:'OTTO',name:'OTTOSEAL S 100'}},
 tile:{tile:{manufacturer:'Fiktiver Hersteller',name:'Musterfliese'},adhesive:{manufacturer:'Fiktiver Hersteller',name:'Musterkleber'},grout:{manufacturer:'Fiktiver Hersteller',name:'Musterfuge'},waterproofing:{manufacturer:'PCI',name:'Seccoral 1K'},silicone:{manufacturer:'OTTO',name:'OTTOSEAL S 100'}}
}};
function failure(message,status=400){const error=Error(message);error.status=status;throw error;}
export function createTrial(storage,{now=()=>new Date().toISOString(),token=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('')}={}){
 let state;
 try{state=JSON.parse(storage.getItem(TRIAL_STORAGE_KEY)||'null');}catch{}
 if(state?.format!=='fiktives-projektpass-testbad-v3')state={format:'fiktives-projektpass-testbad-v3',mode:'business',projects:[],activeId:'',company:clone(business),companyVersion:1,ownerEmail:'musterkunde@example.test',invites:[]};
 const persist=()=>{try{storage.setItem(TRIAL_STORAGE_KEY,JSON.stringify(state));}catch{failure('Der Browser konnte dieses Testbad nicht speichern. Bitte weniger Fotos/PDFs wählen oder die Testdaten zurücksetzen.',507);}};
 const find=id=>{const p=state.projects.find(p=>p.id===id);if(!p)failure('Dieses fiktive Testbad wurde nicht gefunden.',404);return p;};
 const active=()=>find(state.activeId);
 const permission=role=>{if(state.mode!==role)failure('In dieser Testansicht fehlt die Berechtigung. Bitte die passende Rolle wählen.',403);};
 const safe=(p,withAdditions=false)=>{
  const original=p.handover_snapshot;
  const out={id:p.id,title:original?.title||p.title,pass_number:p.pass_number,status:p.status,version:p.version,activated_at:p.activated_at,handed_over_at:p.handed_over_at||'',company:companyCopy(original?.company||state.company),content:clone(original?.content||p.content),handover_snapshot:original?clone(original):null};
  if(withAdditions){out.additions=clone(p.additions||[]);out.permissions={can_add:state.mode==='customer',can_transfer:state.mode==='customer'};out.token=p.token;out.current_owner_email=state.ownerEmail;}
  return out;
 };
 const list=()=>({role:'customer',projects:state.projects.filter(p=>p.status==='handed_over').map(p=>({id:p.id,title:p.title,pass_number:p.pass_number,handed_over_at:p.handed_over_at}))});
 const create=(trade='seamless',prepared=false)=>{
  if(state.projects.length>=8)failure('Bis zu acht fiktive Testbäder pro Tab. Bitte Testdaten zurücksetzen.',400);
  const id=crypto.randomUUID(),p={id,version:1,title:prepared?'Fiktives Musterbad · Fliesen & fugenlos':'Mein fiktives Testbad',pass_number:state.projects.length+1,status:'draft',company:clone(state.company),internal:{customer_name:'Fiktiver Testkunde',address:''},activated_at:now(),token:token(),additions:[],content:{trade,...(prepared?{project:{object_label:'Fiktive Musterwohnung · Bad',completed_on:now().slice(0,10),scope:'Fiktive Testleistung: dokumentierte Oberflächen im Badezimmer.'}}:{}),areas:[newArea(trade,prepared?state.company.standards[trade]:{},trade==='tile'?'Fliesenboden':'Duschwand',trade==='tile'?'floor':'walls')]}};
  if(prepared){
   const wall=p.content.areas[0];wall.products.surface.color='Canvas';wall.products.silicone.color='Fiktiver Testfarbton';wall.spares='Fiktive Materialreserve · beschrifteter Musterbehälter im Abstellraum';
   const floor=newArea('tile',state.company.standards.tile,'Fliesenboden','floor');floor.products.tile.color='Fiktiv · Sand';floor.products.tile.format='60 × 60 cm · Test';floor.products.grout.color='Fiktiv · Basalt';floor.products.silicone.color='Fiktiv · Grau';floor.spares='Drei fiktive Musterfliesen · Abstellraum';p.content.areas.push(floor);
   for(const a of p.content.areas){a.care={text:'Fiktiver Testinhalt: Hier steht später die bestätigte Pflegeanleitung. Dies ist keine fachliche Pflegeempfehlung.',source:'Fiktiver Musterbetrieb · keine reale Pflegequelle',document_date:now().slice(0,10),url:'',basis:materialBasis(a),confirmed:true};a.confirmation='';}
  }
  const before=clone(state);state.projects.push(p);state.activeId=id;state.mode='business';try{persist();}catch(error){state=before;throw error;}return clone(p);
 };
 const mutate=fn=>{const before=clone(state);try{const out=fn();persist();return clone(out);}catch(error){state=before;throw error;}};
 const api=async(op,args={})=>{
  if(op==='bootstrap'){permission('business');return {company:clone(state.company),company_version:state.companyVersion,projects:clone(state.projects),passes:[]};}
  if(op==='project'){permission('business');return clone(find(args.id));}
  if(op==='preview'){permission('business');return safe(find(args.id));}
  if(op==='save'){permission('business');return mutate(()=>{const p=find(args.id);if(p.handover_snapshot)failure('Die Originalübergabe bleibt erhalten und kann nicht überschrieben werden.',409);if(args.version!==p.version)failure('Es gibt einen neueren Teststand. Bitte neu laden.',409);p.title=args.title;p.content=clone(args.content);p.internal=clone(args.internal||{});p.version++;return p;});}
  if(op==='company_save'){permission('business');return mutate(()=>{if(args.version!==state.companyVersion)failure('Es gibt einen neueren Betriebsstandard.',409);state.company=clone(args.profile);state.companyVersion++;return {company:state.company,company_version:state.companyVersion};});}
  if(op==='handover'){permission('business');return mutate(()=>{const p=find(args.id);if(args.version!==p.version)failure('Es gibt einen neueren Teststand.',409);if(p.handover_snapshot)return p;const missing=p.content.areas.flatMap(areaIssues);if(missing.length)failure(missing.join(' · '));p.status='handed_over';p.handed_over_at=now();p.handover_snapshot={title:p.title,content:clone(p.content),company:companyCopy(state.company),activated_at:p.activated_at,handed_over_at:p.handed_over_at};p.version++;return p;});}
  if(op==='scan'){const p=state.projects.find(p=>p.token===args.token&&p.status==='handed_over');if(!p)failure('Dieses Testbad wurde noch nicht übergeben.',404);return safe(p);}
  if(op==='customer_bootstrap'){permission('customer');return list();}
  if(op==='customer_project'){permission('customer');const p=find(args.id);if(p.status!=='handed_over')failure('Dieses Testbad wurde noch nicht übergeben.',404);return safe(p,true);}
  if(op==='customer_add'){permission('customer');return mutate(()=>{const p=find(args.id),e=args.event||{};if(p.status!=='handed_over')failure('Erst nach der Übergabe können Ergänzungen erfasst werden.',409);if(!p.content.areas.some(a=>a.id===e.area_id))failure('Diese Fläche gehört nicht zu diesem Testbad.',403);if(!['maintenance','repair','change','photo','document'].includes(e.kind)||!/^\d{4}-\d{2}-\d{2}$/.test(e.occurred_on||''))failure('Bitte Art, Fläche und Ausführungsdatum ergänzen.');if(p.additions.some(x=>x.id===e.id))return safe(p,true);p.additions.push({id:e.id||crypto.randomUUID(),author_id:'fiktiver-kunde',author_label:'Fiktiver Testkunde',recorded_at:now(),occurred_on:e.occurred_on,kind:e.kind,area_id:e.area_id,description:e.description||'',company:e.company||'',materials:e.materials||'',material_role:e.material_role||'',effect:e.effect||'evidence',photos:clone(e.photos||[]),documents:clone(e.documents||[])});return safe(p,true);});}
  if(op==='customer_invite'||op==='customer_transfer'){permission(op==='customer_invite'?'business':'customer');return mutate(()=>{const p=find(args.id);if(p.status!=='handed_over')failure('Bitte zuerst übergeben.');const t=token(),invite={token:t,project_id:p.id,email:args.email||'musterkunde@example.test',transfer:op==='customer_transfer',expires_at:new Date(Date.parse(now())+7*86400000).toISOString()};state.invites=state.invites.filter(i=>i.project_id!==p.id);state.invites.push(invite);const link=(/^https?:/.test(globalThis.location?.origin||'')?globalThis.location.origin:'https://offline.projektpass.invalid')+'/bath-preview.html#customer-access/'+t;return {link,access_link:link,expires_at:invite.expires_at};});}
  if(op==='customer_access_info'){const i=state.invites.find(i=>i.token===args.token);if(!i)failure('Dieser fiktive Einladungslink ist abgelaufen oder bereits verwendet.',410);return {...clone(i),title:find(i.project_id).title};}
  if(op==='customer_access_activate')return mutate(()=>{const i=state.invites.find(i=>i.token===args.token);if(!i)failure('Dieser fiktive Link wurde bereits verwendet.',410);state.mode='customer';state.ownerEmail=i.email;state.activeId=i.project_id;if(i.transfer)find(i.project_id).token=token();state.invites=state.invites.filter(x=>x.token!==i.token);return {...list(),project_id:i.project_id};});
  if(op==='logout')return mutate(()=>{state.mode='public';return {ok:true};});
  failure('Diese isolierte Testansicht bietet keine echte Anmeldung oder Live-API.',404);
 };
 return {api,create,active:()=>clone(active()),snapshot:()=>clone(state),setMode:mode=>mutate(()=>{if(!['business','customer','public'].includes(mode))failure('Unbekannte Testrolle.');state.mode=mode;return state;}),setActive:id=>mutate(()=>{find(id);state.activeId=id;return state;}),reset:()=>{storage.removeItem(TRIAL_STORAGE_KEY);state={format:'fiktives-projektpass-testbad-v3',mode:'business',projects:[],activeId:'',company:clone(business),companyVersion:1,ownerEmail:'musterkunde@example.test',invites:[]};},safe};
}

export async function bootTrial({storage=window.sessionStorage,offline=false}={}){
 const trial=createTrial(storage);if(!trial.snapshot().projects.length)trial.create('seamless');
 let session,routeVersion=0,renderedHash='';
 const $=s=>document.querySelector(s),shell=html=>{$('#app').innerHTML=`<main class="wrap narrow">${html}</main>`;};
 const modal=(title,body)=>{const d=$('#modal');d.innerHTML=`<div class="dialog-head"><h2>${esc(title)}</h2><button class="close" aria-label="Schließen">×</button></div>${body}`;d.querySelector('.close').onclick=()=>d.close();if(!d.open)d.showModal();};
 const notice=message=>{$('#trial-notice').textContent=message;};
 const api=async(op,args)=>{const result=await trial.api(op,args);if(['customer_invite','customer_transfer','customer_access_activate'].includes(op))updateControls();return result;};
 const go=async route=>{const p=trial.active();if(route.startsWith('ready/')){trial.setMode('customer');location.hash='#customer/'+p.id;}else if(route.startsWith('customer/'))location.hash='#'+route;else if(route==='customer')location.hash='#customer/'+p.id;else if(route.startsWith('p/')){trial.setMode('public');location.hash='#p/'+p.token;}else location.hash='#business';await render();};
 const ctx={api,shell,modal,go,notify:notice,qrPath:'/bath-preview.html',offline};
 const updateControls=()=>{const s=trial.snapshot();$('#trial-mode').value=s.mode;$('#trial-project').innerHTML=s.projects.map(p=>`<option value="${esc(p.id)}" ${p.id===s.activeId?'selected':''}>${esc(p.title)} · ${p.status==='handed_over'?'übergeben':'Entwurf'}</option>`).join('');const inviteButton=$('#trial-accept-invite');if(inviteButton)inviteButton.hidden=!s.invites.length;$('#trial-storage').textContent='Dieses fiktive Testbad bleibt nach Neuladen in diesem Tab erhalten.';};
 async function render(){
  const run=++routeVersion;renderedHash=location.hash;session?.dispose();session=null;updateControls();notice('');
  try{
   const hash=location.hash.slice(1),p=trial.active();
   if(hash.startsWith('customer-access/')){const {mountCustomerAccess}=await import('./customer-continuation.mjs');await mountCustomerAccess(hash.split('/')[1],ctx);updateControls();return;}
   const mode=trial.snapshot().mode;
   if(mode==='business'&&p.status==='draft'){
    const s=trial.snapshot(),dashboard={company:s.company,company_version:s.companyVersion};session=await bathEditor(p.id,{...ctx,dashboard,isCurrent:()=>run===routeVersion,setDirty:()=>{}});return;
   }
   const {mountCustomerWorkspace,mountCustomerInvitation}=await import('./customer-continuation.mjs');
   if(p.status!=='handed_over'){
    shell(`<section class="hero"><span class="eyebrow">Fiktive Kundenansicht</span><h1>Noch nicht übergeben.</h1><p>Bitte in der Betriebsansicht Materialien dokumentieren, den Kundenstand prüfen und ausdrücklich übergeben.</p><button class="btn olive" id="trial-return-business">Zur Betriebsansicht</button></section>`);$('#trial-return-business').onclick=()=>switchMode('business');return;
   }
   if(mode==='customer'){const customer=await api('customer_project',{id:p.id});if(offline)delete customer.token;await mountCustomerWorkspace(customer,ctx);return;}
   const readonly=hash.startsWith('p/')?await api('scan',{token:hash.split('/')[1]}):trial.safe(p,false);
   await mountCustomerWorkspace({...readonly,permissions:{can_add:false,can_transfer:false}},{...ctx,readOnly:true});
   if(mode==='business'){
    const root=document.createElement('section');root.className='section no-print';$('.customer-dossier')?.append(root);if(!root.isConnected)$('#app main').append(root);
    root.innerHTML='<h2>Originalübergabe erhalten</h2><p>Der bestätigte Stand kann nicht überschrieben werden. Öffnen Sie die Kundenrolle, um spätere Ergänzungen getrennt festzuhalten.</p><button class="btn olive" id="trial-customer-mode">Als fiktiver Kunde weiterführen</button><div id="trial-invite"></div>';
    $('#trial-customer-mode').onclick=()=>switchMode('customer');await mountCustomerInvitation(p,ctx,$('#trial-invite'));
   }
  }catch(error){notice(error.message);shell(`<section class="hero"><h1>Testansicht konnte nicht geöffnet werden</h1><p>${esc(error.message)}</p><button class="btn light" id="trial-retry">Erneut versuchen</button></section>`);$('#trial-retry').onclick=render;}
 }
 async function switchMode(mode){try{if(session)await session.flush();trial.setMode(mode);location.hash=mode==='business'?'#business':mode==='customer'?'#customer/'+trial.active().id:'#p/'+trial.active().token;await render();}catch(error){notice(error.message);updateControls();}}
 $('#trial-accept-invite').onclick=async()=>{const invite=trial.snapshot().invites.at(-1);if(invite){location.hash='#customer-access/'+invite.token;await render();}};
 $('#trial-mode').onchange=e=>switchMode(e.target.value);
 $('#trial-project').onchange=async e=>{try{if(session)await session.flush();trial.setActive(e.target.value);location.hash='#'+trial.snapshot().mode;await render();}catch(error){notice(error.message);}};
 for(const [id,trade,prepared] of [['demo-seamless','seamless',false],['demo-tile','tile',false],['demo-ready','seamless',true]])$( '#'+id).onclick=async()=>{try{if(session)await session.flush();session?.dispose();trial.create(trade,prepared);location.hash='#business';await render();}catch(error){notice(error.message);}};
 $('#trial-reset').onclick=()=>{modal('Fiktive Testdaten zurücksetzen?', '<p>Nur die lokal gespeicherten Testbäder dieses Tabs werden gelöscht.</p><button class="btn danger wide" id="trial-confirm-reset">Testdaten zurücksetzen</button>');$('#trial-confirm-reset').onclick=async()=>{session?.dispose();trial.reset();trial.create('seamless');$('#modal').close();location.hash='#business';await render();};};
 const hashChange=async()=>{if(location.hash===renderedHash)return;try{if(session)await session.flush();await render();}catch(error){notice(error.message);}};window.addEventListener('hashchange',hashChange);await render();
 return {trial,render,dispose:()=>{session?.dispose();window.removeEventListener('hashchange',hashChange);}};
}
if(typeof document!=='undefined'&&document.documentElement.dataset.projectpassTrial==='true')bootTrial().catch(error=>{const n=document.querySelector('#trial-notice');if(n)n.textContent=error.message;});
