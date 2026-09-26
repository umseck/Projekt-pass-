# PROJEKTPASS – Vorbereitung des echten Pilotbetriebs

Separater Pilot mit Betreiberverwaltung und getrennten Betriebszugängen.
Neue Betriebe starten mit 20 Pässen; weitere Pässe lassen sich jederzeit hinzufügen.
Keine Verbindung zu Steckerl, keine Übernahme seiner Daten oder Zugänge.

## Was implementiert ist

- Geschützter Zugang über Supabase Auth; Einrichtung über einmalige persönliche Links.
- Betreiberverwaltung: Betriebe anlegen, Profil bearbeiten und Einrichtungslinks erstellen.
- Betriebsprofil mit Gewerkeauswahl: Fliesenleger oder Fugenlose Oberflächen.
- Gemeinsamer Fugenlos-Katalog: 81 belegte Produkte/Systemlinien von Lamurista, Murface,
  ArtStucco und EPI. Suche, Bereichsfilter und optionale Übernahme zugeordneter Unterlagen.
  Umfang und ausdrücklich offene Datenquellen: `CATALOG_SOURCES.md`.
- Fugenlos-Vorlage: Fläche, Untergrund, Oberflächensystem, Grundierung, Abdichtung,
  Versiegelung, Anschlussfugen und Pflege. Keine erfundenen Material- oder Pflegevorgaben.
- Dashboard, erweiterbarer Passbestand, Titel als einziges Projektpflichtfeld, Materialfavoriten.
- Serverseitige Speicherung, automatische Erstellungszeit, Kundenvorschau und bewusste Übergabe.
- Öffentlicher Kundenlink erst nach Übergabe. Keine internen Namen/Adressen im Scan oder Export.
- Betriebsangaben unveränderbar für Kunden. Separater 256-Bit-Schlüssel für Eigentümerergänzungen,
  nur als SHA-256 gespeichert, im Betrieb ersetzbar. Kein Kontozwang zum Lesen oder Ergänzen.
- Schlüsselrotation, Linksperre, Löschung, Versionsprüfung gegen Überschreiben durch parallele Geräte.
- Fotos lokal im Browser komprimiert und ohne EXIF neu gerendert; anschließend im geschützten
  Projektinhalt der Datenbank gespeichert. Für den kleinen Pilot maximal 8 Übergabefotos.
  Kein öffentlicher Bucket, kein externer Bilddienst. Supabase Storage ist noch nicht nötig.
- Kundenexport als JSON mit Fotos und als PDF über den Druckdialog; keine Bindung der Daten an ein einzelnes Handy.
- Serviceanfrage öffnet das E-Mail-Programm mit Projektkontext. Der Kunde sendet selbst und kann
  dort Fotos anhängen. Es gibt keine fingierte Versandbestätigung oder unbeaufsichtigte E-Mail-Automation.

## Architektur und Zugriffsgrenzen

Browser → Cloudflare Pages Functions `/api/*` → Supabase Auth / service-only RPC → private Tabellen.
Keine Supabase-Schlüssel im Browser. Kurzlebige Zugangssitzung im Secure/HttpOnly/SameSite-Cookie,
keine Session oder Kundendaten im localStorage. Alle API-Antworten `no-store`.
Hash-URL `/#p/<256-bit-token>` hält den Leseschlüssel aus den normalen Seitenzugriffslogs.
Er wird nur im POST-Body an die API gesendet. Keine Request-Bodies protokollieren.

`pp_private` wird nicht in der Data API exponiert. Alle Tabellen mit RLS, keine Rechte für
`anon`/`authenticated`; nur der Server darf die RPC aufrufen. Keine SECURITY-DEFINER-Funktion.
Jeder Betriebsvorgang prüft eine serverseitig aus Auth ermittelte Mitgliedschaft. Clientseitige
Rollenangaben werden ignoriert. Versionsprüfung und Statusänderung laufen in derselben SQL-Transaktion.

Der Server-Servicekey ist entsprechend privilegiert: ausschließlich als Cloudflare-Secret ablegen,
separates Supabase-Projekt verwenden und nie in Logs, Git, Browser-Konfiguration oder Chat kopieren.
Der öffentlich nutzbare Ergänzungsschlüssel ist ein Besitznachweis, keine Identitätsprüfung:
wer ihn kennt, kann Kundenergänzungen ändern. Er gehört nicht auf die frei lesbare NFC-Karte.

