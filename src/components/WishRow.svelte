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
    <span class="meta">
      {#if set.manufacturer}<span class="muted small">{set.manufacturer}</span>{/if}
      {#if set.priority}<span class="priority p-{set.priority}">{PRIORITY_LABEL[set.priority]}</span>{/if}
    </span>
  </div>
  <span class="price">{formatEuro(set.priceCents)}</span>
</a>

<style>
  .wish {
    display: grid;
    grid-template-columns: 60px 1fr auto;
    align-items: center;
    gap: 14px;
    padding: 10px 16px 10px 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--text);
    text-decoration: none;
    box-shadow: var(--shadow);
    transition: transform 0.1s ease;
  }

  .wish:active {
    transform: scale(0.985);
  }

  .thumb {
    width: 60px;
    height: 60px;
    overflow: hidden;
    border-radius: 12px;
  }

  .text {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  strong {
    font-weight: 700;
    line-height: 1.25;
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  /* High priority wears the logo's gold; the lower ones step back. */
  .priority {
    padding: 1px 10px;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .p-hoch {
    background: var(--gold);
    color: var(--navy-deep);
  }

  .p-mittel {
    background: color-mix(in srgb, var(--gold) 28%, var(--surface));
    color: var(--text);
  }

  .p-niedrig {
    background: var(--chip);
    color: var(--muted);
  }

  .price {
    font-size: 1.0625rem;
    font-weight: 750;
  }
</style>
