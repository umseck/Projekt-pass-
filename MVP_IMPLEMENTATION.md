# Projektpass Bad: MVP-Implementierung

Stand: 5. Oktober 2026. Der neue Ablauf ist im Quellcode implementiert und lokal
über UI-, API- und PostgreSQL-Tests geprüft. `/bath-preview.html` ermöglicht den
vollständigen Durchlauf mit fiktiven Daten. Die Rollenwahl dort ist eine lokale
Simulation; sie behauptet keine echte Authentifizierung. Eine Anwendung der
neuen Migration in der Produktionsdatenbank und ein Produktionsdeployment sind
in diesem Dokument noch nicht nachgewiesen.

## Implementierte Kernteile

| Teil | Dateien | Verhalten |
| --- | --- | --- |
| Vier Schritte und Prüfung | `public/bath-editor.mjs`, `public/bath-model.mjs` | Projekt/Leistung, Flächenaufbau, Fotos/Pflege, wirkliche Kundenansicht und ausdrückliche datierte Freigabe. |
| Eingabegrenze | `server/validation.mjs`, `server/api.mjs` | Explizite Feldlisten, gültige Daten, benötigte Anhänge, bestätigte Flächen und bekannte Lücken. |
| Kundenweiterführung | `public/customer-continuation.mjs`, `.css` | Material/Farbton/Pflege/Reparatur schnell finden; getrennte Ergänzungen und Verwalterübergabe. |
| Originalschutz und Rechte | `database/customer-continuation.sql` | Eigene Kundenmitgliedschaft, Einladungen und append-only Ereignisse; kein Schreiben mit QR-Schlüssel. |
| Unabhängiger Export | `public/bath-export.mjs`, `public/bath-customer.mjs` | PDF, ZIP und HTML mit Original, Ergänzungen, archivierten Dateien und Manifest. PDF-Bibliothek lokal eingebunden. |
| Fiktiver Durchlauf | `public/bath-preview.mjs`, `.html` | Dieselben UI-Module; tabbezogene Speicherung ohne Live-API; Rollenwechsel und Übernahme simuliert. |
| Bestehende App | `public/app.mjs` | Kundenannahme, Kundenprojekte, Übergabebildschirm und QR-Leseansicht eingebunden. |

Die öffentliche Scanantwort enthält keine persönlichen Ergänzungen, internen
Kundenangaben oder Einladungsgeheimnisse. Persönliche Kundenprojekte benötigen
die bestehende HttpOnly-Sitzung und aktuelle Projektmitgliedschaft. Der
ursprüngliche Betrieb kann den Weiterführungsstand lesen, aber keine
Kundenergänzung unter fremdem Namen schreiben. Urheber und Erfassungszeit kommen
vom Server, nicht aus dem Formular.

## API und Speicherung

Alle Browseroperationen sind same-origin JSON-POSTs unter `/api/OPERATION`.

| Operation | Voraussetzung | Ergebnis |
| --- | --- | --- |
| `scan` | Freigegebener QR-Leseschlüssel | Originalübergabe ohne private Ergänzungen. |
| `customer_invite` | Betrieb des übergebenen Projekts | Vertraulicher, adressgebundener Link; sieben Tage gültig. |
| `customer_access_info`, `customer_access_activate` | Gültiger Einladungslink | Angaben zur Einladung bzw. Annahme mit Kundenkonto. |
| `customer_bootstrap`, `customer_project` | Aktuelle Kundenmitgliedschaft; Projektlesen auch durch ursprünglichen Betrieb | Zugeordnete Pässe bzw. Original plus getrennte Ergänzungen. |
| `customer_add` | Aktueller Projektverwalter | Neuer, zugeordneter Eintrag; Original unverändert. |
| `customer_transfer` | Aktueller Projektverwalter | Übergabelink; Entzug bisheriger Rechte und QR-Rotation erst bei Annahme. |

Private Tabellen: `customer_members`, `customer_invites`, `customer_events`.
Die RPC `public.pp_customer` ist nur für den vertrauenswürdigen Server
aufrufbar. Browserrollen haben keine direkten Tabellen-/RPC-Rechte. Einladungen
werden nur als Hash gespeichert. Interne Annahmeoperationen sind keine
Browserendpunkte. Der vorhandene `freeze_handover`-Trigger bleibt erhalten;
ein zusätzlicher Trigger blockiert die gewöhnliche Löschung übergebener Projekte.

Neue Metadaten und Materialstatus sind additive JSON-Felder. Alte Übergaben
werden nicht heimlich mit erfundenen Angaben ergänzt. Die bisher entfernten
KI-/Workflow-/`owner_save`-APIs bleiben gesperrt.

