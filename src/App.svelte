<script lang="ts">
  import TabBar from './components/TabBar.svelte';
  import UpdateBanner from './components/UpdateBanner.svelte';
  import { provideDb } from './lib/context';
  import type { BrickDb } from './lib/db';
  import { parseRoute, type Route } from './lib/router';
  import Collection from './routes/Collection.svelte';
  import EntryForm from './routes/EntryForm.svelte';
  import SetDetail from './routes/SetDetail.svelte';
  import SetForm from './routes/SetForm.svelte';
  import Settings from './routes/Settings.svelte';
  import Stats from './routes/Stats.svelte';
  import Wishlist from './routes/Wishlist.svelte';

  let { db }: { db: BrickDb } = $props();
  // svelte-ignore state_referenced_locally
  provideDb(db);

  let route = $state.raw(parseRoute(location.hash));

  $effect(() => {
    const onHashChange = () => {
      route = parseRoute(location.hash);
      scrollTo(0, 0);
    };
    addEventListener('hashchange', onHashChange);
    return () => removeEventListener('hashchange', onHashChange);
  });

  const TITLES: Partial<Record<Route['page'], string>> = {
    collection: 'Sammlung',
    wishlist: 'Wunschliste',
    stats: 'Statistik',
    settings: 'Einstellungen',
  };
  // Only the four main pages have a title here; they are also the ones with the tab bar.
  const title = $derived(TITLES[route.page]);
  const hasTabs = $derived(title !== undefined);
</script>

<main class="page" class:with-tabs={hasTabs}>
  {#if hasTabs}
    <header class="hero">
      <div>
        <p class="eyebrow">BrickLog</p>
        <h1>{title}</h1>
      </div>
      <!-- The brick from the logo. -->
      <svg class="mark" viewBox="0 0 560 360" aria-hidden="true">
        <rect y="70" width="560" height="290" rx="26" fill="var(--gold)" />
        <rect x="61.600" y="0.600" width="156.800" height="75.400" rx="19" fill="var(--gold)" />
        <rect x="341.600" y="0.600" width="156.800" height="75.400" rx="19" fill="var(--gold)" />
        <rect y="270" width="560" height="90" rx="26" fill="var(--gold-deep)" />
        <rect y="270" width="560" height="40" fill="var(--gold-deep)" />
      </svg>
    </header>
    <UpdateBanner />
  {/if}
  {#if route.page === 'collection'}
    <Collection />
  {:else if route.page === 'wishlist'}
    <Wishlist />
  {:else if route.page === 'stats'}
    <Stats />
  {:else if route.page === 'settings'}
    <Settings />
  {:else if route.page === 'set'}
    {#key route.id}<SetDetail id={route.id} />{/key}
  {:else if route.page === 'setForm'}
    {#key `${route.id}-${route.wish}`}<SetForm id={route.id} wish={route.wish} />{/key}
  {:else if route.page === 'entryForm'}
    {#key `${route.setId}-${route.entryId}`}<EntryForm setId={route.setId} entryId={route.entryId} />{/key}
  {/if}
</main>

{#if hasTabs}<TabBar current={route.page} />{/if}

<style>
  .hero {
    position: relative;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    min-height: 116px;
    margin-bottom: 20px;
    padding: 22px 22px 20px;
    overflow: hidden;
    border-radius: 24px;
    background: linear-gradient(150deg, #24426b 0%, var(--navy) 45%, var(--navy-deep) 100%);
    color: #ffffff;
    box-shadow: var(--shadow-strong);
  }

  .eyebrow {
    margin-bottom: 2px;
    color: var(--gold);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  h1 {
    font-size: 1.875rem;
  }

  .mark {
    flex: none;
    width: 86px;
    margin: 0 -2px 2px 12px;
    filter: drop-shadow(0 8px 14px rgb(0 0 0 / 0.3));
  }

  @media (prefers-color-scheme: dark) {
    .hero {
      background: linear-gradient(150deg, #1f3559 0%, #172b4a 50%, #101d33 100%);
      border: 1px solid var(--border);
    }
  }
</style>
