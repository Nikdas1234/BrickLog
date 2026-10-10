<script lang="ts">
  import WishRow from '../components/WishRow.svelte';
  import { getDb } from '../lib/context';
  import { coverJobs } from '../lib/coverJobs.svelte';
  import { listSets } from '../lib/db';
  import { formatEuro, plural } from '../lib/format';
  import { href } from '../lib/router';
  import { sortWishlist } from '../lib/sets';
  import type { BrickSet } from '../lib/types';

  const db = getDb();

  let wishes = $state.raw<BrickSet[] | null>(null);
  let sortBy = $state<'priority' | 'price'>('priority');

  // Also runs again when a cover picture arrives that was fetched in the background.
  $effect(() => {
    void coverJobs.finished;
    listSets(db).then((all) => {
      wishes = all.filter((s) => s.status === 'wunsch');
    });
  });

  const sorted = $derived(sortWishlist(wishes ?? [], sortBy));
  const total = $derived((wishes ?? []).reduce((sum, s) => sum + (s.priceCents ?? 0), 0));
</script>

{#if wishes === null}
  <p class="empty">Lade …</p>
{:else if wishes.length === 0}
  <p class="empty">Deine Wunschliste ist leer. Tippe auf +, um einen Wunsch anzulegen.</p>
{:else}
  <div class="summary card">
    <p>
      <span class="muted small">{plural(wishes.length, 'Wunsch', 'Wünsche')} im Wert von</span>
      <strong class="price">{formatEuro(total)}</strong>
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
    gap: 14px;
    margin-bottom: 18px;
  }

  .summary p {
    display: grid;
  }

  .summary strong {
    font-size: 1.625rem;
    font-weight: 750;
    line-height: 1.2;
    letter-spacing: -0.02em;
  }

  .toggle {
    display: flex;
    padding: 4px;
    border-radius: 14px;
    background: var(--chip);
  }

  .toggle button {
    min-width: 64px;
    min-height: 44px;
    padding: 0 14px;
    border: 0;
    border-radius: 10px;
    background: none;
    color: var(--muted);
    font: inherit;
    font-size: 0.875rem;
    font-weight: 650;
    cursor: pointer;
  }

  .toggle button[aria-pressed='true'] {
    background: var(--surface);
    color: var(--text);
    box-shadow: 0 1px 3px rgb(19 34 56 / 0.15);
  }

  .list {
    display: grid;
    gap: 10px;
  }
</style>
