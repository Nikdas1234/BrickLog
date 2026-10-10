<script lang="ts">
  import SetCard from '../components/SetCard.svelte';
  import { getDb } from '../lib/context';
  import { coverJobs } from '../lib/coverJobs.svelte';
  import { listSets } from '../lib/db';
  import { plural } from '../lib/format';
  import { href } from '../lib/router';
  import { filterSets, suggestions } from '../lib/sets';
  import type { BrickSet } from '../lib/types';

  const db = getDb();

  let sets = $state.raw<BrickSet[] | null>(null);
  let query = $state('');
  let manufacturer = $state('');
  let theme = $state('');

  // Also runs again when a cover picture arrives that was fetched in the background.
  $effect(() => {
    void coverJobs.finished;
    listSets(db).then((all) => {
      sets = all.filter((s) => s.status !== 'wunsch').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    });
  });

  const manufacturers = $derived(
    [...new Set((sets ?? []).map((s) => s.manufacturer).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de')),
  );
  const themes = $derived(suggestions(sets ?? [], 'theme'));
  const visible = $derived(
    filterSets(sets ?? [], {
      query,
      manufacturer: manufacturer || null,
      theme: theme || null,
    }),
  );
</script>

{#if sets === null}
  <p class="empty">Lade …</p>
{:else if sets.length === 0}
  <p class="empty">Noch keine Sets. Tippe auf +, um dein erstes anzulegen.</p>
{:else}
  <div class="filters">
    <input type="search" bind:value={query} placeholder="Name oder Setnummer suchen" aria-label="Suche" />
    <div class="selects">
      <select bind:value={manufacturer} aria-label="Hersteller">
        <option value="">Alle Hersteller</option>
        {#each manufacturers as m (m)}<option value={m}>{m}</option>{/each}
      </select>
      <select bind:value={theme} aria-label="Thema">
        <option value="">Alle Themen</option>
        {#each themes as t (t)}<option value={t}>{t}</option>{/each}
      </select>
    </div>
    <p class="muted small count">
      {visible.length === sets.length
        ? plural(sets.length, 'Set', 'Sets')
        : `${visible.length} von ${plural(sets.length, 'Set', 'Sets')}`}
    </p>
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
    gap: 10px;
    margin-bottom: 18px;
  }

  .selects {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .selects select {
    min-height: 42px;
    padding-block: 8px;
    font-size: 0.875rem;
    text-overflow: ellipsis;
  }

  .count {
    margin: 4px 2px 0;
    font-weight: 650;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 14px;
  }
</style>