Im echten Pilot wird ein gelöschter Pass **stillgelegt**, nicht neu belegt. Sonst würde die
alte Karte eines Kunden später auf die Daten eines anderen Kunden zeigen. Die lokale Demo
kann weiterhin einen Pass zu Testzwecken freigeben.

## Einrichtung, sobald die neuen Konten verbunden sind

### Betreiberverwaltung und zusätzliche Pässe

Die additive Migration `operator_management_and_pass_batches` setzt `database/schema.sql`
voraus. `database/operator.sql` enthält den aktuellen SQL-Stand für lokale Integrationstests.
Die anschließende Migration `trade_templates` aktualisiert beide RPCs ohne Bestandsdaten
zu ändern. Neue Projekte speichern das Gewerk bei Aktivierung; ein späterer Profilwechsel
ändert bestehende Projektvorlagen nicht. Altdaten ohne Gewerk verwenden die Fliesenvorlage.
Die private Tabelle `operators` bestimmt Betreiberrechte; Browserangaben und Auth-
`user_metadata` werden dafür niemals ausgewertet. Alle Verwaltungsfunktionen prüfen
diese Berechtigung erneut auf dem Server beziehungsweise in der service-only RPC.

Der erste Betreiberzugang benötigt einen privat erzeugten 256-Bit-Einrichtungslink.
Nur sein SHA-256-Prüfwert wird in `pp_private.access_invites` mit `kind='operator'`
und begrenzter Laufzeit hinterlegt. Sobald ein Betreiber existiert, können solche
Startlinks keinen weiteren Betreiber anlegen. Die Oberfläche erzeugt ausschließlich
Betriebseinladungen, niemals Betreiberrechte.

Für den eigenen Betrieb: **Meinen Betrieb einrichten → Kontaktdaten → Gewerk wählen**.
Dafür wird der vorhandene Betreiberzugang verwendet; keine zweite Registrierung nötig.
Für weitere Betriebe: **Betriebe → Betrieb anlegen → Einrichtungslink erstellen**.
Nach der Zugangseinrichtung wählt der Betrieb sein Gewerk und bestätigt sein Profil.
Betriebslinks sind an eine E-Mail gebunden, sieben Tage gültig und einmal verwendbar.
Ein neuer Link ersetzt den bisherigen. Der Betreiber gibt den Link gezielt weiter;
die App verschickt keine E-Mails. Das Passwort wird vom Empfänger direkt festgelegt.
Bestehende Benutzer müssen ihr vorhandenes Passwort bestätigen; es wird nicht ersetzt.
Fünf Einrichtungsversuche innerhalb von 15 Minuten begrenzen weitere Versuche vorübergehend.
Ungültige Links erreichen die Auth-Benutzeranlage nicht.

Jeder Betriebszugang ist genau einem Betrieb zugeordnet. Ein Betreiber kann zusätzlich
einen eigenen Betriebszugang besitzen und zwischen Verwaltung und eigenen Projekten
wechseln. Die Verwaltung zeigt Betriebsprofile und Projektanzahlen, keine fremden
Projektinhalte. Kunden lesen weiterhin ohne Konto über ihren Passlink.

Unter **Projektpässe → Pässe hinzufügen** werden je Vorgang 1 bis 100 weitere Pässe
angelegt. Es gibt keine feste Gesamtgrenze von 20 Pässen. Die Nummern werden pro
Betrieb unter einer Datenbanksperre fortlaufend vergeben. Wiederholte Anfragen mit
derselben Vorgangs-ID erzeugen keine doppelten Pässe. Stillgelegte Nummern und Links
werden nicht wiederverwendet. **NFC-Links herunterladen** exportiert die Links, die
anschließend auf NFC-Tags geschrieben oder als QR-Code gedruckt werden.

### Infrastruktur und Freigabe

1. Eigenes Supabase-Projekt in **Frankfurt / eu-central-1** anlegen. Projekt-ID schriftlich prüfen.
   Bestehende Projekte nicht verwenden. Öffentliche Registrierung und anonyme Auth abschalten.
2. `database/schema.sql` im neuen Projekt anwenden, DB-Advisors und Rechte prüfen. Diese Datei ist
   ein lokal getesteter Schemaentwurf, keine bereits angewandte Migration. Danach mit Supabase CLI
   eine saubere Migration aus dem echten Zielstand erzeugen und committen.
