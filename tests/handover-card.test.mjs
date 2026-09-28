import {test} from 'node:test';
import assert from 'node:assert/strict';
import jsQR from 'jsqr';
import {handoverCode,handoverCard} from '../public/handover-card.mjs';
test('printed SVG decodes to the exact customer URL and card excludes internal data',()=>{
 const project={token:'ab'.repeat(32),title:'Bad <Müller>',pass_number:1,internal:{address:'SECRET ADDRESS'},owner_key:'SECRET KEY'};
 const {svg,url}=handoverCode(project,'https://projekt-pass.pages.dev');
 const size=Number(svg.match(/viewBox="0 0 (\d+)/)[1]),pixels=new Uint8ClampedArray(size*size*4).fill(255);
 for(const match of svg.matchAll(/M(\d+),(\d+)l4,0 0,4 -4,0 0,-4z/g))for(let y=Number(match[2]);y<Number(match[2])+4;y++)for(let x=Number(match[1]);x<Number(match[1])+4;x++){const i=(y*size+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=0;}
 assert.equal(jsQR(pixels,size,size)?.data,url);assert.equal(url,'https://projekt-pass.pages.dev/#p/'+project.token);
 const html=handoverCard(project,{name:'Firma <Test>',email:'test@example.test'},'https://projekt-pass.pages.dev');
 assert.ok(html.includes('Bad &lt;Müller&gt;'));assert.ok(html.includes('Firma &lt;Test&gt;'));assert.ok(!html.includes('SECRET'));assert.ok(!html.includes('<script'));
 assert.throws(()=>handoverCode({...project,token:'invalid'},'https://projekt-pass.pages.dev'));
});
