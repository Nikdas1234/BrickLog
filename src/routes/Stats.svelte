<script lang="ts">
  import { getDb } from '../lib/context';
  import { listAllEntries, listSets } from '../lib/db';
  import { formatEuro, formatMinutes } from '../lib/format';
  import { computeStats, type Stats } from '../lib/stats';
  import { STATUSES, STATUS_LABEL } from '../lib/types';

  const db = getDb();

  let stats = $state.raw<Stats | null>(null);
  let empty = $state(false);

  Promise.all([listSets(db), listAllEntries(db)]).then(([sets, entries]) => {
    empty = sets.length === 0;
    stats = computeStats(sets, entries);
  });

  const owned = $derived(
    stats ? stats.countByStatus.ungebaut + stats.countByStatus.im_bau + stats.countByStatus.fertig : 0,
  );
</script>

<header class="page-head">
  <h1>Statistik</h1>
</header>

{#if stats === null}
  <p class="empty">Lade …</p>
{:else if empty}
  <p class="empty">Noch nichts zu zählen.</p>
{:else}
  <div class="stack">
    <div class="tiles">
      <div class="card tile">
        <span class="muted small">Sets im Besitz</span>
        <strong>{owned}</strong>
      </div>
      <div class="card tile">
        <span class="muted small">Teile</span>
        <strong>{stats.totalPieces.toLocaleString('de-DE')}</strong>
      </div>
      <div class="card tile">
        <span class="muted small">Ausgaben</span>
        <strong class="price">{formatEuro(stats.totalSpentCents)}</strong>
      </div>
      <div class="card tile">
        <span class="muted small">Bauzeit</span>
        <strong>{formatMinutes(stats.totalMinutes)}</strong>
      </div>
    </div>

    <section class="card">
      <h2>Nach Status</h2>
      <ul>
        {#each STATUSES as status (status)}
          <li>
            <span class="badge s-{status}">{STATUS_LABEL[status]}</span>
            <strong>{stats.countByStatus[status]}</strong>
          </li>
        {/each}
      </ul>
      {#if stats.wishlistCents > 0}
        <p class="muted small">Die Wunschliste hat einen Wert von {formatEuro(stats.wishlistCents)}.</p>
      {/if}
    </section>

    {#if stats.byManufacturer.length > 0}
      <section class="card">
        <h2>Nach Hersteller</h2>
        <table>
          <thead>
            <tr><th>Hersteller</th><th class="num">Sets</th><th class="num">Ausgaben</th></tr>
          </thead>
          <tbody>
            {#each stats.byManufacturer as row (row.manufacturer)}
              <tr>
                <td>{row.manufacturer}</td>
                <td class="num">{row.count}</td>
                <td class="num price">{formatEuro(row.spentCents)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </section>
    {/if}
  </div>
{/if}

<style>
  .tiles {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .tile {
    display: grid;
    gap: 4px;
  }

  .tile strong {
    font-size: 1.375rem;
    line-height: 1.2;
  }

  section {
    display: grid;
    gap: 12px;
  }

  ul {
    display: grid;
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th {
    padding: 0 0 6px;
    color: var(--muted);
    font-size: 0.8125rem;
    text-align: left;
  }

  td {
    padding: 8px 0;
    border-top: 1px solid var(--border);
  }

  .num {
    padding-left: 12px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
</style>
