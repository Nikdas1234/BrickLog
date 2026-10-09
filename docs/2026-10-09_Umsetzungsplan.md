# BrickLog v1 — Umsetzungsplan

**Goal:** Eine installierbare, offline lauffähige Web-App, in der Niklas gekaufte Klemmbaustein-Sets mit Stammdaten, Bautagebuch samt Fotos, Wunschliste und Statistik auf seinem Samsung-Handy führt.

**Architecture:** Die gesamte Fachlogik liegt als reine, getestete TypeScript-Module in `src/lib` (Daten, Statusregeln, Statistik, Sicherung). Die Svelte-Oberfläche in `src/routes` und `src/components` ruft nur diese Module auf und enthält selbst keine Regeln. Alle Daten liegen in einer IndexedDB-Datenbank im Browser; es gibt keinen Server.

**Tech Stack:** Vite, Svelte 5 (Runes), TypeScript, `vite-plugin-pwa`, `idb` (IndexedDB-Hülle), `fflate` (ZIP), Vitest + `fake-indexeddb` für Tests. Node.js 24.

**Spec:** [docs/2026-10-09_Entwurf.md](2026-10-09_Entwurf.md)

## Global Constraints

- Alle sichtbaren Texte deutsch, Du-Form. Bezeichner und Code-Kommentare englisch.
- Preise intern als ganze Cent (`number | null`), Anzeige `12,99 €`, Eingabe mit Komma.
- Datumswerte intern als `YYYY-MM-DD`-Text, Anzeige `TT.MM.JJJJ`.
- Fotos: JPEG, längere Kante höchstens 1600 px, Qualität 0.85, gespeichert als `ArrayBuffer`.
- Vite `base: '/BrickLog/'` (GitHub Pages). Navigation nur über den Hash-Teil der Adresse (`#/…`).
- Keine Netzwerkzugriffe zur Laufzeit außer dem Laden der App selbst. Keine Analyse-, Schrift- oder CDN-Dienste.
- Helles und dunkles Design über `prefers-color-scheme`, Farben als CSS-Variablen auf `:root`.
- Bedienbar bei 360 px Breite, Tippflächen mindestens 44 × 44 px.
- Nach jedem Task ein Commit mit deutscher Nachricht.
- Befehle im Plan sind PowerShell-Syntax, ausgeführt in `C:\Claude Projekte\BrickLog`.

## Review Focus

1. **Beschädigte oder fremde ZIP-Datei beim Einspielen** — der vorhandene Bestand bleibt vollständig erhalten, es erscheint eine Fehlermeldung. → Test in Task 6.
2. **Preiseingabe mit Komma, Punkt, leer oder Unsinn** („12,99“, „12.99“, „“, „abc“, „-5“) — leer heißt „kein Preis“, Unsinn und negative Werte werden abgelehnt statt als 0 gespeichert. → Test in Task 2.
3. **Löschen hinterlässt keine Reste** — ein gelöschtes Set nimmt Einträge und Fotos mit; ein gelöschtes Foto, das Titelbild war, leert das Titelbild. → Test in Task 3.
4. **Foto, das der Browser nicht lesen kann** (z. B. HEIC aus der Samsung-Galerie) — der Eintrag wird mit den übrigen Fotos gespeichert, das unlesbare wird mit Namen gemeldet. → Test in Task 5, Anzeige in Task 9.
5. **Speichern schlägt mittendrin fehl** (Speicher voll) — kein halber Eintrag ohne seine Fotos; Eintrag und Fotos werden in einer Transaktion geschrieben. → Test in Task 3.

## Dateistruktur

```
index.html
vite.config.ts            Vite, Svelte, PWA-Manifest, base
public/icon.svg           Quelle für die App-Icons
src/main.ts               Start, DB öffnen, storage.persist()
src/App.svelte            Rahmen: Route anzeigen, TabBar
src/app.css               Farbvariablen, Grundlayout
src/lib/types.ts          BrickSet, LogEntry, Photo, Status, Priority, BackupData
src/lib/format.ts         Euro und Datum
src/lib/db.ts             IndexedDB: öffnen, lesen, schreiben, löschen
src/lib/sets.ts           Statusregeln, Gekauft, Filter, Sortierung, Vorschläge
src/lib/stats.ts          Statistik
src/lib/photos.ts         Verkleinern
src/lib/backup.ts         ZIP bauen und lesen
src/lib/router.ts         Hash → Route
src/components/           TabBar, SetCard, WishRow, SuggestInput, ConfirmDialog, PhotoPicker, PhotoViewer
src/routes/               Collection, Wishlist, Stats, Settings, SetDetail, SetForm, EntryForm
tests/                    je Modul eine *.test.ts
.github/workflows/deploy.yml
```

