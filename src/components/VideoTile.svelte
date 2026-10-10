<script lang="ts">
  import type { Snippet } from 'svelte';
  import { getDb } from '../lib/context';
  import { getVideo } from '../lib/db';
  import { formatBytes, formatDuration } from '../lib/format';
  import Icon from './Icon.svelte';

  // A stored video as a square tile: still picture, play symbol, length. `children`
  // lets the caller put a control on top, e.g. a remove button.
  let { id, onopen, children }: { id: string; onopen?: () => void; children?: Snippet } = $props();

  const db = getDb();
  let posterUrl = $state<string | null>(null);
  let label = $state('');

  $effect(() => {
    let url: string | null = null;
    let stale = false;
    getVideo(db, id).then((video) => {
      if (stale || !video) return;
      label = video.durationSec !== null ? formatDuration(video.durationSec) : formatBytes(video.size);
      if (video.poster) {
        url = URL.createObjectURL(new Blob([video.poster], { type: 'image/jpeg' }));
        posterUrl = url;
      }
    });
    return () => {
      stale = true;
      if (url) URL.revokeObjectURL(url);
    };
  });
</script>

<div class="tile">
  {#if posterUrl}<img src={posterUrl} alt="" />{/if}
  <span class="play"><Icon name="play" size={22} /></span>
  {#if label}<span class="info">{label}</span>{/if}
  {#if onopen}
    <button type="button" class="open" aria-label="Video abspielen" onclick={onopen}></button>
  {/if}
  {@render children?.()}
</div>

<style>
  .tile {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 14px;
    background: var(--navy-deep);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .play {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: #ffffff;
    filter: drop-shadow(0 1px 4px rgb(0 0 0 / 0.6));
    pointer-events: none;
  }

  .info {
    position: absolute;
    inset: auto 0 0 0;
    padding: 14px 8px 6px;
    background: linear-gradient(transparent, rgb(0 0 0 / 0.7));
    color: #ffffff;
    font-size: 0.6875rem;
    font-weight: 650;
    pointer-events: none;
  }

  .open {
    position: absolute;
    inset: 0;
    border: 0;
    background: none;
    cursor: pointer;
  }
</style>
