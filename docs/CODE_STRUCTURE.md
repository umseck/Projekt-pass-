# Projektpass: Code und lokale Prüfung

## Bestandsaufnahme vor der Umordnung

Ausgangsstand: `main`, Commit `da381977eed81ae4d808ac852df11b85f9be6471`.
Keine `AGENTS.md` im Repository oder übergeordneten Arbeitsverzeichnis gefunden.
Die fünf HTML-Seiten enthielten bereits kein eingebettetes Anwendungs-JavaScript
oder CSS. Die Anwendung war in 22 eigene Browsermodule, sieben Stylesheets,
zwei Servermodule und einen Cloudflare-Functions-Einstieg getrennt.
Die Browserdateien lagen überwiegend flach in `public/`.
Alle 48 bestehenden automatisierten Tests bestanden vor der Änderung.

## Zuständigkeiten

| Pfad | Inhalt |
| --- | --- |
| `public/*.html` | Seitengerüste: Anwendung, Produktseite, Rechtstexte, isolierte Mustervorschau |
| `public/js/app.mjs` | Einstieg, Hash-Routing, Dashboard-Zustand, gemeinsame Seitenhülle und bestehende ältere Projektansichten |
| `public/js/core/` | UI-/Upload-Hilfen und Autosave |
| `public/js/shared/` | Reine Datenmodelle und Definitionen für Gewerke, Flächen, Vorbereitung und Abdichtung; auch vom Server importiert |
| `public/js/features/` | Bestehende Module für Materialkatalog, Farben, Favoriten, Standards, Bearbeitung, Vorbereitung, Kundenpass, Übergabe und Betreiberzugang |
| `public/js/vendor/` | Bestehende QR-Code-Bibliothek einschließlich Lizenz; unverändert |
| `public/styles/` | Bestehende sieben Stylesheets; Inhalt und Ladereihenfolge unverändert |
| `public/catalog.json` | Bestehender öffentlicher Produktkatalog, weiterhin unter `/catalog.json` erreichbar |
| `functions/api/[[path]].js` | Cloudflare-Pages-Functions-Einstieg für `/api/*` |
| `server/` | API, Auth-/Sitzungsprüfung und serverseitige Validierung; kein öffentliches Asset |
| `database/`, `supabase/migrations/` | Bestehende SQL-Dateien und Migrationen, unverändert |
| `tests/` | Node-Tests, DOM-Integration mit Happy DOM und isolierte SQL-Integration mit PGlite |
| `scripts/` | Bestehende Betriebs-Einrichtung und Freigabeprüfung |
| `docs/` | Diese technische Strukturübersicht und der Prüfnachweis |

Es gibt aktuell keine separat ausgelieferten Bilder, Icons oder Schriftdateien,
für die ein neuer öffentlicher Asset-Ordner erforderlich wäre. Icons sind Teil
der bestehenden Templates; Projektfotos werden wie bisher verarbeitet.
Der Wurzelordner `assets/` ist laut seiner README für spätere physische Entwürfe.

## Einstieg, Routing und Zustand

`public/index.html` lädt die Styles in der bisherigen Reihenfolge und startet
`/js/app.mjs`. Das Modul registriert weiterhin einmalig `hashchange`,
`beforeunload` sowie die Druck-Handler und ruft anschließend `render()` auf.
Die vorhandenen Hash-Routen einschließlich `/#p/<token>` bleiben unverändert.
Dashboard, Versionszähler, ungespeicherte Änderungen und Editor-Sitzung bleiben
im bisherigen Koordinator; keine neue globale Zustandsverwaltung.

Der flächenbezogene Editor, Kundenpass und die Übergabekarte werden weiterhin
bei Bedarf dynamisch importiert. Die bestehende Mustervorschau startet über
`public/bath-preview.html` und `/js/features/bath-preview.mjs` mit fiktiven,
flüchtigen Daten. Sie stellt keine echte Auth-/Datenbankverbindung her.

`app.mjs` enthält noch die ältere Projektbearbeitung und Betriebsprofilansicht.
Diese eng mit Router, Autosave und Sitzungszustand verbundenen Funktionen wurden
nicht zusätzlich umgeschrieben. Eine spätere Aufteilung wäre eine eigene,
verhaltensrelevante Änderung und ist für die neue Ordnerstruktur nicht nötig.

## Lokal prüfen

```sh
npm ci
npm test
node --test tests/structure.test.mjs
npm run check
```

`npm test` führt auch die neuen Pfad-/Abhängigkeitsprüfungen aus.
Die Integrationstests nutzen fiktive Auth-Antworten und eine lokale PGlite-
Datenbank. Sie sind kein Nachweis eines echten Supabase-Logins oder Handytests.
`npm run check` prüft die bestehende Freigabedatei `launch.local.json`;
fehlende Freigaben sind weiter ein bewusstes Hindernis für echte Kundendaten.
Die Datei nicht mit erfundenen Bestätigungen füllen.

Für eine ausschließlich lokale UI-/Mustervorschau, ohne Live-API:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory public
```

Dann `http://127.0.0.1:8765/` oder
`http://127.0.0.1:8765/bath-preview.html` öffnen. Dieser reine Dateiserver
unterstützt keinen echten Login und keine dauerhafte Projektspeicherung.
Für einen vollständigen Test wird die bestehende Cloudflare-Functions-Laufzeit
mit ausdrücklich getrennter Testkonfiguration benötigt; keine produktiven
Secrets oder Kundenprojekte für solche Tests verwenden.

## Cloudflare-Veröffentlichung

Die vorhandene GitHub-Anbindung veröffentlicht `main` auf Cloudflare Pages.
`wrangler.toml` liefert unverändert `public/` aus; `functions/` bindet die API.
`_headers`, `_routes.json`, API-Pfade, Auth, Datenbank und Laufzeitvariablen wurden
nicht verändert. Projektname und bestehende Konfigurationshinweise bleiben
wie zuvor; offene Infrastrukturfragen stehen in `INFRASTRUCTURE_STATUS.md`.

Diese Umordnung bleibt auf einem eigenen Branch. Der Commit erhält den von
Cloudflare dokumentierten Präfix `[CF-Pages-Skip]`, um keine ungeschützte
automatische Vorschau zu erzeugen. Nicht unmittelbar auf Produktion mergen.
Vor einer späteren Veröffentlichung zuerst eine geschützte Testumgebung
prüfen und den echten Login-/Handy-/Übergabeablauf bestätigen. Bei Freigabe
muss der Veröffentlichungscommit ohne Skip-Präfix erstellt werden.

Offizielle Referenz:
https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/#skipping-a-build-via-a-commit-message

## Absichtlich erhalten

- Geschäftslogik, HTML-Inhalte, CSS-Regeln und Reihenfolge.
- Automatisches Speichern, Materialauswahl, Fotos/PDFs, Übergabe und QR/NFC.
- Öffentliche Seitenadressen und `/catalog.json`.
- Offline-Kundenexport mit eingebettetem CSS: externe Styles würden seine
  unabhängige Offline-Nutzung beschädigen.
- Datenbankbestand einschließlich bereits dokumentierter Altbestandteile.
- Bestehende Dokumentation im Repository-Hauptordner; historische Prüfberichte
  werden nicht rückwirkend umgeschrieben.
- Alle anderen Projekte, insbesondere Steckerl.