3. Auth-Benutzer für den Fliesenbetrieb einrichten. Zugang sicher direkt an den Betrieb übergeben.
   `profile.example.json` anhand seiner echten Kontaktdaten, Lieblingsmaterialien und geprüften
   Pflegehinweise ausfüllen. Keine Beispiel-Pflegeberatung als echte Angabe übernehmen.
4. `node scripts/prepare-business.mjs AUTH_USER_UUID https://FESTE-DOMAIN profil.json` erzeugt
   prüfbare Einrichtungs-SQL und 20 NFC-Links. Ausgabe liegt unter dem Git-ignorierten `generated/`.
   Nach Prüfung SQL anwenden. NFC/QR erst mit endgültiger Domain produzieren; 01 bis 20 abgleichen.
5. Cloudflare Pages auf **das Repository-Hauptverzeichnis** ausrichten: Root leer, Ausgabe `public`,
   kein Build erforderlich. Pages Functions müssen mit veröffentlicht werden, nicht nur HTML per
   Drag & Drop hochladen. Eigene Domain mit HTTPS verbinden.
6. Runtime-Variablen: `APP_ORIGIN` (exakte HTTPS-Origin), `SUPABASE_URL`,
   `SUPABASE_PUBLISHABLE_KEY`. Als verschlüsseltes Secret: `SUPABASE_SECRET_KEY` (`sb_secret_…`).
   Eigene Preview-Konfiguration ohne Produktionsdaten. Secrets ausschließlich über sichere Kontozugriffe.
7. Cloudflare-Ratelimits insbesondere für `/api/login`, `/api/scan`, `/api/owner_save` konfigurieren
   und testen; Auth-Ratelimits allein schützen die übrigen API-Endpunkte nicht. Keine API-Caches.
8. Echte Betreiber-/Betriebsdaten, Verantwortlichkeiten, Datenschutzhinweise und Anbietervereinbarungen
   klären. Fertige `public/datenschutz.html` und `public/impressum.html` einfügen. Keine Tracking-Skripte,
   externen Schriften oder Analysepixel. EU-Datenbankregion allein ist keine Datenschutzfreigabe.
9. Backup/Restore im gewählten Tarif verifizieren, Aufbewahrung und Löschprozess festlegen.
   Projektlöschung wirkt sofort auf die App; Backup-Aufbewahrung ist davon getrennt.
10. `launch.example.json` nach `launch.local.json` kopieren; erst nach tatsächlicher Prüfung bestätigen.
    `npm run check` muss grün sein. Danach realer Zwei-Geräte-Test laut `ACCEPTANCE.md`.

## Lokale Prüfung

`npm ci --ignore-scripts && npm test`

Die Tests führen den SQL-Entwurf in PGlite (echte PostgreSQL-Engine als WASM) aus, einschließlich
Rollen, Transaktionen und Rechte. API-Tests prüfen die Servergrenze mit simulierten Supabase-Antworten.
DOM-Tests prüfen die Oberfläche. Sie ersetzen keine Supabase-Cloud-, Cloudflare- oder Smartphoneprüfung.

Abhängigkeiten sind nur für Tests, fest versioniert und mit Lockfile. Runtime nutzt Web APIs.
Infrastruktur: Cloudflare Pages unter `https://projekt-pass.pages.dev`, separates
Supabase-Projekt in Frankfurt. Live-Verbindung geprüft; Tests mit echten Zugangsdaten
und zwei Geräten erfolgen bei der Einrichtung des ersten Betreiber-/Betriebszugangs.

## Noch offene produktive Prüfungen

- Ersten persönlichen Betreiberzugang abschließen und anschließend Testbetriebe anlegen.
- Live Auth/Cookie-Verhalten, Ratelimits, Advisors, Backup-Restore und Zwei-Geräte-Fluss noch offen.
- Reale Darstellung und Fotoauswahl auf iPhone/Android, insbesondere HEIC, noch offen.
- Bestehende Demo-Daten werden absichtlich nicht automatisch veröffentlicht. Ein Import braucht
  ausdrückliche Auswahl und Prüfung, da sie auch private Felder und Beispielinformationen enthalten.

Aktuelle Primärquellen für die Umsetzung:
- https://supabase.com/changelog.md (abgerufen 23.09.2026; aktuelle Data-API-Grants berücksichtigt)
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/functions
- https://github.com/supabase/auth/blob/master/openapi.yaml
- https://developers.cloudflare.com/pages/functions/bindings/
- https://developers.cloudflare.com/pages/configuration/headers/
