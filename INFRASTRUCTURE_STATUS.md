# Projektpass: Infrastruktur-Prüfung

Stand: 1. Oktober 2026. Ausschließlich Projektpass geprüft. Steckerl, Bauakte,
FundKey und nicht eindeutig zugeordnete Ressourcen wurden nicht bearbeitet.

## Eindeutige Zuordnung

| Bestandteil | Identifikation | Prüfergebnis |
| --- | --- | --- |
| Quellcode | `umseck/Projekt-pass-` | GitHub-main `edd9728b1a6ef3d90ea59d51d006582c9dcbce1c` als Ausgangsstand |
| Öffentliche Website | `https://projekt-pass.pages.dev/` | HTTP 200; ausgelieferte `app.mjs` entspricht der Datei aus diesem main-Stand |
| Cloudflare Pages | Projekt `projekt-pass`, Konto `2666bf6723629a6acd9b501629349213` | Erfolgreicher GitHub-Check des main-Commits führt genau zu diesem Pages-Projekt |
| Supabase | `PROJEKTPASS Pilot`, `zocgxgulpnqmchoydrxi` | `ACTIVE_HEALTHY`, Frankfurt `eu-central-1` |
| Geprüfte Bereinigung | Branch `cleanup/projektpass-infrastructure` | Getrennt geprüft; Freigabe über normalen Pull Request, ohne Force-Push |
| Wrangler-Konfiguration | `name = "projektpass-pilot"`, Ausgabe `public` | Namensabweichung zur Website festgestellt; ohne Dashboard-Abgleich nicht umbenannt |

## Live geprüft, ohne Bestandsdaten zu verändern

- Website liefert Sicherheitsheader und `Cache-Control: no-cache`.
- `/api/bootstrap` ohne Sitzung: HTTP 401, Anmeldung erforderlich.
- `/api/scan` mit einem neu erzeugten, nicht zugeordneten Testtoken: HTTP 404,
  erwartete Meldung für einen nicht freigegebenen Pass. Der Aufruf erscheint
  im zugeordneten Supabase-Projekt als `pp_api`-Request. Damit ist auch die
  Backend-Verbindung zu diesem Projekt bestätigt.
- `/api/ai_process`, `/api/flow_get`, `/api/owner_save`: HTTP 404.
- Private Tabellen haben RLS; `anon` und `authenticated` besitzen keine
  SELECT-/INSERT-/UPDATE-/DELETE-Rechte auf diesen Tabellen.
- `pp_api`, `pp_control`, `pp_ai`, `pp_flow`: keine SECURITY-DEFINER-Funktionen;
  kein Ausführungsrecht für `anon`/`authenticated`, nur für `service_role`.
- Bestand: 2 Betriebe, 40 Pässe, 5 Projekte, davon 2 übergeben.
  Beide übergebenen Projekte haben einen Snapshot.
- Keine Supabase-Entwicklungsbranches, keine Edge Functions, keine Storage-Buckets.
  Das ist kein Uploadfehler: Der bestehende Pilot speichert komprimierte Fotos
  und eingebettete PDFs im Projektinhalt. Keine neue Uploadarchitektur eingeführt.

Keine Kundeninhalte, Passlinks, Zugangstoken, Auth-Passwörter oder Secret-Werte
wurden für diese Prüfung ausgegeben oder in diesem Dokument gespeichert.

## Kleine Quellcode-Korrekturen

- Servergenerierung der 20 Startpass-Schlüssel und zusätzlicher Pass-Schlüssel
  wiederhergestellt. Sie war im veröffentlichten main-Stand versehentlich entfernt.
- Kundenansicht: fehlerhaftes `$().forEach` auf `$$().forEach` korrigiert.
- Bereits übergebene Projekte verweisen auf den Kundenpass statt auf die
  entfernte `work`-Route. Der Zurück-Link im Materialeditor führt wieder zu `#home`.
- Alte Eigentümer-Ergänzungen aus dem Offline-Kundenexport entfernt, nicht aus der DB.
- Verwaiste `tests/workflow.test.mjs` entfernt. Wiederherstellung aus Git möglich.
  Die übrigen Tests prüfen die aktuelle Nur-Lese-Kundenansicht statt gelöschter UI.
- Regressionstests für servergenerierte Pass-Schlüssel, unerreichbare Alt-APIs
  und den Ausschluss alter Eigentümerdaten ergänzt. Keine Kernfunktion neu gebaut.
- Veraltete Aussagen über Kundenergänzungen und Service-Mitteilungen in der README bereinigt.

## Supabase-Altbestand bleibt absichtlich erhalten

