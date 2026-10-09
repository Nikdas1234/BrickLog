<script lang="ts">
  import CatalogSearch from '../components/CatalogSearch.svelte';
  import SuggestInput from '../components/SuggestInput.svelte';
  import type { CatalogEntry } from '../lib/catalog';
  import { canDownloadImage, downloadCatalogImage } from '../lib/catalogImage';
  import { getDb } from '../lib/context';
  import { getManufacturers, getSet, listSets, putSet, replaceCover, setManufacturers } from '../lib/db';
  import { euroInput, parseCount, parseEuro } from '../lib/format';
  import { resizeToJpeg } from '../lib/photos';
  import { replaceRoute } from '../lib/router';
  import { newSet, suggestions } from '../lib/sets';
  import { PRIORITIES, PRIORITY_LABEL, type BrickSet } from '../lib/types';

  let { id, wish }: { id: string | null; wish: boolean } = $props();

  const db = getDb();
  const NEW_MANUFACTURER = '__new__';

  let draft = $state<BrickSet | null>(null);
  let missing = $state(false);
  let allSets = $state.raw<BrickSet[]>([]);
  let knownManufacturers = $state.raw<string[]>([]);

  // Text mirrors of the non-text fields, so half-typed input is kept as typed.
  let price = $state('');
  let pieces = $state('');
  let purchaseDate = $state('');
  let buildStart = $state('');
  let buildEnd = $state('');
  let manufacturerChoice = $state('');
  let newManufacturer = $state('');
  let errors = $state<{ name?: string; price?: string; pieces?: string; manufacturer?: string }>({});
  let saving = $state(false);
  // Catalog entry that was taken over. Its picture becomes the cover on save, unless
  // the user declines it.
  let picked = $state.raw<CatalogEntry | null>(null);
  let withPicture = $state(true);

  async function load() {
    // svelte-ignore state_referenced_locally
    const loaded = id ? await getSet(db, id) : newSet(wish ? 'wunsch' : 'sammlung');
    if (!loaded) {
      missing = true;
      return;
    }
    [allSets, knownManufacturers] = await Promise.all([listSets(db), getManufacturers(db)]);
    price = euroInput(loaded.priceCents);
    pieces = loaded.pieceCount?.toString() ?? '';
    purchaseDate = loaded.purchaseDate ?? '';
    buildStart = loaded.buildStart ?? '';
    buildEnd = loaded.buildEnd ?? '';
    manufacturerChoice = loaded.manufacturer;
    draft = loaded;
  }
  load();

  const isWish = $derived(draft?.status === 'wunsch');
  // A draft keeps its manufacturer even after the name was removed from the list.
  const manufacturerOptions = $derived(
    draft?.manufacturer && !knownManufacturers.includes(draft.manufacturer)
      ? [...knownManufacturers, draft.manufacturer]
      : knownManufacturers,
  );


  function applyCatalog(entry: CatalogEntry) {
    if (!draft) return;
    draft.name = entry.name;
    draft.setNumber = entry.number;
    draft.theme = entry.theme;
    draft.manufacturer = entry.manufacturer;
    manufacturerChoice = entry.manufacturer;
    pieces = entry.pieces?.toString() ?? '';
    picked = entry;
    withPicture = true;
    // The shop price is a starting point; it stays editable for what was actually paid.
    price = euroInput(entry.priceCents);
    if (draft.status === 'wunsch') draft.shopUrl = entry.url;
    errors = {};
  }

  // Needs an internet connection. Without one the set is saved without a picture.
  async function downloadCover(setId: string, entry: CatalogEntry) {
    try {
      const blob = await downloadCatalogImage(entry);
      if (!blob) return;
      const resized = await resizeToJpeg(new File([blob], 'katalogbild'));
      await replaceCover(db, { id: crypto.randomUUID(), setId, createdAt: new Date().toISOString(), ...resized });
    } catch {
      // Unreadable picture: the cover can be added later on the set page.
    }
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!draft || saving) return;

    const parsedPrice = parseEuro(price);
    const parsedPieces = parseCount(pieces);
    const typedManufacturer = newManufacturer.trim();
    errors = {
      name: draft.name.trim() === '' ? 'Bitte gib einen Namen ein.' : undefined,
      price: parsedPrice.ok ? undefined : 'Preis bitte als Zahl, z. B. 49,99.',
      pieces: parsedPieces === undefined ? 'Teilezahl bitte als ganze Zahl.' : undefined,
      manufacturer:
        manufacturerChoice === NEW_MANUFACTURER && typedManufacturer === ''
          ? 'Bitte gib den Namen des Herstellers ein.'
          : undefined,
    };
    if (!parsedPrice.ok || parsedPieces === undefined || Object.values(errors).some(Boolean)) return;

    saving = true;
    const next: BrickSet = {
      ...$state.snapshot(draft),
      name: draft.name.trim(),
      setNumber: draft.setNumber.trim(),
      theme: draft.theme.trim(),
      retailer: draft.retailer.trim(),
      location: draft.location.trim(),
      shopUrl: draft.shopUrl.trim(),
      manufacturer: manufacturerChoice === NEW_MANUFACTURER ? typedManufacturer : manufacturerChoice,
      priceCents: parsedPrice.cents,
      pieceCount: parsedPieces,
      purchaseDate: purchaseDate || null,
      buildStart: buildStart || null,
      buildEnd: buildEnd || null,
    };

    if (next.manufacturer && !knownManufacturers.includes(next.manufacturer)) {
      await setManufacturers(db, [...knownManufacturers, next.manufacturer]);
    }
    await putSet(db, next);
    if (id === null && picked && withPicture) await downloadCover(next.id, picked);
    if (id) history.back();
    else replaceRoute({ page: 'set', id: next.id });
  }
