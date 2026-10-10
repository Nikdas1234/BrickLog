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
  <!-- Without a photo: the brick from the logo, toned down. -->
  <div class="placeholder" aria-hidden="true">
    <svg viewBox="0 0 560 360">
      <rect y="70" width="560" height="290" rx="26" />
      <rect x="61.600" y="0.600" width="156.800" height="75.400" rx="19" />
      <rect x="341.600" y="0.600" width="156.800" height="75.400" rx="19" />
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
    background: linear-gradient(150deg, color-mix(in srgb, var(--navy) 12%, var(--surface)), var(--chip));
  }

  svg {
    width: 34%;
    max-width: 72px;
    fill: color-mix(in srgb, var(--gold) 70%, var(--chip));
  }
</style>
