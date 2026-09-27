import {esc,field} from './ui.mjs';

// Colour references only; product records remain in each business's own catalogue.
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
  }
};

const normalized=value=>String(value??'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function paletteFor(kind,manufacturer,product){
 if(kind!=='surface'||!String(product??'').trim())return null;
 const maker=normalized(manufacturer),system=normalized(product).replace(/^epi/,'');
 if(['epi','byepi','epifloors','epigroup','epigroupbv'].includes(maker)&&['quartzr','quarzr','corestone','corestonenature'].includes(system))return colorPalettes.corestone;
 if(['murface','murfacegmbh'].includes(maker))return colorPalettes.murface;
 return null;
}
const options=palette=>(palette?.colors||[]).map(value=>`<option value="${esc(value)}"></option>`).join('');
const paletteHint=palette=>palette?`${esc(palette.name)} · auswählen oder eigenen Farbton eingeben.`:'';
export function colorField(kind,product){
 if(kind!=='surface')return field('Farbton',kind+'-color',product.color);
 const palette=paletteFor(kind,product.manufacturer,product.name);
 return `<div data-color-palette="${palette?.id||''}">${field('Farbton / Farbnummer',kind+'-color',product.color,'text',`list="${kind}-colors" aria-describedby="${kind}-color-hint" placeholder="Farbton wählen oder eingeben" autocomplete="off"`)}<datalist id="${kind}-colors">${options(palette)}</datalist><p class="hint" id="${kind}-color-hint" ${palette?'':'hidden'}>${paletteHint(palette)}</p></div>`;
}
export function refreshColorOptions(card,kind){
 const wrapper=card.querySelector('[data-color-palette]');if(!wrapper)return;
 const palette=paletteFor(kind,card.querySelector('#'+kind+'-manufacturer').value,card.querySelector('#'+kind+'-name').value);
 const id=palette?.id||'';if(wrapper.dataset.colorPalette===id)return;
 wrapper.dataset.colorPalette=id;
 wrapper.querySelector('datalist').innerHTML=options(palette);
 const hint=wrapper.querySelector('.hint');hint.innerHTML=paletteHint(palette);hint.hidden=!palette;
 // Never change an entered/saved project colour when refreshing suggestions.
}
