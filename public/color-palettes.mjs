import {esc,field} from './ui.mjs';

// Manufacturer colour references. Custom project colours remain freely editable.
// Quartz R uses the Corestone collection at the project owner's request (2026-09-27).
export const colorPalettes = {
  "corestone": {
    "id": "corestone",
    "name": "Corestone-Farbkollektion",
    "source": "https://zakelijk.epifloors.com/en/colours/",
    "checked_at": "2026-09-27",
    "colors": [
      "Beach (Solid)",
      "Cafe au Lait (Blend)",
      "Canvas",
      "Concrete (Blend)",
      "Doodle (Blend)",
      "Glow (Blend)",
      "Grainy (Solid)",
      "Greige (Solid)",
      "Grey Taupe (Blend)",
      "Greyphite (Blend)",
      "Hopefull (Blend)",
      "Jute",
      "Maple (Solid)",
      "Mixed Sand (Blend)",
      "Natural Beach (Blend)",
      "Nutmeg",
      "Pebble (Blend)",
      "Perfect (Solid)",
      "Pompeii (Solid)",
      "Raffia",
      "River",
      "Robust (Solid)",
      "Rose",
      "Sand Storm (Blend)",
      "Silver Fish (Solid)",
      "Smoke (Solid)",
      "Soft Shade (Blend)",
      "Stony (Solid)",
      "Summer Beach (Blend)",
      "Sunset",
      "Warm (Blend)"
    ]
  },
  "murface": {
    "id": "murface",
    "name": "Murface-Farbkollektion",
    "source": "https://murface.com/de/farb-kollektion/",
    "checked_at": "2026-09-27",
    "colors": [
      "MF ANTHRACITE · D30",
      "MF ASPHALT · D29",
      "MF AUBERGINE · C48",
      "MF AZUR BLUE · D27",
      "MF BEIGE · #112",
      "MF BLUE GREY 2 · G24",
      "MF BLUE GREY · G23",
      "MF CARBON · D28",
      "MF CHAMPAGNE · B04",
      "MF COAL · D123",
      "MF CONCRETE · D115",
      "MF CORN · C08",
      "MF CORNFLOWER · C38",
      "MF CORNSILK · B111",
      "MF CREME · B02",
      "MF DARK BROWN · D33",
      "MF DARK ORANGE · C10",
      "MF DARK RED · C12",
      "MF DELPHIN · B305",
      "MF DOVE GREY · G22",
      "MF EGSHELL · G121",
      "MF EMERALD · C35",
      "MF FRENCH GREY · G120",
      "MF GRAY GREEN · G17",
      "MF GREY BEIGE · B18",
      "MF GREY · D125",
      "MF IVORY · B03",
      "MF JADE · #37",
      "MF LIME GREEN · C202",
      "MF MALVE · C40",
      "MF MAUVE · D41",
      "MF MEDIUM BROWN · C118",
      "MF MINT · C34",
      "MF MOKKA · D32",
      "MF MOUSE · G15",
      "MF MUSHROOM · G16",
      "MF MUSTARD · B51",
      "MF MUTE ROSE · C200 N",
      "MF NAVY GREEN · G126",
      "MF NAVY · D25",
      "MF NIGHT BLUE · D26",
      "MF NUDE 2 · B14",
      "MF NUDE · B13",
      "MF OFF WHITE · B01",
      "MF OLD CONCRETE · D116",
      "MF PALE BLUE · C201",
      "MF PALE GOLD · B113",
      "MF PASTELL GREY · G302",
      "MF PETROL · C49",
      "MF ROSEWOOD · B303",
      "MF SILVER GREY · G300",
      "MF STONE · G20",
      "MF TAUPE · G19",
      "MF TIN · G21",
      "MF VANILLA · B05",
      "MF VIOLET · C39",
      "MF WALNUT · D31",
      "MF WARM GREY · G304",
      "MF WHEAT · D117",
      "MF WHITE · B00"
    ]
  },
  "lamurista": {
    "id": "lamurista",
    "name": "Lamurista HardRock-Hausfarben",
    "source": "https://lamurista.de/hardrock-farbenkatalog/",
    "checked_at": "2026-09-27",
    "colors": [
      "Atlanta",
      "Bangkok",
      "Barcelona",
      "Berlin",
      "Bohol",
      "Havanna",
      "Helsinki",
      "Hongkong",
      "Kapstadt",
      "Las Vegas",
      "London",
      "Madrid",
      "Maitland",
      "Marrakesch",
      "Melbourne",
      "Miami",
      "Monte Carlo",
      "Moskau",
      "München",
      "New York",
      "Nizza",
      "Orlando",
      "Paris",
      "Rio",
      "Rom",
      "San Francisco",
      "St. Tropez",
      "Sydney",
      "Sylt",
      "Tokio"
    ]
  },
  "artstucco-artstucco": {
    "id": "artstucco-artstucco",
    "name": "ArtStucco-Farbkollektion",
    "source": "https://artstucco.de/uber-uns/farbpalette/",
    "checked_at": "2026-09-27",
    "colors": [
      "Alesio",
      "Alessandro",
      "Carlo",
      "Claudio",
      "Danilo",
      "Enrico",
      "Francesco",
      "Gino",
      "Giorgio",
      "Giuliano",
      "Givano",
      "Leonardo",
      "Livio",
      "Lorenzo",
      "Luciano",
      "Matteo",
      "Mauro",
      "Renzo",
      "Rocco",
      "Romano",
      "Santino",
      "Sergio",
      "Silvano",
      "Stefano",
      "Tomasso"
    ]
  },
  "artstucco-lavastein": {
    "id": "artstucco-lavastein",
    "name": "ArtStucco Lavastein-Farbkollektion",
    "source": "https://artstucco.de/uber-uns/farbpalette/",
    "checked_at": "2026-09-27",
    "colors": [
      "Bari",
      "Bellagio",
      "Bergamo",
      "Florence",
      "Fungi",
      "Genua",
      "Lago di garda",
      "Lago maggiore",
      "Lasize",
      "Mantova",
      "Milaan",
      "Monza",
      "Muro",
      "Padua",
      "Palermo",
      "Pisa",
      "Puglia",
      "Rimini",
      "Rome",
      "Siena",
      "Siena 2",
      "Treviso",
      "Tropea"
    ]
  },
  "pci-silcofug-e": {
    "id": "pci-silcofug-e",
    "name": "PCI Silcofug E – Farbtöne",
    "source": "https://www.pci-augsburg.eu/de/produkte/pci-silcofug-e",
    "checked_at": "2026-09-27",
    "colors": [
      "Transparent",
      "01 · Brillantweiß",
      "02 · Bahamabeige",
      "03 · Caramel",
      "05 · Mittelbraun",
      "11 · Jasmin",
      "12 · Anemone",
      "16 · Silbergrau",
      "18 · Manhattan",
      "19 · Basalt",
      "21 · Hellgrau",
      "22 · Sandgrau",
      "23 · Lichtgrau",
      "31 · Zementgrau",
      "40 · Schwarz",
      "41 · Dunkelbraun",
      "43 · Pergamon",
      "44 · Topas",
      "47 · Anthrazit",
      "53 · Ocker",
      "54 · Ahorn",
      "55 · Nussbraun",
      "56 · Terrabraun",
      "57 · Rehbraun",
      "58 · Mahagoni",
      "59 · Mokka",
      "60 · Schwarzbraun",
      "61 · Schiefergrau"
    ]
  }
};

