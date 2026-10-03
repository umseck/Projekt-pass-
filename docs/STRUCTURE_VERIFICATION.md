# Prüfnachweis: Datei- und Ordnerstruktur

Datum: 3. Oktober 2026. Ausgangsstand: `main` / `da381977`.
Branch: `refactor/projektpass-file-structure`.

## Tatsächlich durchgeführt

| Prüfung | Ergebnis |
| --- | --- |
| Bestehende Tests vor Änderung | 48 bestanden, 0 Fehler |
| Gesamte Testsuite nach Bereinigung | 50 bestanden, 0 Fehler |
| Neue Strukturtests | Statische/dynamische Imports, HTML-Assets, CSS-Reihenfolge, Erreichbarkeit aller Browsermodule und Importzyklen geprüft |
| Syntaxprüfung | Alle 26 Laufzeitmodule mit `node --check` erfolgreich |
| Strikter Quellvergleich mit Ausgangsstand | 74 bestehende Quell-/Konfigurationsdateien verglichen; bestehender Code ausschließlich durch Pfadkorrekturen geändert |
| Styles und QR-Bibliothek | Sieben Stylesheets und zwei Vendor-Dateien inhaltlich identisch; CSS-Ladereihenfolge identisch |
| Lokaler HTTP-Dateiserver | 37 HTML-/JS-/CSS-/JSON-Dateien mit HTTP 200 und vollständigem Inhaltsvergleich geprüft |
| Patchprüfung | `git diff --check` erfolgreich |
| Bestehende Freigabeprüfung | `npm run check` bleibt blockiert: bestätigte `launch.local.json` fehlt |

## Was die automatisierten Integrationstests abdecken

Happy-DOM-Oberfläche → bestehender API-Handler → lokale PGlite-Datenbank:
Login mit fiktiven Auth-Antworten, Betreiber-/Betriebs-Einrichtung,
Projektaktivierung, Materialien, Favoriten, Standardaufbau, Autosave,
Versionskonflikte, Übergabe, Kundenansicht und erneutes Öffnen.
Zusätzlich: Mandantentrennung, readonly Kundenstand, unveränderlicher Snapshot,
Offlineexport und Dekodierung des erzeugten QR-Codes auf den richtigen Link.
Foto-/Dokumentdaten werden in Tests als vorbereitete Daten validiert;
das ist keine echte Kameraaufnahme oder vollständige Smartphone-Uploadprüfung.

Diese Tests verwenden weder das echte Konto noch echte Kundenprojekte.
Es wurden keine produktiven Datenbankänderungen oder Cloudflare-
Konfigurationsänderungen vorgenommen.

## Nicht durchgeführt / noch vor Veröffentlichung offen

- Echter Browser-/Screenshotvergleich: Chromium ist in der Umgebung nicht
  installiert; der versuchte Browserdownload schlug mit einer ungültigen
  Download-Datei fehl. Keine erfolgreiche Browserprüfung behauptet.
- Echte Anmeldung gegen Supabase und vollständiger Test am Smartphone.
- Kameraaufnahme, Bildkomprimierung und PDF-Upload im echten Browser.
- Mobiler Sichttest einschließlich Footer, Tastatur und Dateiauswahl.
- Echter QR-/NFC-Scan auf einem zweiten Gerät gegen die geänderte Version.
- Geschützte Cloudflare-Testveröffentlichung: nicht eingerichtet. Die
  automatische Veröffentlichung dieses Branches wird über den Commitpräfix
  `[CF-Pages-Skip]` unterdrückt; es gibt deshalb keinen neuen Testlink.

Der identische CSS-Inhalt und der auf reine Pfadänderungen begrenzte
Quellvergleich sprechen für unveränderte Gestaltung und Verhalten.
Sie ersetzen keinen visuellen Test in einem echten Browser.

## Umfang und erhaltene Grenzen

31 Dateien verschoben: 22 eigene Browsermodule, sieben Stylesheets,
QR-Bibliothek und zugehörige Lizenz. HTML-Einstiege, Serverimporte,
Testimporte und Katalogdokumentation verweisen auf die neue Struktur.
Alte öffentliche Dateiduplikate entfernt; keine Produktfunktion entfernt
oder ergänzt. Neues Verhalten gibt es ausschließlich in technischen Tests.

Unverändert: Paketabhängigkeiten, SQL und Migrationen, Sicherheitsheader,
API-Routen, Rollen, Auth, Datenformat, Katalogadresse, Kundenlinks,
Übergabe-Snapshots sowie Offlineexport mit eingebettetem CSS.
Der umfangreichere Anwendungskoordinator wurde bewusst nicht funktional
umgeschrieben; die bestehende ältere Projektansicht bleibt erhalten.

Steckerl, FundKey und Bauakte wurden nicht bearbeitet.

## Nachprüfung des Zugangs am 3. Oktober 2026

Nach dem Auftrag zur selbstständigen Fortsetzung wurde der Cloudflare-Zugang
erneut geprüft. Keine passende administrative Cloudflare-Integration verfügbar.
Der Cloud-Browser öffnet die Anmeldeseite, zeigt aber „There was a problem with
verification. Please reload and try again.“ und eine deaktivierte Anmeldung.
Ein einzelner Reload beseitigte den Fehler nicht. Keine Zugangsdaten eingegeben,
keine Schutzmaßnahmen umgangen und keine Cloudflare-Einstellungen geändert.

Der Versuch, die lokale Dateivorschau im Cloud-Browser zu öffnen, wurde mit
`ERR_BLOCKED_BY_CLIENT` abgelehnt. Das ist eine Browser-/Netzwerkbeschränkung,
kein nachgewiesener Fehler der Anwendung. Der temporäre Testserver wurde beendet.
Eine manuelle Anmeldung/Verifizierung im bereitgestellten Cloud-Browser ist
für die administrative Fortsetzung erforderlich. Die produktive Anwendung
und der geprüfte Laufzeitcode bleiben unverändert.
