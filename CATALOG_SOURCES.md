# Produktkatalog und Farbkollektionen

## Umfang und Entscheidungen

Der frühere breite Recherchekatalog wurde am 26. September 2026 auf Nutzerwunsch geleert. Am 27. September wurden gezielt Oberflächensysteme und Farbtöne neu freigegeben: EPI Quartz R, Lamurista HardRock/HardRock PRO, bei Murface ausschließlich Industrial/Mono sowie ArtStucco für das Bad. Weitere Produktgruppen bleiben leer, bis sie konkret ergänzt werden.

`public/catalog.json` enthält sieben auswählbare Systeme. Betriebseigene Produkte und Unterlagen bleiben privat; identische Herstellernamen werden in der Auswahl zusammengeführt, ohne private Produkte anderen Betrieben zugänglich zu machen. `preferred_manufacturers` ist eine optionale Betriebspräferenz. Sie filtert den Einstieg im Produktwähler, ersetzt aber keine Materialauswahl am Projekt. Andere Hersteller bleiben erreichbar.

Farben stehen separat in `public/color-palettes.mjs`. Es wird keine Farbe automatisch gewählt. Freie Farbangaben, z. B. NCS/RAL oder Sonderfarben, bleiben möglich. Farbtöne, Chargen und Projektfotos werden nicht als Produktstammdaten gespeichert. Bestehende Projektangaben bleiben unverändert.

## Herstellerquellen (geprüft am 27. September 2026)

### EPI

- Produkt: https://epifloors.com/de/unsere-boden/quartz-r/
- Farbkollektion: https://zakelijk.epifloors.com/en/colours/ – ausschließlich die 31 Corestone-Nature-Farben, keine Superbase-Farben. Solid/Blend bleibt soweit angegeben erhalten; Dateinamenspräfixe und `Canvas-1` sind bereinigt.
- Quartz R / Quarz R verwendet **auf ausdrückliche Vorgabe des Nutzers** die Corestone-Kollektion. Dies ist eine Auswahlhilfe, keine aus der Quelle abgeleitete technische Freigabe.
- **Offen: EPI Micro.** Unter dieser Bezeichnung ließ sich kein eindeutig zuordenbares offizielles Produkt samt Farbkollektion bestätigen. Kein erfundenes Produkt, keine automatische Gleichsetzung mit Quartz R, Corestone oder Superbase. Nach genauer Bezeichnung oder Etikett ergänzen.

### Murface

- Umfang nur **MF Industrial** und **MF Mono** gemäß Nutzervorgabe.
- Produktinformationen: https://murface.cdn.prismic.io/murface/ZmbZNJm069VX1mAc_Portfolio_Broschuere_WEB.pdf – gedruckte S. 26–27 (PDF-Seite 14) nennt beide für Wand, Boden, Bad und Dusche und ordnet MURFACE Colors PP zu. Als Produktbroschüre verlinkt, nicht als technisches Merkblatt bezeichnet.
- Farben: https://murface.com/de/farb-kollektion/ – 60 Farbnamen mit den angegebenen Codes. Quellschreibweisen wie `EGSHELL`, `#112`, `#37` und `C200 N` bleiben erhalten.
- Keine Farbzuordnung zu Murmarble, Murstone oder beliebigen weiteren Murface-Produkten.

### Lamurista

- Produktseite: https://lamurista.de/hardrock/ – Hersteller beschreibt PRO und ULTRA 2K als aktuelle Varianten. Im Katalog stehen die ausdrücklich gewünschten Einträge **HardRock** und **HardRock PRO**. HardRock ohne Zusatz bleibt als allgemeine Bezeichnung gekennzeichnet; es werden keine PRO-/ULTRA-Daten als technische Eigenschaften dieser unspezifizierten Variante behauptet.
- Hausfarben: https://lamurista.de/hardrock-farbenkatalog/ – 30 Namen aus den offiziellen Beschriftungsbildern `Hardrock-PRO-mit-Farbcodes-001.jpg` bis `059.jpg` (ungerade Nummern). Die geraden Nummern zeigen jeweils nur das Farbmuster. OCR ausgewertet; Nizza und München zusätzlich visuell abgeglichen. Keine erfundenen RAL/NCS-Zuordnungen oder RGB-Farben.
- Hausfarben: Atlanta, Bangkok, Barcelona, Berlin, Bohol, Havanna, Helsinki, Hongkong, Kapstadt, Las Vegas, London, Madrid, Maitland, Marrakesch, Melbourne, Miami, Monte Carlo, Moskau, München, New York, Nizza, Orlando, Paris, Rio, Rom, San Francisco, St. Tropez, Sydney, Sylt, Tokio.
- Die Medienseite führt technische Merkblätter über Flipbook-Verweise. Ein älterer schweizerischer HardRock-PDF-Link lieferte 404. Diese nicht bestätigten PDFs werden nicht automatisch übernommen. Die erreichbare Produktseite mit Downloads ist als Produktinformation verlinkt.

### ArtStucco

- Wandoberfläche: https://artstucco.de/produktauswahl/wande/ – Spachtelbeton auch für Badezimmer. Als **ArtStucco (Wand)** aufgenommen; konkrete Ausführungsvariante bleibt vom Betrieb zu dokumentieren.
- Lavasteinboden: https://artstucco.de/produktauswahl/boden/ – Kunstharz/Lavasteingrus, auch mit Badezimmerdarstellung. Als **Lavasteinboden** aufgenommen.
- Farben: https://artstucco.de/uber-uns/farbpalette/ – über offizielle HTML-Attribute `data-category`/`data-label` getrennt: **25 ArtStucco-Töne** und **23 Lavastein-Töne**. Keine Vermischung mit Minimal oder Castle floor. Diese beiden Linien sind noch nicht im Badkatalog, weil die geprüften Quellen ihre genaue Produkt- und Nassbereichszuordnung nicht eindeutig belegen.
- ArtStucco wird als Anbieter geführt; keine erfundenen Pava-Artikelnummern oder technischen Datenblätter.

Produktinformationen dienen der Dokumentation der tatsächlichen Auswahl. Sie legen weder einen automatisch ausgeführten Aufbau noch eine pauschale Freigabe für jede Nassbereichssituation fest.