## Lokale Prüfung

```sh
npm ci --ignore-scripts
npm test
node --test tests/customer-backend.test.mjs tests/customer-ui.test.mjs tests/bath-export.test.mjs tests/trial-harness.test.mjs
```

Die vollständige lokale Suite wurde mit **74 bestandenen Tests, 0 Fehlern**
ausgeführt. Der gezielte neue Testblock umfasst davon **25 bestandene Tests**. Er prüft unter anderem echte PGlite-PostgreSQL-Transaktionen,
Mandantentrennung, Originalschutz, adressgebundene Annahme, Ablauf/Einmaligkeit,
QR-Rotation, parallele Annahme, sichere Projektion, Pflege nach Änderung,
lesbare PDF, ZIP-Prüfsummen und den vollständigen DOM-Durchlauf.

PGlite und simulierte Supabase-Antworten ersetzen keine Supabase-Cloud- oder
Cloudflare-Abnahme. Die fiktive Testansicht hält Daten im `sessionStorage`
dieses Tabs; sie synchronisiert nicht zwischen Geräten. `npm run check` bleibt
bei fehlendem `launch.local.json` bewusst gesperrt. Keine Freigabefelder erfinden.

## Additive Live-Einführung: noch auszuführen bzw. nachzuweisen

1. Bestehendes Pages-Projekt `projekt-pass`, Repository `umseck/Projekt-pass-`
   und Supabase-Projekt `zocgxgulpnqmchoydrxi` anhand des tatsächlichen Zielstands
   abgleichen. Keine neue Produktivdatenbank, kein neues Pages-Projekt.
2. Vollständige angewandte Migrationshistorie/Baseline sichern und mit Schema,
   Triggern und RPCs abgleichen. Der dokumentierte Altstand hat mehr angewandte
   Migrationen als das Repository. Backup/Restore separat bestätigen.
3. Neue Migration
   `supabase/migrations/20261005141752_customer_continuation_mvp.sql` gegen den
   tatsächlichen Bestand prüfen und additiv anwenden. `database/*.sql` sind
   Referenz-/Testquellen, keine Anleitung zum Produktions-Neuaufbau.
   **Kein Reset, keine erneute Schemaanlage, keine historische Löschung.**
4. Tabellenrechte/RLS, ausschließlich serverseitige RPC-Ausführung,
   Freeze-/Löschschutz und erhaltene Bestandsübergaben live read-only kontrollieren.
5. Branch-Vorschau mit ihrem konkreten Commit prüfen. Vorschau muss entweder
   ausschließlich die fiktive Testseite verwenden oder eine bewusst zugeordnete
   Testkonfiguration besitzen. Vorhandene Produktions-Secrets nicht ungeprüft
   in zusätzliche Umgebungen kopieren.
6. Mit ausdrücklich fiktivem Live-Testbad: Betriebslogin, Speicherung/Neuladen,
   Freigabe, Scan ohne Login, persönliche Annahme, Kundenereignis und Übernahme
   auf zwei Geräten prüfen. Ursprünglicher Kunde muss nach Übernahme verweigert
   werden; alter QR muss ungültig, neuer QR gültig sein.
7. PDF/ZIP herunterladen, entpacken und ohne Netz öffnen; nur verlinkte Unterlagen
   müssen als nicht archiviert genannt sein. Tatsächliches iPhone-/Android-Verhalten
   einschließlich Fotos/PDFs und 390-px-Ansicht prüfen.
8. Erfolgreichen Deploymentcheck und ausgelieferte Dateien des konkreten Commits
   verifizieren. Produktionsveröffentlichung allein ist keine Kundendatenfreigabe;
   offene Betriebsprüfungen stehen in `INFRASTRUCTURE_STATUS.md`/`ACCEPTANCE.md`.

## Bewusste MVP-Grenzen

Keine Berichtigungsfassung der Originalübergabe, kein personenbezogener
Löschprozess, keine Offlinebearbeitung, keine beschränkten Mitarbeiterrollen,
kein Chat und kein tägliches Bautagebuch. Einladungsempfänger werden nicht durch
eine unabhängige E-Mail-Bestätigung verifiziert; den vertraulichen Link persönlich
weitergeben. QR-Rotation beim Verwalterwechsel verlangt eine neue bzw. neu
beschriebene physische Karte. Exportierte Kopien sind nicht rückrufbar.
Dateiprüfsummen sind keine Signatur, kein Urhebernachweis und keine Qualitätsprüfung.