---

### Task 1: Projektgerüst

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.ts`, `src/App.svelte`, `src/app.css`, `public/icon.svg`, `.gitignore`, `tests/smoke.test.ts`

**Interfaces:**
- Produces: Skripte `npm run dev`, `npm run build`, `npm test` (= `vitest run`), `npm run check` (= `svelte-check`).

- [ ] **Step 1:** Gerüst mit `npm create vite@latest . -- --template svelte-ts` anlegen (vorhandene README und `docs` behalten), dann `npm install idb fflate` und `npm install -D vitest fake-indexeddb vite-plugin-pwa @vite-pwa/assets-generator`.
- [ ] **Step 2:** `vite.config.ts`: `base: '/BrickLog/'`, `VitePWA` mit `registerType: 'autoUpdate'`, Manifest `name: 'BrickLog'`, `short_name: 'BrickLog'`, `lang: 'de'`, `display: 'standalone'`, `start_url: '.'`, `theme_color` und `background_color` aus `app.css`, Icons 192 px, 512 px und 512 px `maskable`. Vitest-Abschnitt mit `environment: 'node'`, `include: ['tests/**/*.test.ts']`.
- [ ] **Step 3:** `public/icon.svg` zeichnen (ein 2×2-Noppenstein von oben, einfarbiger Grund) und mit `npx pwa-assets-generator --preset minimal-2023 public/icon.svg` die PNGs erzeugen.
- [ ] **Step 4:** `tests/smoke.test.ts` mit `expect(1 + 1).toBe(2)`; `App.svelte` zeigt nur die Überschrift „BrickLog“.
- [ ] **Step 5:** Run: `npm test; npm run check; npm run build` — Expected: Test grün, 0 Fehler, `dist/manifest.webmanifest` und `dist/sw.js` vorhanden.
- [ ] **Step 6:** Commit „Projektgerüst mit Vite, Svelte und PWA-Grundlage“.

---

### Task 2: Typen und Formatierung

**Files:**
- Create: `src/lib/types.ts`, `src/lib/format.ts`, `tests/format.test.ts`

**Interfaces:**
- Produces:

```ts
export type Status = 'wunsch' | 'ungebaut' | 'im_bau' | 'fertig' | 'abgegeben';
export type Priority = 'hoch' | 'mittel' | 'niedrig';
export const STATUS_LABEL: Record<Status, string>; // Wunschliste, ungebaut, im Bau, fertig, abgegeben
export interface BrickSet {
  id: string; name: string; manufacturer: string; setNumber: string; theme: string;
  pieceCount: number | null; priceCents: number | null; purchaseDate: string | null;
  retailer: string; location: string; note: string; coverPhotoId: string | null;
  status: Status; buildStart: string | null; buildEnd: string | null;
  shopUrl: string; priority: Priority | null; createdAt: string; updatedAt: string;
}
export interface LogEntry {
  id: string; setId: string; date: string; note: string; section: string;
  minutes: number | null; photoIds: string[]; createdAt: string;
}
export interface Photo { id: string; setId: string; data: ArrayBuffer; width: number; height: number; createdAt: string; }
export interface BackupData { sets: BrickSet[]; entries: LogEntry[]; photos: Photo[]; manufacturers: string[]; }

