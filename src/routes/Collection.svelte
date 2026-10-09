<script lang="ts">
  import SetCard from '../components/SetCard.svelte';
  import { getDb } from '../lib/context';
  import { listSets } from '../lib/db';
  import { href } from '../lib/router';
  import { filterSets, suggestions } from '../lib/sets';
  import { OWNED_STATUSES, STATUS_LABEL, type BrickSet, type Status } from '../lib/types';

  const db = getDb();

  let sets = $state.raw<BrickSet[] | null>(null);
  let query = $state('');
  let status = $state<Status | ''>('');
  let manufacturer = $state('');
  let theme = $state('');

  listSets(db).then((all) => {
    sets = all.filter((s) => s.status !== 'wunsch').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

  const manufacturers = $derived(
    [...new Set((sets ?? []).map((s) => s.manufacturer).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de')),
  );
  const themes = $derived(suggestions(sets ?? [], 'theme'));
  const visible = $derived(
    filterSets(sets ?? [], {
      query,
      status: status || null,
      manufacturer: manufacturer || null,
      theme: theme || null,
    }),
  );
</script>

<header class="page-head">
  <h1>Sammlung</h1>
  {#if sets && sets.length > 0}<span class="muted small">{visible.length} von {sets.length}</span>{/if}
</header>

{#if sets === null}
  <p class="empty">Lade …</p>
{:else if sets.length === 0}
  <p class="empty">Noch keine Sets. Tippe auf +, um dein erstes anzulegen.</p>
{:else}
  <div class="filters">
    <input type="search" bind:value={query} placeholder="Name oder Setnummer suchen" aria-label="Suche" />
    <div class="selects">
      <select bind:value={status} aria-label="Status">
        <option value="">Alle Status</option>
        {#each OWNED_STATUSES as s (s)}<option value={s}>{STATUS_LABEL[s]}</option>{/each}
      </select>
      <select bind:value={manufacturer} aria-label="Hersteller">
        <option value="">Alle Hersteller</option>
        {#each manufacturers as m (m)}<option value={m}>{m}</option>{/each}
      </select>
      <select bind:value={theme} aria-label="Thema">
        <option value="">Alle Themen</option>
        {#each themes as t (t)}<option value={t}>{t}</option>{/each}
      </select>
    </div>
  </div>

  {#if visible.length === 0}
    <p class="empty">Kein Set passt zu Suche und Filter.</p>
  {:else}
    <div class="grid">
      {#each visible as set (set.id)}<SetCard {set} />{/each}
    </div>
  {/if}
{/if}

<a class="fab" href={href({ page: 'setForm', id: null, wish: false })} aria-label="Set anlegen">+</a>

<style>
  .filters {
    display: grid;
    gap: 8px;
    margin-bottom: 16px;
  }

  .selects {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .selects select {
    padding-inline: 8px;
    font-size: 0.875rem;
    text-overflow: ellipsis;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
  }
</style>
