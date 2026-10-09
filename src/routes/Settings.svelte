<script lang="ts">
  import ConfirmDialog from '../components/ConfirmDialog.svelte';
  import { BackupFormatError, backupFileName, buildBackupZip, restoreBackup } from '../lib/backup';
  import { getDb } from '../lib/context';
  import { exportAll, getManufacturers, setManufacturers } from '../lib/db';
  import { plural, todayIso } from '../lib/format';
  import { revokeAllPhotoUrls } from '../lib/photoUrl';

  const db = getDb();
  const version = __APP_VERSION__;

  let manufacturers = $state.raw<string[]>([]);
  let newManufacturer = $state('');
  let working = $state(false);
  let message = $state<{ text: string; bad: boolean } | null>(null);
  let pendingRestore = $state.raw<Uint8Array | null>(null);
  let confirmRestore = $state(false);

  getManufacturers(db).then((list) => (manufacturers = list));

  async function exportBackup() {
    working = true;
    message = null;
    try {
      const data = await exportAll(db);
      const zipped = await buildBackupZip(data, new Date().toISOString());
      const url = URL.createObjectURL(new Blob([zipped as BlobPart], { type: 'application/zip' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = backupFileName(todayIso());
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      message = {
        text: `Sicherung erstellt: ${plural(data.sets.length, 'Set', 'Sets')}, ${plural(data.photos.length, 'Foto', 'Fotos')}. Die Datei liegt im Download-Ordner.`,
        bad: false,
      };
    } catch {
      message = { text: 'Die Sicherung konnte nicht erstellt werden.', bad: true };
    }
    working = false;
  }

  async function pickRestoreFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    message = null;
    pendingRestore = new Uint8Array(await file.arrayBuffer());
    confirmRestore = true;
  }

  async function restore() {
    if (!pendingRestore) return;
    working = true;
    try {
      const result = await restoreBackup(db, pendingRestore);
      revokeAllPhotoUrls();
      manufacturers = await getManufacturers(db);
      message = { text: `Sicherung eingespielt: ${plural(result.sets, 'Set', 'Sets')}, ${plural(result.photos, 'Foto', 'Fotos')}.`, bad: false };
    } catch (error) {
      message = {
        text:
          error instanceof BackupFormatError
            ? 'Diese Datei ist keine gültige BrickLog-Sicherung. Deine Daten wurden nicht verändert.'
            : 'Das Einspielen ist fehlgeschlagen. Deine Daten wurden nicht verändert.',
        bad: true,
      };
    }
    pendingRestore = null;
    working = false;
  }

  async function saveManufacturers(list: string[]) {
    await setManufacturers(db, list);
    manufacturers = list;
  }

  async function addManufacturer(event: SubmitEvent) {
    event.preventDefault();
    const name = newManufacturer.trim();
    newManufacturer = '';
    if (name === '' || manufacturers.includes(name)) return;
    await saveManufacturers([...manufacturers, name]);
  }
</script>

<header class="page-head">
  <h1>Einstellungen</h1>
</header>

<div class="stack">
  <section class="card stack">
    <h2>Sicherung</h2>
    <p class="muted small">
      Deine Daten liegen nur auf diesem Handy. Wer in Chrome die Websitedaten löscht oder die App deinstalliert, löscht
      auch Sammlung und Fotos. Exportiere regelmäßig eine Sicherung und lege sie woanders ab.
    </p>
    <button type="button" class="btn primary wide" disabled={working} onclick={exportBackup}>Sicherung exportieren</button>
    <label class="btn wide" aria-disabled={working}>
      Sicherung einspielen
      <input type="file" accept=".zip,application/zip" onchange={pickRestoreFile} disabled={working} hidden />
    </label>
    {#if working}<p class="muted small">Bitte warten …</p>{/if}
    {#if message}<p class="notice" class:bad={message.bad} role="status">{message.text}</p>{/if}
  </section>

  <section class="card stack">
    <h2>Hersteller</h2>
    <p class="muted small">
      Diese Namen stehen beim Anlegen eines Sets zur Auswahl. Entfernst du einen, behalten vorhandene Sets ihren
      Hersteller.
    </p>
    <ul>
      {#each manufacturers as name (name)}
        <li>
          <span>{name}</span>
          <button
            type="button"
            class="remove"
            aria-label="{name} entfernen"
            onclick={() => saveManufacturers(manufacturers.filter((m) => m !== name))}>×</button
          >
        </li>
      {/each}
    </ul>
    <form class="add" onsubmit={addManufacturer}>
      <input type="text" bind:value={newManufacturer} placeholder="Neuer Hersteller" aria-label="Neuer Hersteller" />
      <button type="submit" class="btn">Hinzufügen</button>
    </form>
  </section>

  <p class="muted small version">BrickLog {version}</p>
</div>

<ConfirmDialog
  bind:open={confirmRestore}
  title="Sicherung einspielen?"
  message="Alle jetzigen Daten werden durch die Sicherung ersetzt. Fortfahren?"
  confirmLabel="Ersetzen"
  danger
  onconfirm={restore}
/>

<style>
  ul {
    display: grid;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid var(--border);
  }

  li:first-child {
    border-top: 0;
  }

  .remove {
    width: 44px;
    height: 44px;
    border: 0;
    background: none;
    color: var(--muted);
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
  }

  .add {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 8px;
  }

  .version {
    text-align: center;
  }
</style>
