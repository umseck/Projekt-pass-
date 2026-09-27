# Produktkatalog und Farbkollektionen

## Umfang und Entscheidungen

Der frühere breite Recherchekatalog wurde am 26. September 2026 auf Nutzerwunsch geleert. Am 27. September wurden gezielt Oberflächensysteme und Farbtöne neu freigegeben: EPI Quartz R, Lamurista HardRock/HardRock PRO, bei Murface ausschließlich Industrial/Mono sowie ArtStucco für das Bad. Als erstes Silikon wurde anschließend PCI Silcofug E ergänzt. Weitere Produkte folgen anhand der tatsächlich verwendeten Materialien.

`public/catalog.json` enthält sieben auswählbare Oberflächensysteme und PCI Silcofug E. `public/system-finish.mjs` ergänzt drei zugeordnete Versiegelungen. Betriebseigene Produkte und Unterlagen bleiben privat; identische Herstellernamen werden in der Auswahl zusammengeführt, ohne private Produkte anderen Betrieben zugänglich zu machen. `preferred_manufacturers` ist eine optionale Betriebspräferenz. Sie filtert den Einstieg im Produktwähler, ersetzt aber keine Materialauswahl am Projekt. Andere Hersteller bleiben erreichbar.

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

## Zusätzlich bestätigtes Betriebsprodukt: PCI Seccoral 1K

Auf Nutzerangabe für den privaten Betriebskatalog bestätigt; der gemeinsame Oberflächenkatalog bleibt unverändert.

- Offizielle Produktseite: https://www.pci-augsburg.eu/de/produkte/pci-seccoral-1k
- Technisches Merkblatt, Stand 7/26: https://doc.pci-augsburg.com/php/index.pdf?changed=1783548000&check=d72558a7b969a59b11b2d122e5098270&download=&lang=0&pfile=0_127_1&prod=109
- Herstellerbezeichnung: flexible Dichtschlämme. In der vereinfachten Projektauswahl entspricht dies „Dichtmasse“; keine automatische Wassereinwirkungsklasse aus den erlaubten Anwendungsbereichen ableiten. Die tatsächliche Klasse und Ausführung bleiben Projektangaben.


## PCI Silcofug E

- „PCI Silco g“ wurde als PCI Silcofug E eingeordnet und diese Annahme dem Nutzer mitgeteilt. Kein Produkt unter erfundener Bezeichnung „Silco G“ angelegt.
- Offizielle Produktseite/Farben: https://www.pci-augsburg.eu/de/produkte/pci-silcofug-e
- Technisches Merkblatt, Stand 7/25 (am 27. September 2026 von der aktuellen Produktseite abgerufen): https://doc.pci-augsburg.com/php/index.pdf?changed=1788300000&check=06b6f418221331cdbbc299eba67501d8&download=&lang=0&pfile=0_106_1&prod=98
- 28 Auswahlwerte: transparent und die 27 nummerierten Farbtöne der Produktseite/310-ml-Kartusche. Keine Übernahme der Farbliste von Silcoferm S oder Silcofug Multicolor. Der 400-ml-Schlauch hat eine kleinere Farbauswahl; die Auswahl enthält keine Gebinde- oder Lieferzusage.
- Nur der Materialrolle `silicone` zugeordnet. Das Produkt ist kein Fugenmörtel. Fugenmaterial und Silikon bleiben getrennt dokumentierbar, auch unter der gemeinsamen Überschrift der Fliesen-Vorlage.
- Freie Farbeingabe bleibt möglich. Ein Produktwechsel überschreibt beim Katalogwählen keine Fugenmörtelangaben. Bloßes Bearbeiten des Produktnamens löscht keinen gespeicherten Farbton.

## Versiegelung direkt im Oberflächensystem (27. September 2026)

Die Eingabe für Fugenlos zeigt nur Oberfläche, Abdichtung und Silikon. Die Versiegelung steht als kompakte Zeile in der Oberfläche, mit eingeklappten Änderungsfeldern. Freie Produktfelder, Artikelnummern und Chargen sind ebenfalls eingeklappt. Grundierung entfällt in neuen Eingaben und neu gespeicherten Standards; vorhandene Projektdaten und Übergabestände werden nicht gelöscht. Historische Grundierungen bleiben in der Kundenansicht und im Export lesbar.

Automatische Vorschläge sind bearbeitbare Dokumentationshilfen. Sie sind keine Aussage über tatsächlich ausgeführte Arbeiten, vollständige Schichtfolgen oder Freigaben für beliebige Untergründe. Beim Wechsel auf ein anderes System wird dessen Vorschlag übernommen; ohne bestätigte Zuordnung bleibt die Versiegelung leer. Eigene Angaben und bewusst geleerte Felder bleiben beim Speichern, erneuten Öffnen und erneuten Wählen desselben Systems erhalten (`finish_selection` im Projektinhalt). Das bestehende Feld `content.finish` bleibt erhalten. Es gibt keine Massenänderung bestehender Projekte oder Übergaben.

