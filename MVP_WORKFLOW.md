# Verbindlicher MVP: Aktivieren → Dokumentieren → Übergabe

Der Projektpass-MVP hat genau einen Arbeitsablauf:

1. Der Fachbetrieb aktiviert einen freien Projektpass und erfasst Kunde/Projekt.
2. Materialien und Systeme werden im bestehenden Material-Dashboard dokumentiert. Standardmaterialien, Katalog, Favoriten und Autosave bleiben erhalten.
3. Fotos sowie technische und projektbezogene Unterlagen werden ergänzt.
4. Die Abschlussprüfung zeigt Pflichtangaben, Fehlendes und Optionals verständlich an.
5. Der geprüfte Projektstand wird übergeben. Daraus entsteht der Kundenpass.
6. Der Kunde öffnet den freigegebenen Stand über den dauerhaften QR-/NFC-Link ohne App und ohne Kundenkonto.

Der Kunde hat im MVP ausschließlich Lesezugriff. Es gibt keine KI, kein Bautagebuch, keine Mitteilungen, keinen Chat, keine internen Notizen, keine Beteiligten- oder weiteren-Handwerker-Zugänge und keine Eigentümer-Ergänzungen.

## Bewusst beibehalten

Login und Betriebsprofil, Projektaktivierung, Materialkarten und Katalog, gespeicherte Standards, Fotos, Dokumente, Pflegehinweise, Autosave, Vollständigkeitsprüfung, Übergabe-Snapshot, Kundenansicht und QR/NFC bleiben aktive Kernfunktionen.

## Datenbank-Altbestand

Die früheren Tabellen und SQL-Zweige für `participants`, `messages`, `journal`, `mail_outbox` sowie `owner_key_hash`/`owner_additions` bleiben vorerst aus Kompatibilitätsgründen bestehen. Sie werden vom aktuellen Server nicht mehr als Operation akzeptiert, nicht aus der aktiven UI angesprochen und nicht in den Kundenprojektionen ausgegeben. Eine endgültige Migration oder Löschung erfolgt erst nach separater Bestands- und Abhängigkeitsprüfung.

## Betriebshinweis

Vor einem echten Testbetrieb müssen Supabase-RPC/Schema-Stand, RLS, Authentifizierung und die Cloudflare-Testumgebung separat geprüft werden. Der Branch ist als geschützte Teständerung gedacht; die Produktionswebsite wird nicht ungeprüft veröffentlicht.
