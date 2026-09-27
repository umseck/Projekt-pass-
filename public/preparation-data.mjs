export const preparationAreas={walls:'Wände',floor:'Boden',other:'Andere Fläche'};
export const substrateTypes={plaster:'Putz',drywall:'Trockenbau',screed:'Estrich',tiles:'Fliesen',other:'Sonstiges'};
export const preparationTypes={sanded:'Geschliffen',filled:'Gespachtelt / ausgeglichen',primed:'Grundiert',other:'Andere Arbeit'};
export const preparationActors={own:'Unser Betrieb',other:'Anderes Gewerk',unknown:'Unbekannt'};
export const hasPreparationItem=item=>Boolean(item&&(item.kind||item.by||item.custom?.trim()||item.company?.trim()||item.note?.trim()));
