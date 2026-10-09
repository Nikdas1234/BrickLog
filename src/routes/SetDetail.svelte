<script lang="ts">
  import ConfirmDialog from '../components/ConfirmDialog.svelte';
  import PhotoImg from '../components/PhotoImg.svelte';
  import PhotoViewer from '../components/PhotoViewer.svelte';
  import { getDb } from '../lib/context';
  import { coverJobs } from '../lib/coverJobs.svelte';
  import { deletePhoto, deleteSet, getSet, listEntries, listPhotos, putSet, replaceCover } from '../lib/db';
  import { euroInput, formatDate, formatEuro, formatMinutes, parseEuro, plural, todayIso } from '../lib/format';
  import { resizeToJpeg } from '../lib/photos';
  import { revokePhotoUrl } from '../lib/photoUrl';
  import { href, replaceRoute } from '../lib/router';
  import { markPurchased } from '../lib/sets';
  import { PRIORITY_LABEL, type BrickSet, type LogEntry } from '../lib/types';

  let { id }: { id: string } = $props();

  const db = getDb();

  // undefined while loading, null when the set does not exist.
  let set = $state.raw<BrickSet | null | undefined>(undefined);
  let entries = $state.raw<LogEntry[]>([]);
  let photoIds = $state.raw<string[]>([]);
  let viewerIndex = $state<number | null>(null);
  let confirmDelete = $state(false);
  let coverError = $state('');

  let buyOpen = $state(false);
  let buyDate = $state(todayIso());
  let buyPrice = $state('');
  let buyError = $state('');

  async function load() {
    // svelte-ignore state_referenced_locally
    const loaded = await getSet(db, id);
    if (!loaded) {
      set = null;
      return;
    }
    const [loadedEntries, photos] = await Promise.all([listEntries(db, loaded.id), listPhotos(db, loaded.id)]);
    const inEntries = loadedEntries.flatMap((e) => e.photoIds);
    // Photos without a diary entry (an uploaded cover) come first.
    photoIds = [...photos.map((p) => p.id).filter((p) => !inEntries.includes(p)), ...inEntries];
    entries = loadedEntries;
    set = loaded;
  }
  // Also runs again when a cover picture arrives that was fetched in the background.
  $effect(() => {
    void coverJobs.finished;
    void load();
  });

  const isWish = $derived(set?.status === 'wunsch');
  const totalMinutes = $derived(entries.reduce((sum, e) => sum + (e.minutes ?? 0), 0));
  const facts = $derived(
    set
      ? (
          [
            ['Setnummer', set.setNumber],
            ['Thema/Reihe', set.theme],
            ['Teilezahl', set.pieceCount?.toLocaleString('de-DE') ?? ''],
            [isWish ? 'Preis (erwartet)' : 'Preis', set.priceCents === null ? '' : formatEuro(set.priceCents)],
            ['Priorität', isWish && set.priority ? PRIORITY_LABEL[set.priority] : ''],
            ['Kaufdatum', set.purchaseDate ? formatDate(set.purchaseDate) : ''],
            ['Händler', set.retailer],
            ['Lagerort', set.location],
            ['Baubeginn', set.buildStart ? formatDate(set.buildStart) : ''],
            ['Fertigstellung', set.buildEnd ? formatDate(set.buildEnd) : ''],
          ] as [string, string][]
        ).filter(([, value]) => value !== '')
      : [],
  );

  function openViewer(photoId: string | null) {
    const index = photoId ? photoIds.indexOf(photoId) : -1;
    if (index >= 0) viewerIndex = index;
  }


  async function uploadCover(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !set) return;
    coverError = '';
    try {
      const resized = await resizeToJpeg(file);
      const previous = set.coverPhotoId;
      await replaceCover(db, { id: crypto.randomUUID(), setId: set.id, createdAt: new Date().toISOString(), ...resized });
      if (previous) revokePhotoUrl(previous);
      await load();
    } catch {
      coverError = 'Dieses Bild konnte nicht gelesen oder gespeichert werden.';
    }
  }

  async function setCover(photoId: string) {
    if (!set) return;
    const next = { ...set, coverPhotoId: photoId };
    await putSet(db, next);
    set = next;
  }

  async function removePhoto(photoId: string) {
    await deletePhoto(db, photoId);
    revokePhotoUrl(photoId);
    await load();
    // Closing goes through history, because the viewer added its own entry there.
    if (photoIds.length === 0) history.back();
  }

  async function removeSet() {
    if (!set) return;
    const target = isWish ? 'wishlist' : 'collection';
    await deleteSet(db, set.id);
    photoIds.forEach(revokePhotoUrl);
    replaceRoute({ page: target });
  }

  function openBuy() {
    if (!set) return;
    buyDate = todayIso();
    buyPrice = euroInput(set.priceCents);
    buyError = '';
    buyOpen = true;
  }

  async function buy() {
    if (!set) return false;
    const parsed = parseEuro(buyPrice);
    if (!parsed.ok) {
      buyError = 'Preis bitte als Zahl, z. B. 49,99.';
      return false;
    }
    const next = markPurchased(set, buyDate || todayIso(), parsed.cents);
    await putSet(db, next);
    set = next;
  }
</script>