export type EuroResult = { ok: true; cents: number | null } | { ok: false };
export function parseEuro(input: string): EuroResult;
export function formatEuro(cents: number | null): string;   // null → '–'
export function formatDate(iso: string | null): string;     // null → '–'
export function todayIso(now?: Date): string;               // lokales Datum
export function formatMinutes(minutes: number): string;     // 135 → '2 h 15 min'
```

- [ ] **Step 1: Test schreiben** (`tests/format.test.ts`)

```ts
expect(parseEuro('12,99')).toEqual({ ok: true, cents: 1299 });
expect(parseEuro('12.99')).toEqual({ ok: true, cents: 1299 });
expect(parseEuro(' 1.234,50 € ')).toEqual({ ok: true, cents: 123450 });
expect(parseEuro('40')).toEqual({ ok: true, cents: 4000 });
expect(parseEuro('')).toEqual({ ok: true, cents: null });
expect(parseEuro('abc')).toEqual({ ok: false });
expect(parseEuro('-5')).toEqual({ ok: false });
expect(parseEuro('12,999')).toEqual({ ok: false });
expect(formatEuro(1299)).toBe('12,99 €');
expect(formatEuro(123450)).toBe('1.234,50 €');
expect(formatEuro(null)).toBe('–');
expect(formatDate('2026-10-09')).toBe('09.10.2026');
expect(todayIso(new Date(2026, 9, 9, 23, 30))).toBe('2026-10-09');
expect(formatMinutes(135)).toBe('2 h 15 min');
expect(formatMinutes(45)).toBe('45 min');
```

- [ ] **Step 2:** Run: `npm test` — Expected: FAIL, Modul fehlt.
- [ ] **Step 3:** `types.ts` und `format.ts` umsetzen. `parseEuro`: Ein Punkt gilt als Tausenderzeichen nur, wenn zusätzlich ein Komma vorkommt; sonst als Dezimalzeichen.
- [ ] **Step 4:** Run: `npm test` — Expected: PASS.
- [ ] **Step 5:** Commit „Datentypen sowie Euro- und Datumsformatierung“.

---

### Task 3: Datenbank

**Files:**
- Create: `src/lib/db.ts`, `tests/db.test.ts`

**Interfaces:**
- Consumes: Typen aus Task 2.
- Produces:

```ts
export const DEFAULT_MANUFACTURERS = ['BlueBrixx', 'Lumibricks', 'CaDA', 'Cobi', 'LEGO', 'Mould King', 'Pantasy'];
export type BrickDb = IDBPDatabase<BrickSchema>;
export function openBrickDb(name?: string): Promise<BrickDb>;   // Standard 'bricklog', Version 1
export function listSets(db: BrickDb): Promise<BrickSet[]>;
export function getSet(db: BrickDb, id: string): Promise<BrickSet | undefined>;
export function putSet(db: BrickDb, set: BrickSet): Promise<void>;          // setzt updatedAt
export function deleteSet(db: BrickDb, id: string): Promise<void>;          // mit Einträgen und Fotos
export function listEntries(db: BrickDb, setId: string): Promise<LogEntry[]>; // neueste zuerst
export function listAllEntries(db: BrickDb): Promise<LogEntry[]>;
export function getEntry(db: BrickDb, id: string): Promise<LogEntry | undefined>;
export function saveEntryWithPhotos(db: BrickDb, entry: LogEntry, newPhotos: Photo[]): Promise<void>;
export function deleteEntry(db: BrickDb, id: string): Promise<void>;        // mit seinen Fotos
export function getPhoto(db: BrickDb, id: string): Promise<Photo | undefined>;
export function listPhotos(db: BrickDb, setId: string): Promise<Photo[]>;
export function deletePhoto(db: BrickDb, id: string): Promise<void>;
export function getManufacturers(db: BrickDb): Promise<string[]>;
export function setManufacturers(db: BrickDb, list: string[]): Promise<void>;
export function exportAll(db: BrickDb): Promise<BackupData>;
export function replaceAll(db: BrickDb, data: BackupData): Promise<void>;
```

Object Stores: `sets` (keyPath `id`), `entries` (keyPath `id`, Index `setId`), `photos` (keyPath `id`, Index `setId`), `meta` (Schlüssel `manufacturers`).

- [ ] **Step 1: Tests schreiben** (`tests/db.test.ts`, `import 'fake-indexeddb/auto'`, je Test eine DB mit eigenem Namen). Hilfsfunktionen `makeSet`, `makeEntry`, `makePhoto` im Test.

```ts
test('neue DB liefert die Standardhersteller', ...)      // getManufacturers → DEFAULT_MANUFACTURERS
test('putSet und getSet', ...)                           // gespeichertes Set kommt gleich zurück, updatedAt gesetzt
test('listEntries liefert nur Einträge des Sets, neueste zuerst', ...)
test('deleteSet entfernt Einträge und Fotos des Sets, andere Sets bleiben', ...)
test('deleteEntry entfernt die Fotos des Eintrags', ...)
test('deletePhoto entfernt die ID aus entry.photoIds', ...)
test('deletePhoto leert coverPhotoId, wenn es das Titelbild war', ...)
test('deleteEntry leert coverPhotoId, wenn das Titelbild dazugehörte', ...)
test('saveEntryWithPhotos schreibt nichts, wenn ein Foto scheitert', async () => {
  // Foto p1 existiert bereits; saveEntryWithPhotos(entry, [p2, p1]) → rejects,
  // danach getEntry(entry.id) === undefined und getPhoto('p2') === undefined
});
test('replaceAll ersetzt den gesamten Bestand', ...)     // alte Sets weg, exportAll == übergebene Daten
```

- [ ] **Step 2:** Run: `npm test` — Expected: FAIL.
- [ ] **Step 3:** `db.ts` umsetzen. `saveEntryWithPhotos`, `deleteSet`, `deleteEntry`, `deletePhoto` und `replaceAll` jeweils in **einer** Transaktion über alle betroffenen Stores; neue Fotos mit `add` (nicht `put`), damit ein Fehler die Transaktion abbricht.
- [ ] **Step 4:** Run: `npm test` — Expected: PASS.
- [ ] **Step 5:** Commit „Datenhaltung in IndexedDB mit kaskadierendem Löschen“.

---

### Task 4: Fachregeln und Statistik

**Files:**
- Create: `src/lib/sets.ts`, `src/lib/stats.ts`, `tests/sets.test.ts`, `tests/stats.test.ts`

**Interfaces:**
- Consumes: Typen aus Task 2.
- Produces:

```ts
export function newSet(status: Status, now?: Date): BrickSet;   // id via crypto.randomUUID(), leere Felder
export function applyStatus(set: BrickSet, status: Status, today: string): BrickSet;
export function markPurchased(set: BrickSet, purchaseDate: string, priceCents: number | null): BrickSet;
export interface SetFilter { query: string; status: Status | null; manufacturer: string | null; theme: string | null; }
export function filterSets(sets: BrickSet[], filter: SetFilter): BrickSet[];
export function sortWishlist(sets: BrickSet[], by: 'priority' | 'price'): BrickSet[];
export function suggestions(sets: BrickSet[], field: 'theme' | 'retailer' | 'location'): string[];

