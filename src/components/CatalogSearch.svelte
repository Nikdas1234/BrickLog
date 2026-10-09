<script lang="ts">
  import { catalogImageUrl, loadCatalog, searchCatalog, type CatalogEntry } from '../lib/catalog';
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
</script>

<div class="catalog card">
  <label class="field">
    <span>Aus dem Lumibricks-Katalog übernehmen</span>
    <input type="search" bind:value={query} placeholder="Setnummer oder Name" autocomplete="off" />
  </label>

  {#if query.trim() !== ''}
    {#if hits.length === 0}
      <p class="muted small">Kein Treffer. Du kannst das Set unten von Hand anlegen.</p>
    {:else}
      <ul>
        {#each hits as entry (entry.number)}
          <li>
            <button type="button" onclick={() => pick(entry)}>
              {#if entry.image}
                <img src={catalogImageUrl(entry.image, 120)} alt="" loading="lazy" />
              {:else}
                <span class="no-image"></span>
              {/if}
              <span class="text">
                <strong>{entry.name}</strong>
                <span class="muted small">
                  {[
                    entry.number,
                    entry.theme,
                    entry.pieces ? `${entry.pieces.toLocaleString('de-DE')} Teile` : '',
                    entry.priceCents ? `ca. ${formatEuro(entry.priceCents)}` : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
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

  img,
  .no-image {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    background: var(--chip);
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
