<script lang="ts">
  import { href } from '../lib/router';
  import { STATUS_LABEL, type BrickSet } from '../lib/types';
  import PhotoImg from './PhotoImg.svelte';

  let { set }: { set: BrickSet } = $props();
</script>

<a class="set-card" href={href({ page: 'set', id: set.id })}>
  <div class="cover"><PhotoImg id={set.coverPhotoId} /></div>
  <div class="body">
    <strong>{set.name}</strong>
    {#if set.manufacturer}<span class="muted small">{set.manufacturer}</span>{/if}
    <span class="badge s-{set.status}">{STATUS_LABEL[set.status]}</span>
  </div>
</a>

<style>
  .set-card {
    display: grid;
    grid-template-rows: auto 1fr;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--surface);
    color: var(--text);
    text-decoration: none;
  }

  .cover {
    aspect-ratio: 4 / 3;
  }

  .body {
    display: grid;
    gap: 4px;
    justify-items: start;
    align-content: start;
    padding: 10px 12px 12px;
  }

  strong {
    line-height: 1.25;
  }
</style>