export interface Stats {
  countByStatus: Record<Status, number>;
  totalPieces: number; totalSpentCents: number; totalMinutes: number; wishlistCents: number;
  byManufacturer: { manufacturer: string; count: number; spentCents: number }[];
}
export function computeStats(sets: BrickSet[], entries: LogEntry[]): Stats;
```

- [ ] **Step 1: Tests schreiben.** Die Regeln stehen in Entwurf Abschnitt 8, Punkte 1–3.

```ts
// sets.test.ts
// applyStatus: ungebaut → im_bau setzt buildStart = today, buildEnd bleibt null
// applyStatus: im_bau (buildStart '2026-09-01') → fertig lässt buildStart, setzt buildEnd = today
// applyStatus: ungebaut → fertig setzt buildStart und buildEnd = today
// applyStatus: fertig → im_bau leert buildEnd, lässt buildStart
// applyStatus: fertig → abgegeben lässt beide Daten stehen
// applyStatus verändert das übergebene Objekt nicht
// markPurchased: status 'ungebaut', purchaseDate und priceCents gesetzt, priority null, shopUrl bleibt
// filterSets: query 'burg' findet Name 'Burg Blaustein' und Setnummer 'BURG-1', ohne Groß/Klein
// filterSets: status null liefert alle außer 'wunsch'
// filterSets: manufacturer und theme kombiniert schränken gemeinsam ein
// sortWishlist priority: hoch, mittel, niedrig, dann ohne Priorität; bei Gleichstand nach Name
// sortWishlist price: aufsteigend, Sets ohne Preis ans Ende
// suggestions: eindeutige, nicht leere Werte, alphabetisch nach deutscher Sortierung

