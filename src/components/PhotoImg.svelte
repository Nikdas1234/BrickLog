<script lang="ts">
  import { getDb } from '../lib/context';
  import { photoUrl } from '../lib/photoUrl';

  let { id, alt = '', contain = false }: { id: string | null; alt?: string; contain?: boolean } = $props();

  const db = getDb();
  let url = $state<string | null>(null);

  $effect(() => {
    const current = id;
    url = null;
    if (!current) return;
    let stale = false;
    photoUrl(db, current).then((u) => {
      if (!stale) url = u;
    });
    return () => {
      stale = true;
    };
  });
</script>

{#if url}
  <img src={url} {alt} class:contain />
{:else}
  <div class="placeholder" aria-hidden="true">
    <svg viewBox="0 0 48 48" width="40" height="40">
      <rect x="8" y="18" width="32" height="20" rx="3" />
      <rect x="13" y="11" width="8" height="7" rx="2" />
      <rect x="27" y="11" width="8" height="7" rx="2" />
    </svg>
  </div>
{/if}

<style>
  img,
  .placeholder {
    width: 100%;
    height: 100%;
  }

  img {
    object-fit: cover;
  }

  img.contain {
    object-fit: contain;
  }

  .placeholder {
    display: grid;
    place-items: center;
    background: var(--chip);
  }

  svg {
    fill: var(--border);
  }
</style>
