// Documentation defaults for explicitly identified systems; see CATALOG_SOURCES.md.
// An unspecified product/variant never inherits another system's coating.
const brochure='https://murface.com/wp-content/uploads/2025/02/Portfolio_Broschuere_WEB.pdf';
export const systemFinishes=[
 {id:'epi-corestone-sealer',manufacturer_id:'epi',manufacturer:'EPI',name:'Corestone Sealer',kinds:['finish'],source_url:'',note:'Zu Quartz R auf Vorgabe des Pilotbetriebs hinterlegt.',documents:[]},
 {id:'lamurista-goodlack-wb',manufacturer_id:'lamurista',manufacturer:'Lamurista',name:'GoodLack wb',kinds:['finish'],system_type:'2K-PU-Versiegelung',source_url:'https://lamurista.de/medien-bereich/',note:'Wasserbasierende Versiegelung. Die tatsächlich verwendete Variante und den Glanzgrad dokumentieren.',documents:[{name:'Lamurista GoodLack wb – Technisches Merkblatt',type:'Technisches Merkblatt',url:'https://lamurista.de/wp-content/uploads/2025/11/Lamurista_GoodLack_wb_TM-Neu.pdf',language:'de',verification:'pdf'}]},
 {id:'murface-nanotop',manufacturer_id:'murface',manufacturer:'Murface',name:'MF NanoTop',kinds:['finish'],system_type:'2K-PU-Finish',sheen:'Ultra matt',source_url:brochure,note:'Im Herstellerportfolio für MF Mono und MF Industrial genannt.',documents:[{name:'Murface Portfolio – Oberflächenversiegelung',type:'Produktbroschüre',url:brochure,language:'de',verification:'pdf'}]}
];
const key=value=>String(value||'').trim().toLocaleLowerCase('de').replace(/[.\s_-]+/g,'');
export const surfaceIdentity=p=>key(p?.manufacturer)+'|'+key(p?.name);
export function defaultFinish(surface){
 const maker=key(surface?.manufacturer),name=key(surface?.name);
 let id;
 if(maker==='epi'&&['quartzr','quarzr','epiquartzr','epiquarzr'].includes(name))id='epi-corestone-sealer';
 if(maker==='lamurista'&&['hardrock','hardrockpro'].includes(name))id='lamurista-goodlack-wb';
 if(maker==='murface'&&['mfmono','mono','mfindustrial','industrial'].includes(name))id='murface-nanotop';
 return systemFinishes.find(p=>p.id===id)||null;
}
export function finishSelection(surface,previous,finish={},mode=''){
 const changed=surfaceIdentity(surface)!==surfaceIdentity(previous);
 const recorded=Object.values(finish).some(v=>typeof v==='string'&&v.trim());
 // Reopening/reselecting the same system must retain edits, including explicit clearing.
 if(!changed&&(mode==='manual'||recorded))return {product:finish,mode:mode||'manual',replace:false};
 const product=defaultFinish(surface);
 if(!changed&&!product)return {product:finish,mode,replace:false};
 return {product:product||{},mode:product?'system':'',replace:true};
}