// stats.test.ts — Bestand: A ungebaut 1000 Teile 50,00; B fertig 500 Teile 30,00;
// C abgegeben 200 Teile 20,00; D wunsch 900 Teile 80,00; Einträge 60 + 75 min, einer ohne Minuten
// totalPieces 1500, totalSpentCents 10000, wishlistCents 8000, totalMinutes 135
// countByStatus: ungebaut 1, fertig 1, abgegeben 1, wunsch 1, im_bau 0
// byManufacturer ohne Wünsche, absteigend nach count; leerer Hersteller erscheint als 'Ohne Hersteller'
```

- [ ] **Step 2:** Run: `npm test` — Expected: FAIL.
- [ ] **Step 3:** `sets.ts` und `stats.ts` umsetzen, alle Funktionen ohne Seiteneffekte.
- [ ] **Step 4:** Run: `npm test` — Expected: PASS.
- [ ] **Step 5:** Commit „Statusregeln, Filter, Wunschlisten-Sortierung und Statistik“.

---

### Task 5: Fotos verkleinern

**Files:**
- Create: `src/lib/photos.ts`, `tests/photos.test.ts`

**Interfaces:**
- Produces:

```ts
export const MAX_EDGE = 1600;
export class PhotoDecodeError extends Error { fileName: string; }
export function fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number };
export type Decoder = (file: Blob) => Promise<{ width: number; height: number; draw(canvas: OffscreenCanvas): void }>;
export function resizeToJpeg(file: File, maxEdge?: number, decode?: Decoder): Promise<{ data: ArrayBuffer; width: number; height: number }>;
```

- [ ] **Step 1: Tests schreiben**

```ts
expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });   // nie vergrößern
expect(fitWithin(1601, 1, 1600)).toEqual({ width: 1600, height: 1 });     // nie 0
// resizeToJpeg mit decode, das ablehnt → wirft PhotoDecodeError mit fileName 'urlaub.heic'
```

- [ ] **Step 2:** Run: `npm test` — Expected: FAIL.
- [ ] **Step 3:** Umsetzen. Standard-`decode` nutzt `createImageBitmap(file, { imageOrientation: 'from-image' })`, damit Hochkant-Fotos richtig herum bleiben; Ausgabe über `OffscreenCanvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 })`.
- [ ] **Step 4:** Run: `npm test` — Expected: PASS.
- [ ] **Step 5:** Commit „Fotos auf 1600 px verkleinern“.

---

### Task 6: Sicherung

**Files:**
- Create: `src/lib/backup.ts`, `tests/backup.test.ts`

**Interfaces:**
- Consumes: `BackupData` (Task 2), `exportAll`, `replaceAll` (Task 3).
- Produces:

```ts
export const BACKUP_VERSION = 1;
export class BackupFormatError extends Error {}
export function backupFileName(today: string): string;                 // 'BrickLog-Sicherung_2026-10-09.zip'
export function buildBackupZip(data: BackupData, exportedAt: string): Promise<Uint8Array>;
export function parseBackupZip(bytes: Uint8Array): Promise<BackupData>; // wirft BackupFormatError
export function restoreBackup(db: BrickDb, bytes: Uint8Array): Promise<{ sets: number; photos: number }>;
```

ZIP-Aufbau: `bricklog.json` mit `{ app: 'BrickLog', version: 1, exportedAt, sets, entries, manufacturers, photos: [{ id, setId, width, height, createdAt }] }` und je Foto `photos/<id>.jpg`, unkomprimiert abgelegt (`level: 0`).

- [ ] **Step 1: Tests schreiben**

```ts
test('Export und Einlesen ergeben dieselben Daten', ...)   // inklusive Byte-Vergleich eines Fotos
test('backupFileName', ...)                                // 'BrickLog-Sicherung_2026-10-09.zip'
test('kein ZIP → BackupFormatError', ...)                  // new Uint8Array([1,2,3])
test('ZIP ohne bricklog.json → BackupFormatError', ...)
test('bricklog.json mit app != BrickLog → BackupFormatError', ...)
test('version 2 → BackupFormatError', ...)
test('Foto in der Liste, aber Datei fehlt → BackupFormatError', ...)
test('Set ohne name → BackupFormatError', ...)
test('restoreBackup mit kaputter Datei lässt den Bestand unverändert', async () => {
  // DB mit 2 Sets; restoreBackup(db, kaputt) rejects BackupFormatError; listSets(db).length === 2
});
test('restoreBackup ersetzt den Bestand und meldet die Anzahl', ...)
```

- [ ] **Step 2:** Run: `npm test` — Expected: FAIL.
- [ ] **Step 3:** Umsetzen mit `fflate` (`zip`/`unzip`, asynchrone Variante). `restoreBackup` ruft erst `parseBackupZip` vollständig, dann `replaceAll`.
- [ ] **Step 4:** Run: `npm test` — Expected: PASS.
- [ ] **Step 5:** Commit „Sicherung als ZIP exportieren und einspielen“.

---

### Task 7: Rahmen der Oberfläche

**Files:**
- Create: `src/lib/router.ts`, `tests/router.test.ts`, `src/components/TabBar.svelte`, `src/components/ConfirmDialog.svelte`, `src/components/SuggestInput.svelte`
- Modify: `src/main.ts`, `src/App.svelte`, `src/app.css`

**Interfaces:**
- Produces:

```ts
export type Route =
  | { page: 'collection' } | { page: 'wishlist' } | { page: 'stats' } | { page: 'settings' }
  | { page: 'set'; id: string }
  | { page: 'setForm'; id: string | null; wish: boolean }
  | { page: 'entryForm'; setId: string; entryId: string | null };
export function parseRoute(hash: string): Route;
export function href(route: Route): string;
export function navigate(route: Route): void;
```

Adressen: `#/sammlung`, `#/wunschliste`, `#/statistik`, `#/einstellungen`, `#/set/<id>`, `#/set/neu`, `#/wunsch/neu`, `#/set/<id>/bearbeiten`, `#/set/<id>/eintrag/neu`, `#/set/<id>/eintrag/<entryId>`.
`ConfirmDialog`: Props `title`, `message`, `confirmLabel`, `danger: boolean`, Callbacks `onconfirm`, `oncancel`; baut auf `<dialog>`.
`SuggestInput`: Props `label`, `value` (bindbar), `options: string[]`; baut auf `<input list>` + `<datalist>`.
Die DB wird in `main.ts` einmal geöffnet und per Svelte-Context `'db'` bereitgestellt.

