<script lang="ts">
  import WishRow from '../components/WishRow.svelte';
  import { getDb } from '../lib/context';
  import { listSets } from '../lib/db';
  import { formatEuro, plural } from '../lib/format';
  import { href } from '../lib/router';
  import { sortWishlist } from '../lib/sets';
  import type { BrickSet } from '../lib/types';

  const db = getDb();

  let wishes = $state.raw<BrickSet[] | null>(null);
  let sortBy = $state<'priority' | 'price'>('priority');

  listSets(db).then((all) => {
    wishes = all.filter((s) => s.status === 'wunsch');
  });

  const sorted = $derived(sortWishlist(wishes ?? [], sortBy));
  const total = $derived((wishes ?? []).reduce((sum, s) => sum + (s.priceCents ?? 0), 0));
</script>

<header class="page-head">
  <h1>Wunschliste</h1>
</header>

{#if wishes === null}
  <p class="empty">Lade …</p>
{:else if wishes.length === 0}
  <p class="empty">Deine Wunschliste ist leer.</p>
{:else}
  <div class="summary">
    <p>
      <strong class="price">{formatEuro(total)}</strong>
      <span class="muted">· {plural(wishes.length, 'Wunsch', 'Wünsche')}</span>
    </p>
    <div class="toggle" role="group" aria-label="Sortierung">
      <button type="button" aria-pressed={sortBy === 'priority'} onclick={() => (sortBy = 'priority')}>Priorität</button>
      <button type="button" aria-pressed={sortBy === 'price'} onclick={() => (sortBy = 'price')}>Preis</button>
    </div>
  </div>

  <div class="list">
    {#each sorted as set (set.id)}<WishRow {set} />{/each}
  </div>
{/if}

<a class="fab" href={href({ page: 'setForm', id: null, wish: true })} aria-label="Wunsch anlegen">+</a>

<style>
  .summary {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }

  .summary strong {
    font-size: 1.25rem;
  }

  .toggle {
    display: flex;
    padding: 3px;
    border-radius: 12px;
    background: var(--chip);
  }

  .toggle button {
    min-width: 64px;
    min-height: 44px;
    padding: 0 14px;
    border: 0;
    border-radius: 9px;
    background: none;
    color: var(--muted);
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
  }

  .toggle button[aria-pressed='true'] {
    background: var(--surface);
    color: var(--text);
  }

  .list {
    display: grid;
    gap: 8px;
  }
</style>
