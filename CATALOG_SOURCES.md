# Fugenlos-Katalog: Quellen und Abdeckung

Recherche: 26. September 2026. Der versionierte, gemeinsame Katalog liegt in
`public/catalog.json`; persönliche Projektangaben bleiben in der privaten Datenbank.
Die Produktliste enthält belegte Namen, eine redaktionelle Bereichszuordnung,
Herstellerquellen und Dokumentverweise. Sie enthält keine automatisch erzeugten
Verarbeitungsrezepte, Leistungsversprechen oder Freigaben für Mischsysteme.

| Anbieter | Produkte / Systemlinien | Hauptquelle | Abdeckung und Lücke |
| --- | ---: | --- | --- |
| Lamurista | 34 | https://lamurista.de/medien-bereich/ | Alle dort gelisteten technischen Merkblätter als PDF abgerufen; öffentliche Flipbook-Konfiguration löst den tatsächlichen Dateilink auf. |
| Murface | 38 | https://murface.com/technische-merkblaetter/ | Produktnamen, Kategorien und deutsche Dokumentzuordnung aus der offiziellen Seite. SharePoint-Dateien hier nicht abrufbar; Dokumentinhalt und Revision nicht bestätigt. |
| ArtStucco | 1 | https://artstucco.de/produktauswahl/boden/ | Belegte Systemlinie Lava. Der Anbieter beschreibt sich als Pava-Partner. Keine unbelegte Gleichsetzung mit anderen Art-Stucco-Marken oder dem gesamten Pava-Sortiment. Artikel und technische Blätter fehlen. |
| EPI | 8 | https://epifloors.com/de/unsere-boden/ | Quartz R, Corestone Nature und sechs Superbase-Varianten. Öffentliche Produktinformationen und Pflegehinweise; technische Komponentenblätter noch nicht vollständig verfügbar. Industrie- und Sportbodenprogramme gehören nicht zu diesem Wohn-/Badkatalog. |

Weitere offizielle Dokumentquellen:

- https://lamurista.de/hardrock/
- https://murface.com/de/downloads/
- https://epifloors.com/de/beratung/hinweise-zur-wartung/
- https://zakelijk.epifloors.com/brochures/
- https://customerportal.epigroup.nl/login (geschützter Bereich; nicht ausgelesen)

## Prüfstatus

- `pdf`: PDF erfolgreich abgerufen; SHA-256 bezieht sich auf die gelesenen Bytes.
  Technische Lamurista-Blätter wurden auf Produktzuordnung gelesen; Diamante wurde
  wegen unzureichender Textextraktion zusätzlich als gerenderte Seite geprüft.
- `page`: öffentliche Herstellerseite gelesen; ausdrücklich kein technisches PDF.
- `source_link`: Verweis auf der offiziellen Website belegt, Dateiabruf nicht bestätigt.
  Diese Dokumente werden bei Produktauswahl nicht automatisch in Projekte kopiert.
- `checked_at` ist der Recherchetag, nicht das Ausgabedatum oder eine Garantie,
  dass die Herstellerdatei unverändert bleibt. Dokumenttypen unterscheiden
  Merkblatt, Broschüre, Pflegehinweise und Produktinformation.

Die App verlinkt Originaldokumente. Sie archiviert und veröffentlicht keine eigenen
Kopien der Hersteller-PDFs. Im Projekt bleiben übernommene Namen und URLs gespeichert;
Katalogänderungen überschreiben bestehende Projektangaben nicht. Vor Übergabe prüft
der Betrieb Produktvariante, Farbton, Charge und tatsächlich zugehörige Unterlagen.

Pflegeprodukte, Zubehör und Untergrundprodukte sind durchsuchbar. Die automatische
Übernahme in Materialfelder ist auf passende vorhandene Projektfelder begrenzt.
Freie Materialeingabe bleibt möglich. Kundendokumente bleiben auf 20 Links je Pass
begrenzt; doppelte URLs werden bei der Übernahme vermieden.

## Ergänzungen

Für vollständige EPI-/ArtStucco-Komponentensätze werden eindeutig bezeichnete aktuelle
Hersteller-/Partnerunterlagen benötigt. Bei Murface ist ein gesonderter Zugriffstest
der veröffentlichten SharePoint-Links nötig. Keine Dokumentzuordnung allein anhand
ähnlicher Produktnamen vornehmen und keine geschützten Portale umgehen.
