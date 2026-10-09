# BrickLog

Private Handy-App zum Dokumentieren gekaufter Klemmbaustein-Sets (BlueBrixx, Lumibricks,
CaDA, LEGO …): Sammlung, Bautagebuch mit Fotos, Wunschliste und Statistik.

**Stand 09.10.2026:** Version 1.5.1. Es gibt die App in zwei Formen mit demselben Inhalt:

| Form | Wo | Wofür |
|---|---|---|
| **Android-App (APK)** | <https://github.com/Nikdas1234/BrickLog/releases/download/apk/BrickLog.apk> | das Handy, die Hauptform |
| Web-App | <https://nikdas1234.github.io/BrickLog/> | zum Ausprobieren im Browser, auch am PC |

Am PC im Browser durchgetestet. Die Android-App wird bei GitHub gebaut und signiert; auf
einem echten Handy ist sie noch nicht abgenommen (Installation, Kamera, Ränder an
Statusleiste und Navigationsleiste, Sicherung über den Teilen-Dialog, Selbstaktualisierung).

## Auf dem Handy installieren

1. Auf dem Handy im Browser diese Adresse öffnen, der Download startet:
   <https://github.com/Nikdas1234/BrickLog/releases/download/apk/BrickLog.apk>
2. Die heruntergeladene Datei `BrickLog.apk` antippen.
3. Android fragt beim ersten Mal, ob der Browser Apps installieren darf: **Einstellungen**
   antippen, **Dieser Quelle vertrauen** einschalten, zurück, **Installieren**.
4. Meldet Play Protect eine unbekannte App, **Trotzdem installieren** wählen. Das ist bei
   jeder App so, die nicht aus dem Play Store kommt.

## Aktualisieren

Ab Version 1.5.0 hält sich die App selbst aktuell. Sie schaut beim Start und beim
Zurückkehren in den Vordergrund (höchstens alle sechs Stunden) nach, ob es etwas Neues
gibt. Dafür braucht sie Internet; ohne Verbindung läuft sie einfach weiter.

| Was sich geändert hat | Was passiert | Was du tust |
|---|---|---|
| Inhalte: Oberfläche, Kataloge, Fehlerkorrekturen (der Normalfall) | Die App lädt die neue Fassung im Hintergrund. Sie wird beim nächsten Start aktiv; ein Hinweis bietet „Jetzt anwenden“ an. | nichts |
| Die Android-Hülle: Icon, neue Gerätefunktionen (selten) | Die App zeigt „Neue App-Version“ mit einem Knopf zum Herunterladen. | APK herunterladen und drüberinstallieren |

Welche Fassung läuft, steht unter *Einstellungen* ganz unten, z. B. „BrickLog 1.5.0
(Bau 6)“. Startet eine nachgeladene Fassung nicht richtig, kehrt die App nach zehn
Sekunden von selbst zur Fassung aus der APK zurück und lädt die fehlerhafte nicht erneut.

Von Hand geht es weiterhin: die Download-Adresse oben erneut öffnen und die neue Datei
installieren. Android ersetzt die App, die Daten bleiben.

**Für Änderungen an der Hülle** (neues Capacitor-Plugin, Icon, Android-Einstellungen) muss
`nativeVersion` in `package.json` um eins erhöht werden. Daran erkennt die App, dass
nachgeladene Inhalte nicht genügen und eine neue APK nötig ist.

**Web-App und Android-App teilen keine Daten.** Wer in der Web-App schon Sets angelegt
hat: dort *Sicherung exportieren*, in der Android-App *Sicherung einspielen*.

## Der Signaturschlüssel

Jede APK wird mit einem Schlüssel signiert. Android nimmt eine neue Fassung nur als
Aktualisierung an, wenn sie denselben Schlüssel trägt. Er liegt im Ordner `geheim`
(von Git ausgeschlossen, **nicht** auf GitHub) und zusätzlich als verschlüsseltes Secret
im GitHub-Repository, damit der automatische Bau signieren kann.

**Den Ordner `geheim` an einen zweiten Ort kopieren** (USB-Stick, Passwortmanager). Geht
der Schlüssel verloren, lässt sich die App nur noch durch Deinstallieren und
Neuinstallieren ersetzen; vorher Sicherung exportieren. Den Ordner nie weitergeben.

## Was die App ist

