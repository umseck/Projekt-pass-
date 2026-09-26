# MVP: Aktivieren → Bauphase → Übergabe

## Benutzung

1. Pass aktivieren, Projektname eingeben und verwendete Materialien dokumentieren. Der Katalog ist auf Nutzerwunsch leer. Produkte können frei eingetragen und als Betriebsstandard gespeichert werden.
2. Im Projekt „Mitteilungen & Beteiligte“ öffnen. Personen mit geprüftem Namen, E-Mail und Rolle hinzufügen. Persönlichen Zugangslink kopieren oder mit angebundenem Maildienst automatisch versenden.
3. Mitteilung schreiben, einzelne Empfänger oder alle auswählen; alternativ interne Notiz. Fotos werden im Browser komprimiert, Unterlagen als Links ergänzt. Beteiligte sehen nur zugewiesene Mitteilungen und eigene Antworten. Antworten gehen in den Verlauf des betreuenden Betriebs; dafür gibt es im MVP keine zusätzliche E-Mail an den Betrieb.
4. Übergabe prüfen und bestätigen. Derselbe NFC-Link öffnet anschließend das Scheckheft. Der Übergabestand wird einmalig gesichert; spätere Änderungen sind datierte Wartungen, Reparaturen, Ergänzungen oder Korrekturen. Der Betrieb und der Eigentümer mit separatem Ergänzungsschlüssel können solche Einträge hinzufügen.

## Mailversand aktivieren

Die Integration verwendet die offizielle Resend Email API. Im aktuellen Deployment fehlen die Versandkonfiguration und ein echter Zustelltest. Ohne Konfiguration wird nichts als gesendet angezeigt. Persönliche Links funktionieren unabhängig davon.

In Cloudflare Pages → projekt-pass → Settings → Variables and Secrets, **Production**:

- `RESEND_API_KEY`: als verschlüsseltes Secret; Schlüssel eines Resend-Kontos mit bestätigter Absenderdomain.
- `MAIL_FROM`: freigegebener Absender, z. B. `PROJEKTPASS <projektpass@eigene-domain.de>`.
- `APP_ORIGIN`: bleibt `https://projekt-pass.pages.dev`.

Danach neu bereitstellen. Vor Freigabe des Mailversands Providervereinbarung und Datenschutzhinweise anhand des tatsächlich eingerichteten Kontos abschließen. Ein eigenes Testpostfach ausdrücklich als Beteiligten hinzufügen, Einladung empfangen, Link öffnen, Mitteilung gezielt senden und Eingang prüfen. Keine Schlüssel in Chat, Repository oder Browsercode eintragen.

Mailjobs werden zusammen mit Einladung/Mitteilung gespeichert. Der Pages-Server verarbeitet sie im Hintergrund. Einzelmails vermeiden das Offenlegen weiterer Empfänger. Stabile Resend-Idempotenzschlüssel verhindern doppelte Annahme innerhalb des Providerfensters (24 Stunden). Unter „E-Mail-Benachrichtigungen“ stehen ausstehende und fehlgeschlagene Versuche; Wiederholung erfolgt über den dortigen Button. Ein abgebrochener Versand wird nach fünf Minuten wieder freigegeben. Maximal fünf Versuche; danach technische Prüfung. „An Maildienst übermittelt“ ist keine Zustell- oder Lesebestätigung. Nach Ablauf des Providerfensters kann bei unklarem Versandstatus ein erneuter Versand nicht sicher dedupliziert werden.

## Installation und Grenzen

Neue Datenbank: `database/schema.sql`, dann `database/operator.sql`, zuletzt `database/workflow.sql`. Bestehende Installation: `database/workflow.sql` zusätzlich anwenden. Nicht danach eine ältere customer_view-Definition aus standards.sql installieren.

Vier neue Tabellen sind im privaten Schema, RLS eingeschaltet, keine Browserrollen haben Tabellen- oder RPC-Zugriff. Der Server prüft Mitgliedschaft; öffentliche Teilnehmeraufrufe verwenden persönliche zufällige Tokens. Gesperrte Teilnehmer sehen keine Inhalte. Die Sperre des NFC-Passes sperrt auch Teilnehmerzugänge. Projektlöschung entfernt Mitteilungen, Teilnehmer, Scheckheft und Mailwarteschlange; der physische Pass wird stillgelegt.

Grenzen des MVP: 20 aktive Beteiligte, 500 Mitteilungen pro Projekt, drei Fotos und drei Dokumentlinks je Eintrag, 20 Teilnehmerantworten pro Stunde, 30 Scheckhefteinträge pro Stunde. Keine Dateiablage für PDFs, sondern Dokumentlinks. Keine Push-Nachrichten, kein Live-Chat, keine automatische Terminerinnerung. Nächste Wartungstermine sind dokumentierte Angaben.

Bestehende übergebene Projekte sichern den bei Einführung verfügbaren Stand und kennzeichnen ihn entsprechend; frühere Zwischenstände werden nicht erfunden. Scheckhefteinträge sind in der Oberfläche unveränderlich; fachliche Korrekturen werden angehängt. Berichtigungs-/Löschungsanfragen zu personenbezogenen Einträgen erfordern Bearbeitung durch den Plattformbetrieb.

## Prüfung

Automatisiert: UI → API → SQL, Empfängerauswahl, fremde Projekte, interne Notizen, Idempotenz, Rückfragen, Zugangsperren, unveränderliche Übergabe, Eigentümerschlüssel, öffentliche Projektion und Mailfehler. Echte Mailzustellung, Smartphone/NFC sowie Wiederherstellung sind weiterhin reale Abnahmeschritte in ACCEPTANCE.md.