- [ ] **Step 1: Test schreiben** — `parseRoute` für jede der zehn Adressen; `parseRoute('')` und `parseRoute('#/unsinn')` → `{ page: 'collection' }`; `parseRoute(href(r))` ergibt `r` für jede Route-Variante.
- [ ] **Step 2:** Run: `npm test` — Expected: FAIL.
- [ ] **Step 3:** `router.ts` umsetzen; `App.svelte` hört auf `hashchange`, zeigt je Route vorerst einen Platzhalter mit dem Seitennamen und die `TabBar` (auf den Formularseiten ausgeblendet). `main.ts` ruft `navigator.storage?.persist?.()` auf.
- [ ] **Step 4:** `app.css`: Farbvariablen hell/dunkel, Systemschrift, `TabBar` fest am unteren Rand mit `env(safe-area-inset-bottom)`.
- [ ] **Step 5:** Run: `npm test; npm run check` — Expected: PASS, 0 Fehler. Vorschau im Browser bei 360 × 800: vier Reiter wechseln die Seite, Zurück-Taste funktioniert, Dunkelmodus schaltet um.
- [ ] **Step 6:** Commit „App-Rahmen mit Reitern, Navigation und Farbschema“.

---

### Task 8: Sammlung, Set-Formular, Detailseite

**Files:**
- Create: `src/routes/Collection.svelte`, `src/routes/SetForm.svelte`, `src/routes/SetDetail.svelte`, `src/components/SetCard.svelte`
- Modify: `src/App.svelte`

**Interfaces:**
- Consumes: `listSets`, `getSet`, `putSet`, `deleteSet`, `getManufacturers`, `setManufacturers` (Task 3); `newSet`, `applyStatus`, `filterSets`, `suggestions` (Task 4); `parseEuro`, `formatEuro`, `formatDate`, `STATUS_LABEL` (Task 2); `ConfirmDialog`, `SuggestInput`, Router (Task 7).

- [ ] **Step 1:** `Collection.svelte`: Suchfeld, drei Filter (Status ohne „Wunschliste“, Hersteller, Thema), zweispaltiges Kachelraster aus `SetCard`, schwebender Plus-Knopf → `#/set/neu`. Leerer Bestand zeigt „Noch keine Sets. Tippe auf +, um dein erstes anzulegen.“; leeres Filterergebnis zeigt „Kein Set passt zu Suche und Filter.“
- [ ] **Step 2:** `SetForm.svelte` für Neu und Bearbeiten, Felder in der Reihenfolge der Tabelle in Entwurf Abschnitt 4. Hersteller als `<select>` mit letztem Eintrag „Neuer Hersteller …“, der ein Textfeld einblendet und den Wert dauerhaft in die Liste aufnimmt. Shop-Link und Priorität nur bei `wish` bzw. Status `wunsch`. Speichern wird abgelehnt mit Meldung am Feld, wenn der Name leer ist („Bitte gib einen Namen ein.“), der Preis `ok: false` liefert („Preis bitte als Zahl, z. B. 49,99.“) oder die Teilezahl keine ganze Zahl ≥ 0 ist. Baubeginn und Fertigstellung erscheinen als änderbare Datumsfelder, sobald der Status mindestens „im Bau“ ist.
- [ ] **Step 3:** `SetDetail.svelte`: Titelbild, Stammdaten (leere Felder werden weggelassen), Statusauswahl, die sofort über `applyStatus(set, status, todayIso())` speichert, Knöpfe „Bearbeiten“ und „Löschen“ (mit `ConfirmDialog`, Text „Set „<Name>“ mit allen Einträgen und Fotos löschen? Das lässt sich nicht rückgängig machen.“). Bereich „Bautagebuch“ vorerst mit Platzhalter.
- [ ] **Step 4:** Run: `npm test; npm run check` — Expected: PASS, 0 Fehler.
- [ ] **Step 5:** Vorschau bei 360 × 800 prüfen: Set „Burg Blaustein“ (BlueBrixx, 1.234,50 €) anlegen → erscheint als Kachel; leerer Name und Preis „abc“ werden abgelehnt; Status auf „im Bau“ trägt Baubeginn heute ein; Filter Hersteller wirkt; neuer Hersteller „Qman“ steht beim nächsten Set zur Auswahl; Löschen entfernt die Kachel; Seite neu laden behält die Daten.
- [ ] **Step 6:** Commit „Sammlung mit Set-Formular und Detailseite“.