const normalized=value=>String(value??'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function paletteFor(kind,manufacturer,product){
 if(!String(product??'').trim())return null;
 const maker=normalized(manufacturer),name=normalized(product);
 if(kind==='silicone'&&['pci','pciaugsburg','pciaugsburggmbh'].includes(maker)&&['silcofuge','pcisilcofuge'].includes(name))return colorPalettes['pci-silcofug-e'];
 if(kind!=='surface')return null;
 const system=name.replace(/^epi/,'');
 if(['epi','byepi','epifloors','epigroup','epigroupbv'].includes(maker)&&['quartzr','quarzr','corestone','corestonenature'].includes(system))return colorPalettes.corestone;
 if(['murface','murfacegmbh'].includes(maker)&&['mono','mfmono','industrial','mfindustrial'].includes(system))return colorPalettes.murface;
 if(['lamurista','lamuristagmbh'].includes(maker)&&['hardrock','hardrockpro','lamuristahardrock','lamuristahardrockpro'].includes(system))return colorPalettes.lamurista;
 if(['artstucco','artstuccogmbh'].includes(maker)){
  if(['artstucco','artstuccowand','artstuccowandspachtel','wandspachtel','spachtelbeton'].includes(system))return colorPalettes['artstucco-artstucco'];
  if(['lava','lavastein','lavasteinboden','artstuccolava','artstuccolavasteinboden'].includes(system))return colorPalettes['artstucco-lavastein'];
 }
 return null;
}
const options=palette=>(palette?.colors||[]).map(value=>`<option value="${esc(value)}"></option>`).join('');
const isCustomColor=(kind,palette,color)=>Boolean(palette&&color&&!palette.colors.includes(color));
function setColorMode(wrapper,kind,palette,custom){
 const input=wrapper.querySelector('#'+kind+'-color'),hint=wrapper.querySelector('.hint'),button=wrapper.querySelector('[data-custom-color]');
 wrapper.dataset.customColor=String(custom);
 const select=wrapper.querySelector('[data-color-select]'),selection=wrapper.querySelector('[data-color-selection]');
 selection.hidden=!palette;select.value=palette?.colors.includes(input.value)?input.value:input.value?'__custom__':'';
 input.closest('.field').hidden=Boolean(palette&&!custom);

 if(custom)input.removeAttribute('list');else input.setAttribute('list',kind+'-colors');
 wrapper.querySelector('label[for="'+kind+'-color"]').textContent=custom?'Anderer Farbton':'Farbton / Farbnummer';
 input.placeholder=custom?'z. B. RAL 9001, NCS oder eigene Farbbezeichnung':'Farbton wählen oder eingeben';
 hint.textContent=palette?palette.name+(custom?' · Eigenen Farbton, RAL- oder NCS-Code eingeben.':' · auswählen oder eigenen Farbton eingeben.'):'';
 hint.hidden=!palette;
 if(button){button.hidden=!palette;button.textContent=custom?'Standardfarbtöne anzeigen':'Anderer Farbton';button.setAttribute('aria-pressed',String(custom));}
}
export function colorField(kind,product){
 if(!['surface','silicone'].includes(kind))return field('Farbton',kind+'-color',product.color);
 const palette=paletteFor(kind,product.manufacturer,product.name);
 return `<div data-color-palette="${palette?.id||''}"><div class="field" data-color-selection ${palette?'':'hidden'}><label for="${kind}-color-select">Farbton auswählen</label><select id="${kind}-color-select" data-color-select></select></div>${field('Farbton / Farbnummer',kind+'-color',product.color,'text',`list="${kind}-colors" aria-describedby="${kind}-color-hint" placeholder="Farbton wählen oder eingeben" autocomplete="off"`)}<datalist id="${kind}-colors">${options(palette)}</datalist>${kind==='surface'?`<button class="btn text" type="button" data-custom-color="${kind}" aria-controls="${kind}-color" aria-pressed="false" ${palette?'':'hidden'}>Anderer Farbton</button>`:''}<p class="hint" id="${kind}-color-hint" ${palette?'':'hidden'}>${palette?esc(palette.name)+' · auswählen oder eigenen Farbton eingeben.':''}</p></div>`;
}
export function bindColorOptions(card,kind){
 const wrapper=card.querySelector('[data-color-palette]');if(!wrapper)return;
 const select=wrapper.querySelector('[data-color-select]');
 select.onchange=()=>{
  const palette=paletteFor(kind,card.querySelector('#'+kind+'-manufacturer').value,card.querySelector('#'+kind+'-name').value);
  const input=wrapper.querySelector('#'+kind+'-color');
  if(select.value==='__custom__'){setColorMode(wrapper,kind,palette,true);select.value='__custom__';input.focus();return;}
  input.value=select.value;setColorMode(wrapper,kind,palette,false);
  input.dispatchEvent(new input.ownerDocument.defaultView.Event('input',{bubbles:true}));
 };
 const button=wrapper.querySelector('[data-custom-color]');
 if(button)button.onclick=()=>{
  const palette=paletteFor(kind,card.querySelector('#'+kind+'-manufacturer').value,card.querySelector('#'+kind+'-name').value);
  const custom=wrapper.dataset.customColor!=='true';setColorMode(wrapper,kind,palette,custom);
  const input=wrapper.querySelector('#'+kind+'-color');input.focus();if(custom)input.select();
 };
 refreshColorOptions(card,kind,{reset:true});
}
export function refreshColorOptions(card,kind,{reset=false}={}){
 const wrapper=card.querySelector('[data-color-palette]');if(!wrapper)return;
 const palette=paletteFor(kind,card.querySelector('#'+kind+'-manufacturer').value,card.querySelector('#'+kind+'-name').value);
 const id=palette?.id||'';if(wrapper.dataset.colorPalette===id&&!reset){
 const input=wrapper.querySelector('#'+kind+'-color');wrapper.querySelector('[data-color-select]').value=palette?.colors.includes(input.value)?input.value:input.value?'__custom__':'';return;
 }
 wrapper.dataset.colorPalette=id;
 wrapper.querySelector('datalist').innerHTML=options(palette);
 wrapper.querySelector('[data-color-select]').innerHTML='<option value="">Bitte Farbton wählen</option>'+(palette?.colors||[]).map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')+'<option value="__custom__">Anderer Farbton / Sonderfarbe</option>';
 setColorMode(wrapper,kind,palette,isCustomColor(kind,palette,wrapper.querySelector('#'+kind+'-color').value));
 // Never change an entered/saved project colour when refreshing suggestions.
}
