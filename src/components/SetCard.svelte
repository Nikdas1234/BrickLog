<script lang="ts">
  import { href } from '../lib/router';
  import { timers } from '../lib/timers.svelte';
  import type { BrickSet } from '../lib/types';
  import Icon from './Icon.svelte';
  import PhotoImg from './PhotoImg.svelte';

  let { set }: { set: BrickSet } = $props();

  const details = $derived(
    [set.manufacturer, set.pieceCount ? `${set.pieceCount.toLocaleString('de-DE')} Teile` : ''].filter(Boolean).join(' · '),
  );
  const timer = $derived(timers[set.id]);
</script>

<a class="set-card" href={href({ page: 'set', id: set.id })}>
  <div class="cover">
    <PhotoImg id={set.coverPhotoId} />
    <!-- Shows at a glance which set is being built right now. -->
    {#if timer}
      <span class="timer" class:paused={timer.runningSince === null}>
        <Icon name="clock" size={14} />{timer.runningSince === null ? 'pausiert' : 'läuft'}
      </span>
    {/if}
  </div>
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
    position: relative;
    aspect-ratio: 4 / 3;
  }

  .timer {
    position: absolute;
    top: 8px;
    left: 8px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px 3px 7px;
    border-radius: 999px;
    background: var(--gold);
    color: var(--navy-deep);
    font-size: 0.75rem;
    font-weight: 700;
    box-shadow: 0 2px 6px rgb(0 0 0 / 0.25);
  }

  .timer.paused {
    background: var(--navy);
    color: #ffffff;
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
