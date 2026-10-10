<script lang="ts">
  import { href } from '../lib/router';
  import type { BrickSet } from '../lib/types';
  import PhotoImg from './PhotoImg.svelte';

  let { set }: { set: BrickSet } = $props();

  const details = $derived(
    [set.manufacturer, set.pieceCount ? `${set.pieceCount.toLocaleString('de-DE')} Teile` : ''].filter(Boolean).join(' · '),
  );
</script>

<a class="set-card" href={href({ page: 'set', id: set.id })}>
  <div class="cover"><PhotoImg id={set.coverPhotoId} /></div>
  <div class="body">
    <strong>{set.name}</strong>
    {#if details}<span class="muted small">{details}</span>{/if}
  </div>
</a>

<style>
  .set-card {
    display: grid;
    grid-template-rows: auto 1fr;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--text);
    text-decoration: none;
    box-shadow: var(--shadow);
    transition: transform 0.1s ease;
  }

  .set-card:active {
    transform: scale(0.98);
  }

  .cover {
    aspect-ratio: 4 / 3;
  }

  .body {
    display: grid;
    gap: 3px;
    align-content: start;
    padding: 12px 14px 14px;
  }

  strong {
    font-weight: 700;
    line-height: 1.25;
  }
</style>
