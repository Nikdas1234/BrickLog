# BrickLog

Private Handy-App zum Dokumentieren gekaufter Klemmbaustein-Sets (BlueBrixx, Lumibricks,
CaDA, LEGO …): Sammlung, Bautagebuch mit Fotos, Wunschliste und Statistik.

**Stand 09.10.2026:** Version 1.2.0 ist veröffentlicht unter
<https://nikdas1234.github.io/BrickLog/> (Repository: <https://github.com/Nikdas1234/BrickLog>).
Am PC im Browser durchgetestet. Noch offen: die Abnahme auf dem Handy (Installation,
Kamera, Offline-Betrieb).

## Auf dem Handy installieren

1. Auf dem Handy in **Chrome** die Adresse <https://nikdas1234.github.io/BrickLog/> öffnen.
2. Menü (drei Punkte oben rechts) → **Zum Startbildschirm hinzufügen** → **Installieren**.
3. Die App über das neue Icon „BrickLog“ starten. Ab jetzt läuft sie ohne Internet.

Aktualisiert wird sie von selbst: Jeder Push auf `main` veröffentlicht eine neue Fassung,
die App lädt sie beim nächsten Start mit Internetverbindung. Die Daten bleiben erhalten.

## Was die App ist

- Eine **installierbare Web-App (PWA)**: eine Webseite, die sich über Chrome wie eine App
  aufs Handy legen lässt und danach ohne Internet läuft.
- **Alle Daten liegen nur auf dem Handy** (im Speicher von Chrome). Es gibt kein Konto,
  keinen Server, keinen Abgleich mit anderen Geräten.
- Ausgeliefert wird sie über GitHub Pages aus einem öffentlichen Repository. Dort liegt nur
  der Programmcode, keine Sets und keine Fotos.

## Was man wissen muss

**Die Datensicherung ist Handarbeit.** Wer in Chrome die Websitedaten löscht oder die App
deinstalliert, löscht Sammlung und Fotos. Die App erinnert nicht ans Sichern. Regelmäßig
unter *Einstellungen → Sicherung exportieren* eine ZIP-Datei erzeugen und auf Google Drive
oder den PC legen. *Sicherung einspielen* ersetzt den gesamten Bestand durch den Inhalt
der Datei.

## Bedienung in Kürze

| Reiter | Wozu |
|---|---|
| Sammlung | Alle Sets, die du besitzt. Suche, Filter nach Hersteller und Thema, `+` legt ein Set an. |
| Wunschliste | Sets, die du haben möchtest, mit Preis und Priorität. „Gekauft“ verschiebt in die Sammlung. |
| Statistik | Anzahl, Teile, Ausgaben, Bauzeit, Aufteilung nach Hersteller. |
| Einstellungen | Sicherung exportieren und einspielen, Herstellerliste pflegen. |

Beim Anlegen eines Sets oder Wunschs lässt sich ein **Lumibricks-Set aus dem Katalog
übernehmen**: Setnummer oder Name ins Suchfeld tippen, Treffer antippen. Name, Nummer,
Reihe, Teilezahl und Titelbild werden ausgefüllt, bei Wünschen auch ein Richtpreis.

Auf der Seite eines Sets: Titelbild setzen, Bautagebuch-Einträge mit Fotos
anlegen. Tippen auf ein Foto öffnet die Vollbildansicht zum Durchwischen.

## Am PC starten

Im Projektordner in einem PowerShell-Fenster:

```powershell
npm install
npm run dev
```

`npm run dev` startet eine lokale Vorschau und nennt die Adresse
(`http://localhost:5173/`). Weitere Befehle:

| Befehl | Wirkung |
|---|---|
| `npm test` | führt die automatischen Tests der Fachlogik aus |
| `npm run check` | prüft den Code auf Typfehler |
| `npm run build` | erzeugt die fertige App im Ordner `dist` |
| `npm run preview` | zeigt die fertig gebaute App aus `dist` an |
| `npm run katalog` | ruft den Lumibricks-Katalog neu aus dem Shop ab (danach committen und pushen) |

## Aufbau

- `src/lib` — die Fachlogik ohne Oberfläche: Datenhaltung (`db.ts`), Statusregeln und
  Filter (`sets.ts`), Statistik, Fotoverkleinerung, Sicherung. Dazu gehören die Tests in
  `tests`.
- `src/data` — der Lumibricks-Katalog als Abzug (128 Sets, Stand siehe Datei).
- `src/routes` — die sieben Seiten der App.
- `src/components` — wiederverwendete Bausteine (Reiterleiste, Dialog, Fotoanzeige …).
- `.github/workflows/deploy.yml` — baut und veröffentlicht die App bei jedem Push auf
  `main`, sobald das Repository auf GitHub liegt.

## Dokumente

- [Entwurf](docs/2026-10-09_Entwurf.md) — was die App kann und was bewusst nicht
- [Umsetzungsplan](docs/2026-10-09_Umsetzungsplan.md) — in welchen Schritten sie gebaut wurde