- **EPI Quartz R / Quarz R → EPI Corestone Sealer:** ausdrückliche Vorgabe des Pilotbetriebs. Kein erfundenes technisches Merkblatt, keine Ableitung für EPI Micro oder andere Systeme.
- **Lamurista HardRock / HardRock PRO → GoodLack wb:** bearbeitbarer Vorschlag der wasserbasierten Variante. Glanzgrad bleibt zur tatsächlichen Auswahl frei. Die öffentliche Medienseite https://lamurista.de/medien-bereich/ verlinkt Flipbooks; deren öffentliche JSON-Konfiguration (`/wp-json/ipages/v1/item/16` und `/18`) liefert die aktuellen PDFs. Beide PDFs wurden heruntergeladen und inhaltlich geprüft:
  - https://lamurista.de/wp-content/uploads/2025/11/Lamurista_GoodLack_wb_TM-Neu.pdf – benennt GoodLack wb als Schutz für Hardrock.
  - https://lamurista.de/wp-content/uploads/2026/01/Lamurista_HardrockPRO_TM.pdf – nennt GoodLack 2K PU als Versiegelung von HardRock PRO.
  - Keine automatische Gleichsetzung anderer Lamurista-Systeme mit HardRock. Die Alternative GoodLack lmh und mögliche abweichende Aufbauten werden nicht stillschweigend behauptet; jede tatsächlich verwendete Versiegelung ist frei dokumentierbar.
- **Murface MF Mono / MF Industrial → MF NanoTop, ultra matt:** Herstellerportfolio https://murface.com/wp-content/uploads/2025/02/Portfolio_Broschuere_WEB.pdf, Abschnitt Oberflächenversiegelung, nennt beide Systeme ausdrücklich. Keine Zuordnung zu MurStone oder zu sämtlichen Produkten derselben Marke.
- **ArtStucco bleibt offen:** Die öffentlichen Wand-/Bodenseiten nennen keine eindeutige Versiegelungsvariante für die im Katalog gewählten Einträge. Ein Suchhinweis auf Idro-Gel/Idro-Pol in einem Anbieterbeitrag konnte nicht ausreichend geprüft werden. Deshalb keine erfundene automatische Zuordnung. Produkt/Etikett bzw. freigegebenen Aufbau bei der realen Projektdokumentation ergänzen.

Technische Unterlagen der bestätigten Versiegelung werden bei der Systemauswahl zusammen mit den Produktunterlagen übernommen, sofern dies im Produktwähler aktiviert ist. Vorhandene Links bleiben wie bisher erhalten und sind über Fotos & Unterlagen einzeln entfernbar. Private Favoriten desselben Systems erhalten denselben Vorschlag; Hersteller und Produktname werden streng zugeordnet, keine unscharfe Markenvermutung.

## Automatische HardRock-Unterlagen und Pflege (27. September 2026)

- Offizielle Medienseite und HardRock-Produktseite erneut geprüft. Flipbook-Konfiguration `/wp-json/ipages/v1/item/18` bestätigt das HardRock-PRO-Merkblatt: https://lamurista.de/wp-content/uploads/2026/01/Lamurista_HardrockPRO_TM.pdf
- Die unter HardRock verlinkte Clean-&-Care-Anleitung (`/wp-json/ipages/v1/item/32`) verweist auf https://lamurista.de/wp-content/uploads/2025/11/Clean-Clear-01-25_WEB.pdf . PDF heruntergeladen und Text geprüft: ausdrücklich für fugenlose Oberflächen mit HardRock. Zuordnung zu HardRock und HardRock PRO als Pflegeanleitung.
- Beim allgemeinen HardRock-Eintrag nur Produktinformationen und Pflegeanleitung; das PRO-Merkblatt ausschließlich für die genaue PRO-Auswahl. Kein erfundenes generisches technisches Merkblatt.
- Exakt gleichnamige Betriebsprodukte erhalten ergänzend bestätigte Katalogunterlagen; eigene Unterlagen bleiben erhalten. Auch Schnellwahl übernimmt diese Dokumente. Keine unscharfe Zuordnung zu anderen Varianten oder Herstellern. Links werden nach URL dedupliziert.
- Automatische Übernahme bei neuer Produktauswahl; keine nachträgliche Änderung übergebener Projekte. Bestehende Projektunterlagen bleiben erhalten und können einzeln entfernt werden.
