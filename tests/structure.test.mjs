import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,access} from 'node:fs/promises';
import {dirname,resolve,relative,extname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const publicRoot=resolve(root,'public');
async function files(dir){
 const entries=await readdir(dir,{withFileTypes:true});
 return (await Promise.all(entries.map(e=>e.isDirectory()?files(resolve(dir,e.name)):[resolve(dir,e.name)]))).flat();
}
function target(source,specifier){
 const path=specifier.split(/[?#]/)[0];
 return path.startsWith('/')?resolve(publicRoot,'.'+path):resolve(dirname(source),path);
}
function imports(source){
 return [...source.matchAll(/(?:from\s*|import\s*\(\s*)['"]([^'"]+)['"]/g)].map(m=>m[1]).filter(s=>s.startsWith('.'));
}

test('all static and lazy module imports resolve with the reorganized paths',async()=>{
 const sources=(await Promise.all(['public/js','server','functions','tests','scripts'].map(d=>files(resolve(root,d))))).flat().filter(f=>['.mjs','.js'].includes(extname(f)));
 for(const file of sources){
  for(const spec of imports(await readFile(file,'utf8'))){
   await assert.doesNotReject(access(target(file,spec)),`${relative(root,file)} → ${spec}`);
  }
 }
});

test('HTML assets resolve, CSS order stays intact, and every browser module is reachable',async()=>{
 const seen=new Set(),active=new Set();
 async function visit(file){
  assert.ok(!active.has(file),'no import cycle: '+relative(root,file));
  if(seen.has(file))return;seen.add(file);
  active.add(file);
  for(const spec of imports(await readFile(file,'utf8')))await visit(target(file,spec));
  active.delete(file);
 }
 const htmlFiles=(await files(publicRoot)).filter(f=>f.endsWith('.html'));
 for(const file of htmlFiles){
  const html=await readFile(file,'utf8');
  for(const match of html.matchAll(/<(script|link)\b[^>]*\b(?:src|href)="([^"]+)"[^>]*>/g)){
   const asset=target(file,match[2]);await assert.doesNotReject(access(asset),`${relative(root,file)} → ${match[2]}`);
   if(match[1]==='script')await visit(asset);
  }
  assert.ok(!/<style\b|\bon(?:click|change|input|submit)=/i.test(html),'HTML contains no embedded application styles or handlers');
 }
 const modules=(await files(resolve(publicRoot,'js'))).filter(f=>f.endsWith('.mjs'));
 assert.deepEqual(modules.filter(f=>!seen.has(f)),[],'no orphaned browser modules');
 const index=await readFile(resolve(publicRoot,'index.html'),'utf8');
 assert.deepEqual([...index.matchAll(/href="\/styles\/([^"?]+)/g)].map(m=>m[1]),['style.css','pilot.css','mobile.css','handover.css','guided-editor.css','card-theme.css','bath.css']);
 assert.equal((await files(publicRoot)).filter(f=>f.includes('/server/')).length,0,'server code is outside the published directory');
 assert.equal((await readdir(publicRoot)).filter(f=>/\.(mjs|css)$/.test(f)).length,0,'old flat browser files were removed');
});
