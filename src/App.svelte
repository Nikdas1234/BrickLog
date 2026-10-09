<script lang="ts">
  import TabBar from './components/TabBar.svelte';
  import { provideDb } from './lib/context';
  import type { BrickDb } from './lib/db';
  import { parseRoute } from './lib/router';
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

  const hasTabs = $derived(
    route.page === 'collection' || route.page === 'wishlist' || route.page === 'stats' || route.page === 'settings',
  );
</script>

<main class="page" class:with-tabs={hasTabs}>
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