---

### Task 9: Bautagebuch und Fotos

**Files:**
- Create: `src/routes/EntryForm.svelte`, `src/components/PhotoPicker.svelte`, `src/components/PhotoViewer.svelte`, `src/lib/photoUrl.ts`
- Modify: `src/routes/SetDetail.svelte`, `src/components/SetCard.svelte`

**Interfaces:**
- Consumes: `listEntries`, `getEntry`, `saveEntryWithPhotos`, `deleteEntry`, `getPhoto`, `listPhotos`, `deletePhoto`, `putSet` (Task 3); `resizeToJpeg`, `PhotoDecodeError` (Task 5); `formatMinutes`, `formatDate`, `todayIso` (Task 2).
- Produces: `photoUrl(db: BrickDb, id: string): Promise<string>` in `src/lib/photoUrl.ts` — erzeugt je Foto-ID einmal eine `blob:`-Adresse und merkt sie sich; `revokePhotoUrl(id: string): void` beim Löschen.

- [ ] **Step 1:** `PhotoPicker.svelte`: zwei Knöpfe „Kamera“ (`<input type="file" accept="image/*" capture="environment">`) und „Galerie“ (`<input type="file" accept="image/*" multiple>`). Jede Datei läuft durch `resizeToJpeg`. Dateien mit `PhotoDecodeError` werden übersprungen und gesammelt gemeldet: „Nicht lesbar und übersprungen: <Dateinamen>“. Gewählte Fotos erscheinen als Vorschau mit Entfernen-Knopf.
- [ ] **Step 2:** `EntryForm.svelte`: Datum (vorbelegt heute), Bauabschnitt, Bauzeit in Minuten (ganze Zahl ≥ 0 oder leer), Notiz, `PhotoPicker`. Speichern über `saveEntryWithPhotos`; schlägt es fehl, bleibt das Formular mit allen Eingaben stehen und zeigt „Speichern fehlgeschlagen – möglicherweise ist der Speicher voll.“ Beim Bearbeiten lassen sich vorhandene Fotos entfernen und der Eintrag löschen (mit `ConfirmDialog`).
- [ ] **Step 3:** `SetDetail.svelte`: Einträge neueste zuerst, je Eintrag Datum, Bauabschnitt, Bauzeit, Notiz und Fotostreifen; Summe der Bauzeit über der Liste; Knopf „Eintrag hinzufügen“. Hat das Set noch kein Titelbild, wird das erste gespeicherte Foto automatisch Titelbild.
- [ ] **Step 4:** `PhotoViewer.svelte`: Vollbild über alle Fotos des Sets, Wischen links/rechts über CSS `scroll-snap`, Schließen-Knopf, Knöpfe „Als Titelbild“ und „Löschen“ (mit `ConfirmDialog`). `SetCard` zeigt das Titelbild.
- [ ] **Step 5:** Run: `npm test; npm run check` — Expected: PASS, 0 Fehler.
- [ ] **Step 6:** Vorschau bei 360 × 800 prüfen: Eintrag mit zwei Bildern aus Dateien anlegen → Fotostreifen und Kachel-Titelbild sichtbar; eine Textdatei mit Endung `.jpg` wird als nicht lesbar gemeldet, der Eintrag trotzdem gespeichert; Vollbild wischt; anderes Foto als Titelbild setzen ändert die Kachel; Titelbild löschen leert die Kachel ohne Fehler; Eintrag löschen entfernt seine Fotos aus dem Vollbild.
- [ ] **Step 7:** Commit „Bautagebuch mit Fotos, Vollbildansicht und Titelbild“.

---

### Task 10: Wunschliste, Statistik, Einstellungen

**Files:**
- Create: `src/routes/Wishlist.svelte`, `src/components/WishRow.svelte`, `src/routes/Stats.svelte`, `src/routes/Settings.svelte`
- Modify: `src/routes/SetDetail.svelte`, `src/App.svelte`

**Interfaces:**
- Consumes: `sortWishlist`, `markPurchased` (Task 4); `computeStats` (Task 4); `exportAll` (Task 3); `buildBackupZip`, `restoreBackup`, `backupFileName`, `BackupFormatError` (Task 6).

