<script lang="ts">
  import { formatEuro } from '../lib/format';
  import { href } from '../lib/router';
  import { PRIORITY_LABEL, type BrickSet } from '../lib/types';
  import PhotoImg from './PhotoImg.svelte';

  let { set }: { set: BrickSet } = $props();
</script>

<a class="wish" href={href({ page: 'set', id: set.id })}>
  <div class="thumb"><PhotoImg id={set.coverPhotoId} /></div>
  <div class="text">
    <strong>{set.name}</strong>
    <span class="muted small">
      {[set.manufacturer, set.priority ? `Priorität ${PRIORITY_LABEL[set.priority]}` : ''].filter(Boolean).join(' · ')}
    </span>
  </div>
  <span class="price">{formatEuro(set.priceCents)}</span>
</a>

<style>
  .wish {
    display: grid;
    grid-template-columns: 56px 1fr auto;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--surface);
    color: var(--text);
    text-decoration: none;
  }

  .thumb {
    width: 56px;
    height: 56px;
    overflow: hidden;
    border-radius: 10px;
  }

  .text {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  strong {
    line-height: 1.25;
  }

  .price {
    font-weight: 700;
  }
</style>
