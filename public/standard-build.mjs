import {hasProduct} from './ui.mjs';
import {surfaceIdentity} from './system-finish.mjs';
// Only fill missing product slots. A standard never overwrites this project's details.
export function missingStandardProducts(current,standard,trade){
 if(!standard)return [];
 return trade.products.filter(kind=>{
  if(hasProduct(current[kind])||!hasProduct(standard[kind]))return false;
  if(kind==='finish')return current.finish_selection!=='manual'&&(!hasProduct(current.surface)||surfaceIdentity(current.surface)===surfaceIdentity(standard.surface));
  return true;
 }).map(kind=>[kind,{...standard[kind],color:'',batch:'',label_photo:''}]);
}