- [ ] **Step 1:** `Wishlist.svelte`: Kopfzeile „<n> Wünsche · <Summe>“, Umschalter „Priorität | Preis“, Liste aus `WishRow` (Bild 56 px, Name, Hersteller, Preis, Prioritätsmarke), Plus-Knopf → `#/wunsch/neu`. Leer: „Deine Wunschliste ist leer.“
- [ ] **Step 2:** `SetDetail.svelte` bei Status `wunsch`: statt Statusauswahl und Bautagebuch ein Knopf „Gekauft“ und, falls vorhanden, „Im Shop öffnen“ (`target="_blank" rel="noopener"`). „Gekauft“ öffnet einen Dialog mit Kaufdatum (vorbelegt heute) und Preis (vorbelegt Wunschpreis), speichert über `markPurchased` und wechselt zur Sammlung.
- [ ] **Step 3:** `Stats.svelte`: vier Kennzahlen (Sets im Besitz = ungebaut + im Bau + fertig, Gesamtteilezahl, Gesamtausgaben, Bauzeit), Liste je Status, Tabelle je Hersteller. Ohne Daten: „Noch nichts zu zählen.“
- [ ] **Step 4:** `Settings.svelte`: „Sicherung exportieren“ lädt die ZIP über einen `<a download>`-Link mit `backupFileName(todayIso())`. „Sicherung einspielen“ wählt eine Datei, fragt per `ConfirmDialog` „Alle jetzigen Daten werden durch die Sicherung ersetzt. Fortfahren?“, meldet danach „Sicherung eingespielt: <n> Sets, <m> Fotos.“ oder bei `BackupFormatError` „Diese Datei ist keine gültige BrickLog-Sicherung. Deine Daten wurden nicht verändert.“ Herstellerliste: hinzufügen, entfernen (Sets behalten ihren Herstellernamen). Fußzeile mit Versionsnummer aus `package.json`.
- [ ] **Step 5:** Run: `npm test; npm run check` — Expected: PASS, 0 Fehler.
- [ ] **Step 6:** Vorschau bei 360 × 800 prüfen: zwei Wünsche (hoch 80,00 €, niedrig 30,00 €) → Summe 110,00 €, beide Sortierungen stimmen; „Gekauft“ mit 75,00 € verschiebt in die Sammlung, Wunschsumme 30,00 €, Gesamtausgaben steigen um 75,00 €; exportieren, alle Sets löschen, einspielen → Bestand samt Fotos wieder da; README.md als Sicherung einspielen → Fehlermeldung, Bestand unverändert.
- [ ] **Step 7:** Commit „Wunschliste, Statistik und Einstellungen mit Sicherung“.

---

### Task 11: Veröffentlichung und Abnahme auf dem Handy

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes: `npm run build` (Task 1).

- [ ] **Step 1:** `deploy.yml`: bei Push auf `main` → `npm ci`, `npm test`, `npm run build`, Veröffentlichung von `dist` über `actions/upload-pages-artifact` und `actions/deploy-pages`.
- [ ] **Step 2:** Run: `npm run build; npm run preview` — in der Vorschau prüfen: Chrome bietet „App installieren“ an, nach dem ersten Laden funktioniert die App mit getrennter Netzwerkverbindung (DevTools „Offline“), Konsole ohne Fehler.
- [ ] **Step 3: Halt — Niklas' ausdrückliche Freigabe einholen**, bevor irgendetwas GitHub erreicht. Danach: `gh repo create Nikdas1234/BrickLog --public --source . --push`, Pages auf Quelle „GitHub Actions“ stellen (`gh api -X POST repos/Nikdas1234/BrickLog/pages -f build_type=workflow`).
- [ ] **Step 4:** Run: `gh run watch` — Expected: Workflow grün; `https://nikdas1234.github.io/BrickLog/` lädt die App.
- [ ] **Step 5:** `README.md` auf den fertigen Stand bringen: Adresse, Installation auf dem Handy (Chrome → Menü → „App installieren“), Sicherung, Aktualisierung (Push auf `main`, App holt die neue Fassung beim nächsten Start).
- [ ] **Step 6:** Abnahme durch Niklas auf dem Samsung-Handy: installieren, Set anlegen, Foto mit der Kamera und eines aus der Galerie aufnehmen (Hochkant bleibt Hochkant), Flugmodus an → App startet und zeigt die Daten, Sicherung exportieren und die ZIP in „Eigene Dateien“ wiederfinden.
- [ ] **Step 7:** Commit „Veröffentlichung über GitHub Pages und Installationsanleitung“.

## Bekannte Grenze

Export und Einspielen halten alle Fotos gleichzeitig im Arbeitsspeicher. Bei rund 300 kB je Foto ist das bis in den Bereich von etwa tausend Fotos unkritisch; darüber müsste die Sicherung auf stückweises Schreiben umgestellt werden.