`participants`, `messages`, `journal`, `mail_outbox`, `ai_access`, `ai_state`,
`pp_flow`, `pp_ai` und die alten Eigentümerfelder wurden nicht gelöscht.
Es gibt noch 1 Mitteilung sowie 1 KI-Zugangs- und 1 KI-Statusdatensatz.
Die aktuell geprüfte App ruft die früheren KI-/Workflow-RPCs nicht auf.

Wichtig: `database/workflow.sql` enthält auch den aktiven Trigger
`pp_private.freeze_handover()` und die Kundenprojektion. Ein pauschales Entfernen
würde die Übergabe-Sicherung gefährden. Bereinigung der Datenbank benötigt eine
eigene additive Migration nach Abhängigkeitsprüfung; bisherige Migrationen nicht umschreiben.

Die Datenbank enthält 7 angewandte Migrationen, das Repository aber nur 2 Dateien
unter `supabase/migrations`. SQL-Referenzdateien unter `database/` ersetzen keine
vollständige Versionshistorie. Vor Wiederaufbau/Restore eine vollständige,
geprüfte Baseline bzw. die fehlende Migrationshistorie sichern. Keinen Reset ausführen.

## Advisor-Hinweise

- Passwort-Leak-Schutz in Supabase Auth ist deaktiviert. Einstellung und
  Tarifverfügbarkeit vor Kundenbetrieb prüfen; in dieser Bereinigung nicht geändert.
  [Supabase-Hinweis](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
- RLS ohne Policies auf `ai_access`/`ai_state`: INFO, nicht automatisch eine
  öffentliche Freigabe. Tabellenrechte für normale Nutzer sind ebenfalls entzogen.
  Keine RLS-Regeln verändert.
  [Supabase-Hinweis](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
- Fehlender Index für `messages_reply_to_fkey` und bisher ungenutzte Indizes:
  INFO für Altworkflow bzw. ungenutzte Passbatches. Nicht auf Verdacht gelöscht
  und keine unnötigen neuen Indizes für deaktivierte Funktionen angelegt.
  [Fremdschlüssel-Hinweis](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys)
  [Index-Hinweis](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)

## Noch offener Cloudflare-Verwaltungsabgleich

Der Cloudflare-Browser blieb in einer Sicherheitsprüfung hängen, auch nach einem
einmaligen Neuladen. Keine Umgehung und keine Änderungen im Dashboard. Kein
nutzbarer Cloudflare-Verwaltungszugriff für Secrets, Bindings oder Access-Regeln.

Die GitHub-Integration ist dagegen verfügbar. Ihr erfolgreicher Check für den
Ausgangscommit bestätigt Konto, Pages-Projekt und Deployment eindeutig. Der
normale Repository-Freigabeweg kann deshalb die getesteten Codekorrekturen
veröffentlichen. Erfolgreichen neuen Check UND ausgelieferte Dateien danach
verifizieren; ein Merge allein beweist noch keine Veröffentlichung.

Die vorhandene Wrangler-Datei bleibt unverändert. Ihre Namensabweichung allein
rechtfertigt keinen ungeprüften Wechsel der Konfigurationsquelle. Das Dashboard
bzw. heruntergeladene Projektkonfiguration und Build-Logs müssen zuerst abgeglichen
werden. Kein neues Pages-Projekt, keine zweite Supabase-Datenbank anlegen.

Nach Verbindung ausschließlich das Projekt der obigen Website prüfen:

1. Projekt-ID/-Name, verbundenes Repository, Produktionsbranch und Deployment-Commit abgleichen.
2. Notwendige Runtime-Konfiguration erhalten: `APP_ORIGIN`, `SUPABASE_URL`,
   `SUPABASE_PUBLISHABLE_KEY`, serverseitiges Secret `SUPABASE_SECRET_KEY`.
   Vorhandene Werte nicht in Berichte, Git oder Chat kopieren.
3. Eindeutig Projektpass-eigene ungenutzte Gemini-/KI- und Mitteilungs-Secrets
   anhand der früheren Implementierung identifizieren. Historische Runtime-Namen:
   `GEMINI_API_KEY`, `GEMINI_MODEL`, `PP_AI_ENABLED`, `PP_FREE_PROJECT_CONFIRMED`,
   `PP_TEST_EMAIL`, `PP_TEST_ORIGIN`, `PP_TEST_PASSWORD_HASH`, `RESEND_API_KEY`,
   `MAIL_FROM`. Im aktuellen Server gibt es keine Verwendungen mehr. Ob diese
   Bindings im Dashboard noch existieren, ist nicht geprüft. Keine fremden/shared
   Secrets löschen und keine globalen Google-/Resend-Schlüssel widerrufen.
4. Alte Preview-Deployments auf KI-/Workflow-Code und auf Zugriff zu Produktionsdaten
   prüfen. Sie können eigene alte Funktionen besitzen; die neue Website allein
   deaktiviert nicht automatisch jede alte Vorschau. Nur eindeutig zugeordnete
   veraltete Vorschauen entfernen, nötige Rollback-Stände separat berücksichtigen.
5. Preview-Zugriff schützen und Produktions-/Testdaten trennen; vorhandene
   Einstellungen erst prüfen, nicht ungeprüft überschreiben.

Cloudflare empfiehlt den Dashboard-Abgleich vor Änderungen einer vorhandenen
Wrangler-Konfiguration. Deshalb bleibt `wrangler.toml` vorerst unverändert.
[Offizielle Anleitung](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)

## Verbleibende Schritte für den Kontoinhaber

1. Nur `projekt-pass` unter Cloudflare **Workers & Pages** öffnen. Repository
   `umseck/Projekt-pass-`, Produktionsbranch `main`, Ausgabe `public` und neuesten
   erfolgreichen Produktions-Deploy prüfen. Andere Projekte nicht bearbeiten.
2. Unter **Settings > Variables and Secrets** zuerst **Production** wählen.
   Die vier benötigten Namen aus Punkt 2 oben erhalten. `APP_ORIGIN` muss exakt
   `https://projekt-pass.pages.dev` sein; `SUPABASE_URL` gehört zu
   `https://zocgxgulpnqmchoydrxi.supabase.co`. Den vorhandenen Server-Schlüssel
   weder anzeigen noch kopieren oder veröffentlichen.
3. Nur falls vorhanden, die neun eindeutig alten Namen aus Punkt 3 oben aus
   diesem Pages-Projekt entfernen. Auch **Preview** separat prüfen. Keine
   Supabase-Schlüssel oder geteilten/globalen Google-/Resend-Schlüssel löschen.
   Nach Konfigurationsänderungen den aktuellen main-Stand erneut deployen, nicht
   einen alten KI-Stand wiederherstellen.
4. Unter **Settings > General** den Schutz für Preview-Deployments prüfen und
   nötigenfalls **Enable access policy** aktivieren. Dieser Schutz betrifft die
   Vorschauen, nicht den normalen Kundenpass. Alte Deployments erst nach Zuordnung
   zu Quellstand, Umgebung und benötigten Rollback-Ständen entfernen.
   [Offizielle Preview-Anleitung](https://developers.cloudflare.com/pages/configuration/preview-deployments/)
5. Auf dem Smartphone anmelden und einen eigenen fiktiven Testpass verwenden:
   Kunde/Projekt, Material, Standardübernahme, Foto, PDF, Autosave und Neuladen
   testen. Danach Vollständigkeitsprüfung und Übergabe testen. Kundenlink auf
   einem zweiten Gerät ohne Anmeldung öffnen; nur freigegebenen Lesestand und
   QR/NFC prüfen. Keine fremden Kunden- oder Bestandsprojekte zu Tests verändern.
6. Vor echtem Kundenbetrieb fehlende Abnahme bestätigen: Backup/Restore,
   Ratelimits, Rechtstexte/Anbietervereinbarungen und vollständige Cloudflare-
   Konfiguration. Ein Entwickler muss zusätzlich die fehlende Migrationshistorie
   sichern und in einer getrennten lokalen/Testdatenbank den Wiederaufbau prüfen.
   Keine historischen Tabellen oder Trigger löschen, keinen Produktionsreset.

## Testgrenzen und Prüfgrundlage

Nach der Bereinigung: `npm test` mit 48 bestandenen Tests, 0 Fehlern.
Syntaxprüfung aller Runtime-Module und `git diff --check` ebenfalls erfolgreich.
Der unveränderte GitHub-Ausgangsstand hatte 4 fehlgeschlagene Testdateien/-fälle.
`npm run check` bleibt korrekt gesperrt, weil `launch.local.json` mit bestätigten
Einrichtungsdaten fehlt. Keine Produktionsfreigabe daraus abgeleitet.

Lokale automatisierte API-/DOM-/PGlite-Tests sind von den obigen öffentlichen
Live-Smoke-Checks getrennt. Echte Anmeldung mit einem Betriebsaccount, Smartphone-
Uploads, komplettes Live-Handover, Backup/Restore und Cloudflare-Konfiguration
sind noch nicht vollständig abgenommen. `npm run check` benötigt tatsächliche
Freigaben in `launch.local.json`; solche Freigaben nicht erfinden.

Verwendete Skills: `cloudflare:cloudflare`, `cloudflare:wrangler`, `supabase:supabase`.
Sie begründen den konservativen Konfigurationsabgleich, die Rechte-/Advisor-Prüfung
und das Bewahren von Bestandsdaten statt pauschaler Infrastruktur-Löschung.
