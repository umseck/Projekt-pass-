// Shared template definitions. A project's trade is fixed when its pass is activated.
export const names={tile:'Fliese',grout:'Fuge',silicone:'Silikon / Anschlussfugen',surface:'Oberflächensystem',primer:'Grundierung',waterproofing:'Abdichtung',finish:'Versiegelung'};
export const productKeys=Object.keys(names);
export const trades={
 tile:{label:'Fliesenleger',primary:'tile',products:['tile','grout','silicone'],care:['tile','grout','silicone'],materialTitle:'Ihre Fliese',materialAction:'Meine Fliesen',buildTitle:'Fuge & Silikon',usage:'Dusche nutzbar ab'},
 seamless:{label:'Fugenlose Oberflächen',primary:'surface',products:['surface','primer','waterproofing','finish','silicone'],care:['surface','finish','silicone'],materialTitle:'Ihre fugenlose Oberfläche',materialAction:'Meine Oberfläche',buildTitle:'Aufbau & Anschlussfugen',usage:'Fläche nutzbar ab'}
};
export const tradeFor=value=>trades[value]||trades.tile;