- Im Kern eine Web-App. Für das Handy wird sie mit Capacitor (einem Werkzeug, das eine
  Web-App in eine Android-Hülle steckt) zu einer echten Android-App verpackt. Sie läuft
  ohne Internet.
- **Alle Daten liegen nur auf dem Handy** (im Speicher der App). Es gibt kein Konto,
  keinen Server, keinen Abgleich mit anderen Geräten.
- Gebaut und bereitgestellt wird sie über ein öffentliches GitHub-Repository. Dort liegen
  nur Programmcode und die fertige APK, keine Sets und keine Fotos.

## Was man wissen muss

**Die Datensicherung ist Handarbeit.** Wer die App deinstalliert oder in den
Android-Einstellungen ihre Daten löscht, löscht Sammlung und Fotos. Die App erinnert nicht
ans Sichern. Regelmäßig unter *Einstellungen → Sicherung exportieren* eine ZIP-Datei
erzeugen und im Teilen-Dialog in „Eigene Dateien“ oder auf Google Drive ablegen.
*Sicherung einspielen* ersetzt den gesamten Bestand durch den Inhalt der Datei.

## Bedienung in Kürze

| Reiter | Wozu |
|---|---|
| Sammlung | Alle Sets, die du besitzt. Suche, Filter nach Hersteller und Thema, `+` legt ein Set an. |
| Wunschliste | Sets, die du haben möchtest, mit Preis und Priorität. „Gekauft“ verschiebt in die Sammlung. |
| Statistik | Anzahl, Teile, Ausgaben, Bauzeit, Aufteilung nach Hersteller. |
| Einstellungen | Sicherung exportieren und einspielen, Herstellerliste pflegen. |

Beim Anlegen eines Sets oder Wunschs lässt sich ein **Set von BlueBrixx oder Lumibricks
aus dem Katalog übernehmen**: Setnummer oder Name ins Suchfeld tippen, Treffer antippen.
Name, Nummer, Reihe, Teilezahl, Preis und Titelbild werden ausgefüllt, bei Wünschen auch
der Shop-Link. Der Preis ist der Shop-Preis und bleibt änderbar. Die Kataloge sind Abzüge der Shops; Sets, die ein Shop nicht mehr führt,
fehlen darin. BlueBrixx-Titelbilder lädt nur die Android-App, nicht die Web-App.

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
| `npm run build` | erzeugt die Web-App im Ordner `dist` |
| `npm run build:app` | erzeugt den Inhalt der Android-App und kopiert ihn nach `android` |
| `npm run preview` | zeigt die fertig gebaute Web-App aus `dist` an |
| `npm run katalog:lumibricks` | ruft den Lumibricks-Katalog neu aus dem Shop ab (rund 1 Minute) |
| `npm run katalog:bluebrixx` | ruft den BlueBrixx-Katalog neu aus dem Shop ab (mehrere Minuten) |

Die APK selbst wird nicht am PC gebaut, sondern bei GitHub: Jeder Push auf `main` erzeugt
eine neue, signierte `BrickLog.apk` unter der Download-Adresse oben, dazu das
Inhaltspaket `bundle.zip` und die Versionsdatei `version.json`, aus denen sich installierte
Apps selbst aktualisieren. Das gilt auch für neu abgerufene Kataloge: abrufen, committen,
pushen; die Apps holen sie sich.

## Aufbau

- `src/lib` — die Fachlogik ohne Oberfläche: Datenhaltung (`db.ts`), Filter und
  Sortierung (`sets.ts`), Katalogsuche, Statistik, Fotoverkleinerung, Sicherung. Dazu
  gehören die Tests in `tests`.
- `src/data` — die Kataloge als Abzüge: Lumibricks (128 Sets) und BlueBrixx (746 Sets),
  Stand jeweils in der Datei.
- `src/routes` — die sieben Seiten der App.
- `src/components` — wiederverwendete Bausteine (Reiterleiste, Dialog, Fotoanzeige …).
- `android` — das Android-Projekt, also die Hülle um die Web-App. Icons und Startbild
  darin entstehen aus `assets` über `scripts/make-app-icons.mjs`.
- `geheim` — der Signaturschlüssel. Nur lokal, nie im Repository.
- `.github/workflows/deploy.yml` — veröffentlicht bei jedem Push auf `main` die Web-App.
- `.github/workflows/android.yml` — baut bei jedem Push auf `main` die signierte APK.

