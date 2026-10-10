<script lang="ts">
  import ConfirmDialog from '../components/ConfirmDialog.svelte';
  import Icon from '../components/Icon.svelte';
  import { BackupFormatError, BackupTooLargeError, backupFileName, restoreBackup, writeBackupZip } from '../lib/backup';
  import { getDb } from '../lib/context';
  import { exportAll, getManufacturers, setManufacturers } from '../lib/db';
  import { formatBytes, plural, todayIso } from '../lib/format';
  import { revokeAllPhotoUrls } from '../lib/photoUrl';
  import { isNativeApp, openFileSink } from '../lib/saveFile';

  const db = getDb();
  const version = __BUILD__ > 0 ? `${__APP_VERSION__} (Bau ${__BUILD__})` : __APP_VERSION__;

  let manufacturers = $state.raw<string[]>([]);
  let newManufacturer = $state('');
  let working = $state(false);
  // Share of the backup written so far, 0 to 100; null while nothing is being written.
  let progress = $state<number | null>(null);
  let message = $state<{ text: string; bad: boolean } | null>(null);
  // The picked file is only referenced here, not read into memory.
  let pendingRestore = $state.raw<Blob | null>(null);
  let confirmRestore = $state(false);
  let usedBytes = $state<number | null>(null);

  getManufacturers(db).then((list) => (manufacturers = list));

  function measureStorage() {
    void navigator.storage
      ?.estimate?.()
      .then((estimate) => (usedBytes = estimate.usage ?? null))
      .catch(() => {});
  }
  measureStorage();

  const counted = (sets: number, photos: number, videos: number) =>
    [plural(sets, 'Set', 'Sets'), plural(photos, 'Foto', 'Fotos'), ...(videos > 0 ? [plural(videos, 'Video', 'Videos')] : [])].join(
      ', ',
    );

  async function exportBackup() {
    working = true;
    message = null;
    try {
      const data = await exportAll(db);
      const total =
        data.photos.reduce((sum, p) => sum + p.data.byteLength, 0) + data.videos.reduce((sum, v) => sum + v.blob.size, 0);
      const sink = await openFileSink(backupFileName(todayIso()), 'application/zip');
      let written = 0;
      progress = 0;
      await writeBackupZip(data, new Date().toISOString(), async (chunk) => {
        await sink.write(chunk);
        written += chunk.length;
        progress = total > 0 ? Math.min(100, Math.round((written / total) * 100)) : 100;
      });
      progress = null;
      const result = await sink.finish();
      const counts = counted(data.sets.length, data.photos.length, data.videos.length);
      message =
        result === 'cancelled'
          ? { text: 'Die Sicherung wurde erstellt, aber nirgends abgelegt. Exportiere sie noch einmal.', bad: true }
          : result === 'shared'
            ? { text: `Sicherung erstellt und weitergegeben: ${counts}.`, bad: false }
            : { text: `Sicherung erstellt: ${counts}. Die Datei liegt im Download-Ordner.`, bad: false };
    } catch (error) {
      message = {
        text:
          error instanceof BackupTooLargeError
            ? `Die Sicherung wäre ${formatBytes(error.bytes)} groß, eine Sicherungsdatei fasst höchstens rund 3,9 GB. Lösche einige Videos oder kürze sie.`
            : 'Die Sicherung konnte nicht erstellt werden. Möglicherweise reicht der freie Speicher nicht.',
        bad: true,
      };
    }
    progress = null;
    working = false;
  }

  function pickRestoreFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    message = null;
    pendingRestore = file;
    confirmRestore = true;
  }

  async function restore() {
    if (!pendingRestore) return;
    working = true;
    try {
      const result = await restoreBackup(db, pendingRestore);
      revokeAllPhotoUrls();
      manufacturers = await getManufacturers(db);
      measureStorage();
      message = { text: `Sicherung eingespielt: ${counted(result.sets, result.photos, result.videos)}.`, bad: false };
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

<div class="stack">
  <section class="card stack">
    <h2>Sicherung</h2>
    <p class="muted small">
      {#if isNativeApp}
        Deine Daten liegen nur auf diesem Handy. Wer die App deinstalliert oder in den Android-Einstellungen ihre
        Daten löscht, löscht auch Sammlung, Fotos und Videos. Exportiere regelmäßig eine Sicherung und lege sie im
        Teilen-Dialog woanders ab, z. B. in „Eigene Dateien“ oder Google Drive.
      {:else}
        Deine Daten liegen nur in diesem Browser. Wer in Chrome die Websitedaten löscht oder die App deinstalliert,
        löscht auch Sammlung, Fotos und Videos. Exportiere regelmäßig eine Sicherung und lege sie woanders ab.
      {/if}
    </p>
    {#if usedBytes !== null}
      <p class="small">
        Belegter Speicher: <strong>{formatBytes(usedBytes)}</strong>
        <span class="muted">· Die Sicherung wird ähnlich groß; Videos machen den größten Teil aus.</span>
      </p>
    {/if}
    <button type="button" class="btn primary wide" disabled={working} onclick={exportBackup}>Sicherung exportieren</button>
    <label class="btn wide" aria-disabled={working}>
      Sicherung einspielen
      <input type="file" accept=".zip,application/zip" onchange={pickRestoreFile} disabled={working} hidden />
    </label>
    {#if working}
      <p class="muted small" role="status">
        {progress !== null ? `Sicherung wird geschrieben … ${progress} %` : 'Bitte warten …'}
      </p>
    {/if}
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
            onclick={() => saveManufacturers(manufacturers.filter((m) => m !== name))}
          >
            <Icon name="close" size={18} />
          </button>
        </li>
      {/each}
    </ul>
    <form class="add" onsubmit={addManufacturer}>
      <input type="text" bind:value={newManufacturer} placeholder="Neuer Hersteller" aria-label="Neuer Hersteller" />
      <button type="submit" class="btn">Hinzufügen</button>
    </form>
  </section>

  <p class="muted small version">BrickLog {version}{isNativeApp ? ' · Android-App' : ' · Web-App'}</p>
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
    display: grid;
    place-items: center;
    color: var(--muted);
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
