<script lang="ts">
  import { loadCatalog, searchCatalog, type CatalogEntry } from '../lib/catalog';
  import { formatEuro } from '../lib/format';

  let { onpick }: { onpick: (entry: CatalogEntry) => void } = $props();

  let catalog = $state.raw<CatalogEntry[]>([]);
  let query = $state('');

  loadCatalog().then((entries) => (catalog = entries));

  const hits = $derived(searchCatalog(catalog, query));

  function pick(entry: CatalogEntry) {
    query = '';
    onpick(entry);
  }

  function describe(entry: CatalogEntry): string {
    return [
      `${entry.manufacturer} ${entry.number}`,
      entry.theme,
      entry.pieces ? `${entry.pieces.toLocaleString('de-DE')} Teile` : '',
      entry.priceCents ? `${entry.priceEstimated ? 'ca. ' : ''}${formatEuro(entry.priceCents)}` : '',
    ]
      .filter(Boolean)
      .join(' · ');
  }

  // A missing thumbnail leaves the grey placeholder instead of a broken-image icon.
  function hideBroken(event: Event) {
    (event.currentTarget as HTMLImageElement).style.visibility = 'hidden';
  }
</script>

<div class="catalog card">
  <label class="field">
    <span>Aus dem Katalog übernehmen (BlueBrixx, Lumibricks)</span>
    <input type="search" bind:value={query} placeholder="Setnummer oder Name" autocomplete="off" />
  </label>

  {#if query.trim() !== ''}
    {#if hits.length === 0}
      <p class="muted small">Kein Treffer. Du kannst das Set unten von Hand anlegen.</p>
    {:else}
      <ul>
        {#each hits as entry (`${entry.manufacturer}:${entry.number}`)}
          <li>
            <button type="button" onclick={() => pick(entry)}>
              <span class="picture">
                {#if entry.thumb}<img src={entry.thumb} alt="" loading="lazy" onerror={hideBroken} />{/if}
              </span>
              <span class="text">
                <strong>{entry.name}</strong>
                <span class="muted small">{describe(entry)}</span>
              </span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</div>

<style>
  .catalog {
    display: grid;
    gap: 10px;
  }

  ul {
    display: grid;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li + li {
    border-top: 1px solid var(--border);
  }

  button {
    display: grid;
    grid-template-columns: 48px 1fr;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 60px;
    padding: 6px 0;
    border: 0;
    background: none;
    color: var(--text);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .picture {
    width: 48px;
    height: 48px;
    overflow: hidden;
    border-radius: 8px;
    background: var(--chip);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .text {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  strong {
    line-height: 1.25;
  }
</style>