{#if set === null}
  <a class="back" href={href({ page: 'collection' })}>‹ Sammlung</a>
  <p class="empty">Dieses Set gibt es nicht (mehr).</p>
{:else if set}
  <a class="back" href={href({ page: isWish ? 'wishlist' : 'collection' })}>‹ {isWish ? 'Wunschliste' : 'Sammlung'}</a>

  <div class="stack">
    <button
      type="button"
      class="cover"
      disabled={!set.coverPhotoId}
      aria-label="Titelbild groß anzeigen"
      onclick={() => openViewer(set?.coverPhotoId ?? null)}
    >
      <PhotoImg id={set.coverPhotoId} alt="Titelbild" />
    </button>
    {#if coverJobs.pending.includes(set.id)}<p class="muted small" role="status">Titelbild wird geladen …</p>{/if}

    <div class="title">
      <h1>{set.name}</h1>
      {#if set.manufacturer}<p class="muted">{set.manufacturer}</p>{/if}
    </div>

    {#if isWish}
      <div class="row">
        <button type="button" class="btn primary" onclick={openBuy}>Gekauft</button>
        {#if set.shopUrl}
          <a class="btn" href={set.shopUrl} target="_blank" rel="noopener noreferrer">Im Shop öffnen</a>
        {/if}
      </div>
    {/if}

    {#if facts.length > 0}
      <dl class="card">
        {#each facts as [label, value] (label)}
          <div>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        {/each}
      </dl>
    {/if}

    {#if set.note}<p class="note">{set.note}</p>{/if}

    {#if coverError}<p class="notice bad" role="alert">{coverError}</p>{/if}
    <div class="row">
      <a class="btn" href={href({ page: 'setForm', id: set.id, wish: false })}>Bearbeiten</a>
      <label class="btn">
        {set.coverPhotoId ? 'Titelbild ersetzen' : 'Titelbild hinzufügen'}
        <input type="file" accept="image/*" onchange={uploadCover} hidden />
      </label>
      <button type="button" class="btn danger" onclick={() => (confirmDelete = true)}>Löschen</button>
    </div>

    {#if !isWish}
      <section class="stack">
        <div class="page-head diary-head">
          <div>
            <h2>Bautagebuch</h2>
            {#if entries.length > 0}
              <p class="muted small">
                {plural(entries.length, 'Eintrag', 'Einträge')}{totalMinutes > 0
                  ? ` · ${formatMinutes(totalMinutes)} Bauzeit`
                  : ''}
              </p>
            {/if}
          </div>
          <a class="btn primary" href={href({ page: 'entryForm', setId: set.id, entryId: null })}>Eintrag hinzufügen</a>
        </div>

        {#if entries.length === 0}
          <p class="muted">Noch kein Eintrag. Halte fest, wie der Bau vorangeht.</p>
        {/if}

        {#each entries as entry (entry.id)}
          <article class="card entry">
            <header>
              <strong>{formatDate(entry.date)}</strong>
              <a href={href({ page: 'entryForm', setId: set.id, entryId: entry.id })}>Bearbeiten</a>
            </header>
            {#if entry.section || entry.minutes !== null}
              <p class="muted small">
                {[entry.section, entry.minutes !== null ? formatMinutes(entry.minutes) : ''].filter(Boolean).join(' · ')}
              </p>
            {/if}
            {#if entry.note}<p class="note">{entry.note}</p>{/if}
            {#if entry.photoIds.length > 0}
              <div class="photos">
                {#each entry.photoIds as photoId (photoId)}
                  <button type="button" aria-label="Foto groß anzeigen" onclick={() => openViewer(photoId)}>
                    <PhotoImg id={photoId} alt="Foto vom {formatDate(entry.date)}" />
                  </button>
                {/each}
              </div>
            {/if}
          </article>
        {/each}
      </section>
    {/if}
  </div>

  {#if viewerIndex !== null && photoIds.length > 0}
    <PhotoViewer
      {photoIds}
      startIndex={viewerIndex}
      coverId={set.coverPhotoId}
      onclose={() => (viewerIndex = null)}
      onsetcover={setCover}
      ondelete={removePhoto}
    />
  {/if}

  <ConfirmDialog
    bind:open={confirmDelete}
    title={isWish ? 'Wunsch löschen?' : 'Set löschen?'}
    message={isWish
      ? `„${set.name}“ von der Wunschliste löschen? Das lässt sich nicht rückgängig machen.`
      : `Set „${set.name}“ mit allen Einträgen und Fotos löschen? Das lässt sich nicht rückgängig machen.`}
    confirmLabel="Löschen"
    danger
    onconfirm={removeSet}
  />

  <ConfirmDialog bind:open={buyOpen} title="Gekauft" confirmLabel="In die Sammlung" onconfirm={buy}>
    <label class="field">
      <span>Kaufdatum</span>
      <input type="date" bind:value={buyDate} />
    </label>
    <label class="field">
      <span>Gezahlter Preis</span>
      <input type="text" inputmode="decimal" bind:value={buyPrice} placeholder="0,00" />
      {#if buyError}<span class="error" role="alert">{buyError}</span>{/if}
    </label>
  </ConfirmDialog>
{/if}

<style>
  .cover {
    display: block;
    width: 100%;
    aspect-ratio: 4 / 3;
    padding: 0;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: none;
    cursor: pointer;
  }

  .cover:disabled {
    cursor: default;
  }

  .title {
    display: grid;
    gap: 2px;
  }

  dl {
    display: grid;
    gap: 10px;
    margin: 0;
  }

  dl div {
    display: flex;
    justify-content: space-between;
    gap: 16px;
  }

  dt {
    color: var(--muted);
  }

  dd {
    margin: 0;
    text-align: right;
    font-weight: 600;
  }

  .note {
    white-space: pre-wrap;
  }

  .diary-head {
    margin: 12px 0 0;
    align-items: flex-end;
  }

  .entry {
    display: grid;
    gap: 8px;
  }

  .entry header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .entry header a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    margin: -12px 0;
    font-weight: 600;
    text-decoration: none;
  }

  .photos {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
    gap: 8px;
  }

  .photos button {
    aspect-ratio: 1;
    padding: 0;
    overflow: hidden;
    border: 0;
    border-radius: 10px;
    background: none;
    cursor: pointer;
  }
</style>
