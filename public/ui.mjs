export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const num=n=>String(n).padStart(2,'0');
export function date(value,time=false){if(!value)return '';const d=new Date(value);if(!Number.isFinite(+d))return '';return d.toLocaleString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',...(time?{hour:'2-digit',minute:'2-digit'}:{})});}
export function safeLink(value){try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}}
export const hasProduct=p=>p&&['manufacturer','name','color','format','article_number','batch','label_photo'].some(k=>p[k]);
export const labelPhoto=p=>/^data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(p||'')?p:'';
export function fields(form){return Object.fromEntries(new FormData(form));}
export function field(label,name,value='',type='text',extra=''){return `<div class="field"><label for="${esc(name)}">${esc(label)}</label><input id="${esc(name)}" name="${esc(name)}" value="${esc(value)}" type="${type}" ${extra}></div>`;}
export function area(label,name,value='',extra=''){return `<div class="field"><label for="${esc(name)}">${esc(label)}</label><textarea id="${esc(name)}" name="${esc(name)}" maxlength="1000" ${extra}>${esc(value)}</textarea></div>`;}
export function compress(file){return new Promise((resolve,reject)=>{
 if(!file?.type.startsWith('image/')||file.size>25000000)return reject(Error('Bitte ein Bild bis 25 MB wählen.'));
 const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{
  try{const scale=Math.min(1,1200/img.width,1200/img.height),c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);let quality=.78,result=c.toDataURL('image/jpeg',quality);while(result.length>500000&&quality>.3){quality-=.12;result=c.toDataURL('image/jpeg',quality);}if(result.length>550000)throw Error('Dieses Foto ist zu groß. Bitte ein kleineres Bild wählen.');resolve(result);}catch(e){reject(e);}finally{URL.revokeObjectURL(url);}
 };img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Dieses Bildformat lässt sich hier nicht öffnen. Bitte JPEG oder PNG verwenden.'));};img.src=url;
});}
export function download(name,value){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);}
