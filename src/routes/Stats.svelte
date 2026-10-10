<script lang="ts">
  import { getDb } from '../lib/context';
  import { listAllEntries, listSets } from '../lib/db';
  import { formatEuro, formatMinutes, plural } from '../lib/format';
  import { computeStats, type Stats } from '../lib/stats';

  const db = getDb();

  let stats = $state.raw<Stats | null>(null);
  let empty = $state(false);

  Promise.all([listSets(db), listAllEntries(db)]).then(([sets, entries]) => {
    empty = sets.length === 0;
    stats = computeStats(sets, entries);
  });

</script>

{#if stats === null}
  <p class="empty">Lade …</p>
{:else if empty}
  <p class="empty">Noch nichts zu zählen.</p>
{:else}
  <div class="stack">
    <div class="tiles">
      <div class="card tile">
        <span class="muted small">Sets</span>
        <strong>{stats.ownedCount}</strong>
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

    {#if stats.wishCount > 0}
      <section class="card">
        <h2>Wunschliste</h2>
        <p>
          {plural(stats.wishCount, 'Wunsch', 'Wünsche')} im Wert von
          <strong class="price">{formatEuro(stats.wishlistCents)}</strong>
        </p>
      </section>
    {/if}

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
    gap: 14px;
  }

  .tile {
    display: grid;
    gap: 6px;
  }

  /* A short golden bar marks each figure, like a knob on a brick. */
  .tile::before {
    content: '';
    width: 30px;
    height: 5px;
    margin-bottom: 4px;
    border-radius: 3px;
    background: var(--gold);
  }

  .tile strong {
    font-size: 1.5rem;
    font-weight: 750;
    line-height: 1.2;
    letter-spacing: -0.02em;
  }

  section {
    display: grid;
    gap: 12px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th {
    padding: 0 0 8px;
    color: var(--muted);
    font-size: 0.8125rem;
    font-weight: 650;
    text-align: left;
  }

  td {
    padding: 11px 0;
    border-top: 1px solid var(--border);
  }

  td:first-child {
    font-weight: 650;
  }

  .num {
    padding-left: 12px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
</style>
