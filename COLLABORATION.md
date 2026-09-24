# Bauphase und Übergabe

Regel 1: So einfach wie möglich für alle. Ein Pass, zwei Phasen. Niemand muss
für einen einzelnen Beitrag erst ein Firmenprofil oder Benutzerkonto anlegen.

## Bedienung

1. Betrieb aktiviert einen Pass mit Projektnamen. Derselbe NFC-/QR-Link öffnet
   während der Bauphase eine Hinweistafel. Interne Kundenfelder und Materialien
   werden auf dieser Türansicht nicht ausgegeben.
2. Betrieb schreibt/diktiert einen Hinweis, optional mit Foto und Frist. Er kann
   eigene Hinweise als erledigt entfernen. Hinweise ohne Frist bleiben offen.
   Abgelaufene Hinweise sind ausdrücklich markiert. Wichtige Sperrungen gehören
   zusätzlich sichtbar an die Tür. „Hinweise aktualisieren“ lädt den aktuellen Stand.
3. „Gewerk einladen“ braucht nur einen Namen, etwa „Huber Sanitär“. Der persönlich
   weitergegebene Link erlaubt ausschließlich den eigenen Beitrag und eigene
   Baustellenhinweise. Kein automatischer Versand. Etikettfoto statt Abschreiben
   ist möglich. Beiträge für die Kundenmappe sind getrennt von temporären Hinweisen.
4. „An Kunden übergeben“ mit Bestätigung löscht Baustellenhinweise und beendet
   atomar sämtliche bisherigen Gewerkzugänge. Beiträge, Materialien und Fotos
   bleiben erhalten. Die Karte muss nicht getauscht werden.
5. Der Betrieb gibt zusätzlich den persönlichen Kundenzugang weiter. Nach dem
   ersten geschützten Zugriff verwaltet der Kunde die Firmenzugänge. Er kann Firmen
   neu einladen oder einen Zugang für ein vorhandenes Gewerk erneuern. Der alte
   Link wird dadurch ungültig. Jeder Beitrag bleibt separat editierbar.
6. Das Betriebsdashboard behält das Projekt und die eigenen Materialien. Spätere
   Kundenergänzungen und Firmenbeiträge werden dort nicht automatisch angezeigt.
   Nach Übernahme kann der Betrieb den Kundenschlüssel nicht ersetzen und den Pass
   nicht mehr sperren oder löschen. Seine eigenen Materialangaben kann er korrigieren.

## Zugriffsmodell und Pilotgrenzen

- Die NFC-Karte ist ein Leseschlüssel. Wer ihn kennt, kann die jeweils freigegebene
  Ansicht lesen. Nach Übergabe gehören auch freigegebene Firmenbeiträge dazu.
  Dies ist keine geheime Kundenakte gegenüber Personen mit Kartenlink.
- Persönliche Links sind Besitznachweise, keine Identitätsprüfung. Die Beschriftung
  „Über den persönlichen Firmenlink ergänzt“ behauptet keine verifizierte Identität.
- Schreibschlüssel: 256 zufällige Bits, nur SHA-256-Hashes in der Datenbank.
  Keine Schlüssel in Query-Strings, localStorage oder Serverlogs.
- Bis zu 20 eingeladene Gewerke und 100 offene Hinweise pro Projekt. Je Gewerk ein
  kompakter Beitrag: Produkttext, Notiz, ein komprimiertes Foto, ein Unterlagenlink.
  Mehrere Produkte können im Text beschrieben werden; keine neue Katalogverwaltung.
- Keine E-Mail-Automatik, kein Push und keine Lesebestätigung. Der Einladende kopiert
  den Link und gibt ihn selbst weiter. Für kritische Absprachen persönlich nachfragen.
- Andere Firmen haben im Pilot ihren persönlichen Beitragslink; ein eigenes
  projektübergreifendes Firmenkonto wird dadurch noch nicht automatisch angelegt.
- Ein verlorener Kundenzugang nach Übernahme benötigt einen geprüften Supportweg.
  Es gibt bewusst keinen automatischen Reset über den ursprünglichen Betrieb.
- Keine Konten-/Eigentumsverifikation: Vor einem breiteren Rollout sind sichere
  Wiederherstellung, Aufbewahrung und der Auskunfts-/Löschprozess auszuarbeiten.

## Installation und Nachweis

Neuinstallation: zuerst `database/schema.sql`, danach `database/collaboration.sql`.
Bestehende Pilotdatenbank: nur `collaboration.sql`, genau einmal und transaktional.
Die vorherige RPC wird intern weiterverwendet; öffentlich bleibt ausschließlich
`public.pp_api`. Tabellen und Funktionen sind nur für `service_role` zugänglich.

`npm test` prüft echte PostgreSQL-Semantik mit PGlite sowie Oberfläche → API → SQL:
Isolation zwischen Gewerken, fremde Projekte, veraltete Schreibstände, Schlüssel-
wechsel, Übergabe, Entfernung der Hinweise, Beitragsbestand, Kundeneinladungen,
Betriebsdashboard und gesperrte Direktzugriffe. Cloudflare-Einrichtung und reale
Smartphoneabnahme bleiben eigene, bisher nicht abgeschlossene Prüfschritte.
