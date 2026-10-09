# BrickLog

Private Handy-App zum Dokumentieren gekaufter Klemmbaustein-Sets (BlueBrixx, Lumibricks,
CaDA, LEGO …): Sammlung, Bautagebuch mit Fotos, Wunschliste und Statistik.

**Stand:** Entwurf und Umsetzungsplan stehen, Code gibt es noch nicht.

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
oder den PC legen.

## Dokumente

- [Entwurf](docs/2026-10-09_Entwurf.md) — was die App kann und was bewusst nicht
- [Umsetzungsplan](docs/2026-10-09_Umsetzungsplan.md) — in welchen Schritten sie gebaut wird

## Starten (sobald der Code steht)

Im Projektordner in einem PowerShell-Fenster:

```powershell
npm install
npm run dev
```

`npm run dev` startet eine lokale Vorschau im Browser. `npm test` führt die automatischen
Tests aus, `npm run build` erzeugt die fertige App im Ordner `dist`.