</script>

{#if missing}
  <p class="empty">Dieses Set gibt es nicht (mehr).</p>
{:else if draft}
  <header class="page-head">
    <h1>{id ? 'Set bearbeiten' : isWish ? 'Neuer Wunsch' : 'Neues Set'}</h1>
  </header>

  {#if id === null}
    <div class="catalog-area">
      <CatalogSearch onpick={applyCatalog} />
      {#if picked}
        <div class="picked">
          {#if picked.thumb && withPicture}
            <img src={picked.thumb} alt="Bild aus dem Katalog" />
          {/if}
          <p class="small muted">
            Übernommen aus dem {picked.manufacturer}-Katalog.
            {#if !picked.image || !withPicture}
              Ohne Titelbild.
            {:else if canDownloadImage(picked)}
              Das Bild wird beim Speichern als Titelbild geladen (nur mit Internetverbindung).
            {:else}
              Bilder von {picked.manufacturer} lassen sich nur in der Android-App als Titelbild übernehmen.
            {/if}
            {#if picked.priceCents !== null}
              {picked.priceEstimated
                ? 'Der Preis ist ein Richtwert aus dem Shop, umgerechnet aus US-Dollar.'
                : 'Der Preis ist der Preis im Shop zum Stand des Katalogs.'}
              {#if !isWish}Ändere ihn, falls du etwas anderes gezahlt hast.{/if}
            {/if}
          </p>
          {#if picked.image && withPicture && canDownloadImage(picked)}
            <button type="button" class="btn" onclick={() => (withPicture = false)}>Ohne Bild</button>
          {/if}
        </div>
      {/if}
    </div>
  {/if}

  <form class="stack" onsubmit={save} novalidate>
    <label class="field">
      <span>Name *</span>
      <input type="text" bind:value={draft.name} autocomplete="off" aria-invalid={!!errors.name} />
      {#if errors.name}<span class="error" role="alert">{errors.name}</span>{/if}
    </label>

    <label class="field">
      <span>Hersteller</span>
      <select bind:value={manufacturerChoice}>
        <option value="">– keiner –</option>
        {#each manufacturerOptions as m (m)}<option value={m}>{m}</option>{/each}
        <option value={NEW_MANUFACTURER}>Neuer Hersteller …</option>
      </select>
    </label>
    {#if manufacturerChoice === NEW_MANUFACTURER}
      <label class="field">
        <span>Name des neuen Herstellers</span>
        <input type="text" bind:value={newManufacturer} autocomplete="off" aria-invalid={!!errors.manufacturer} />
        {#if errors.manufacturer}<span class="error" role="alert">{errors.manufacturer}</span>{/if}
      </label>
    {/if}

    <div class="two-col">
      <label class="field">
        <span>Setnummer</span>
        <input type="text" bind:value={draft.setNumber} autocomplete="off" />
      </label>
      <label class="field">
        <span>Teilezahl</span>
        <input type="text" inputmode="numeric" bind:value={pieces} aria-invalid={!!errors.pieces} />
      </label>
    </div>
    {#if errors.pieces}<span class="error" role="alert">{errors.pieces}</span>{/if}

    <SuggestInput label="Thema/Reihe" bind:value={draft.theme} options={suggestions(allSets, 'theme')} />

    <div class="two-col">
      <label class="field">
        <span>{isWish ? 'Preis (erwartet)' : 'Preis'}</span>
        <input type="text" inputmode="decimal" bind:value={price} placeholder="0,00" aria-invalid={!!errors.price} />
      </label>
      {#if isWish}
        <label class="field">
          <span>Priorität</span>
          <select bind:value={draft.priority}>
            <option value={null}>– keine –</option>
            {#each PRIORITIES as p (p)}<option value={p}>{PRIORITY_LABEL[p]}</option>{/each}
          </select>
        </label>
      {:else}
        <label class="field">
          <span>Kaufdatum</span>
          <input type="date" bind:value={purchaseDate} />
        </label>
      {/if}
    </div>
    {#if errors.price}<span class="error" role="alert">{errors.price}</span>{/if}

    <SuggestInput label="Händler" bind:value={draft.retailer} options={suggestions(allSets, 'retailer')} />

    {#if isWish}
      <label class="field">
        <span>Shop-Link</span>
        <input type="url" inputmode="url" bind:value={draft.shopUrl} placeholder="https://…" autocomplete="off" />
      </label>
    {:else}
      <SuggestInput label="Lagerort" bind:value={draft.location} options={suggestions(allSets, 'location')} />
    {/if}

    {#if !isWish}
      <div class="two-col">
        <label class="field">
          <span>Baubeginn</span>
          <input type="date" bind:value={buildStart} />
        </label>
        <label class="field">
          <span>Fertigstellung</span>
          <input type="date" bind:value={buildEnd} />
        </label>
      </div>
    {/if}

    <label class="field">
      <span>Notiz</span>
      <textarea bind:value={draft.note}></textarea>
    </label>

    <div class="form-actions">
      <button type="button" class="btn" onclick={() => history.back()}>Abbrechen</button>
      <button type="submit" class="btn primary" disabled={saving}>Speichern</button>
    </div>
  </form>
{/if}

<style>
  .catalog-area {
    display: grid;
    gap: 12px;
    margin-bottom: 20px;
  }

  .picked {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 12px;
  }

  .picked p:first-child {
    grid-column: 1 / -1;
  }

  .picked img {
    width: 96px;
    height: 96px;
    border-radius: 10px;
    object-fit: cover;
  }

  .picked .btn {
    grid-column: 1 / -1;
  }
</style>