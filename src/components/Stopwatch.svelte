<script lang="ts">
  import { formatMinutes } from '../lib/format';
  import { elapsedMs, formatClock, timerMinutes } from '../lib/timer';
  import {
    discardBuildTimer,
    pauseBuildTimer,
    resumeBuildTimer,
    startBuildTimer,
    timers,
  } from '../lib/timers.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import Icon from './Icon.svelte';

  // The stopwatch of one set. `onfinish` is called when the measured time should become
  // a diary entry; the time itself stays stored until that entry is saved.
  let { setId, onfinish }: { setId: string; onfinish: () => void } = $props();

  const timer = $derived(timers[setId]);
  const running = $derived(timer?.runningSince != null);

  let now = $state(Date.now());
  let confirmDiscard = $state(false);

  // The display only needs to tick while the stopwatch runs. Coming back from the
  // background refreshes it at once instead of waiting for the next second.
  $effect(() => {
    if (!running) return;
    now = Date.now();
    const tick = () => (now = Date.now());
    const interval = setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  });

  const elapsed = $derived(timer ? elapsedMs(timer, now) : 0);

  function finish() {
    pauseBuildTimer(setId);
    onfinish();
  }
</script>

<section class="stopwatch" class:active={!!timer} aria-label="Stoppuhr">
  {#if !timer}
    <div class="idle">
      <span class="badge"><Icon name="clock" size={22} /></span>
      <div>
        <strong>Stoppuhr</strong>
        <p class="hint">Miss die Bauzeit für den nächsten Abschnitt.</p>
      </div>
      <button type="button" class="btn start" onclick={() => startBuildTimer(setId)}>
        <Icon name="play" size={18} />Starten
      </button>
    </div>
  {:else}
    <div class="display">
      <span class="state" class:paused={!running}>
        <span class="dot"></span>{running ? 'Läuft' : 'Pausiert'}
      </span>
      <span class="time" role="timer" aria-live="off">{formatClock(elapsed)}</span>
      <span class="hint">
        {elapsed < 60_000 ? 'weniger als eine Minute' : `entspricht ${formatMinutes(timerMinutes(elapsed))} Bauzeit`}
      </span>
    </div>
    <div class="actions">
      {#if running}
        <button type="button" class="btn ghost" onclick={() => pauseBuildTimer(setId)}>
          <Icon name="pause" size={18} />Pause
        </button>
      {:else}
        <button type="button" class="btn ghost" onclick={() => resumeBuildTimer(setId)}>
          <Icon name="play" size={18} />Weiter
        </button>
      {/if}
      <button type="button" class="btn start" onclick={finish}>
        <Icon name="check" size={18} />Fertig
      </button>
    </div>
    <button type="button" class="discard" onclick={() => (confirmDiscard = true)}>Zeit verwerfen</button>
  {/if}
</section>

<ConfirmDialog
  bind:open={confirmDiscard}
  title="Gemessene Zeit verwerfen?"
  message="Die Stoppuhr wird auf null gesetzt. Es wird kein Eintrag angelegt."
  confirmLabel="Verwerfen"
  danger
  onconfirm={() => discardBuildTimer(setId)}
/>

<style>
  /* The stopwatch wears the logo's navy in both themes, so it reads as one instrument. */
  .stopwatch {
    display: grid;
    gap: 16px;
    padding: 18px;
    border-radius: var(--radius);
    background: linear-gradient(150deg, #24426b 0%, var(--navy) 45%, var(--navy-deep) 100%);
    color: #ffffff;
    box-shadow: var(--shadow);
  }

  .stopwatch.active {
    padding: 22px 18px 14px;
    box-shadow: var(--shadow-strong);
  }

  .idle {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 14px;
  }

  .badge {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 14px;
    background: rgb(255 255 255 / 0.12);
    color: var(--gold);
  }

  .hint {
    color: rgb(255 255 255 / 0.72);
    font-size: 0.8125rem;
  }

  .display {
    display: grid;
    justify-items: center;
    gap: 4px;
  }

  .state {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--gold);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .state.paused {
    color: rgb(255 255 255 / 0.72);
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
  }

  .state:not(.paused) .dot {
    animation: pulse 1.6s ease-in-out infinite;
  }

  @keyframes pulse {
    50% {
      opacity: 0.25;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .state:not(.paused) .dot {
      animation: none;
    }
  }

  .time {
    font-size: 3.25rem;
    font-weight: 750;
    line-height: 1.1;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }

  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .start {
    background: var(--gold);
    border-color: var(--gold);
    color: var(--navy-deep);
    box-shadow: none;
  }

  .ghost {
    background: rgb(255 255 255 / 0.1);
    border-color: rgb(255 255 255 / 0.28);
    color: #ffffff;
  }

  .discard {
    justify-self: center;
    min-height: 44px;
    padding: 0 16px;
    border: 0;
    background: none;
    color: rgb(255 255 255 / 0.72);
    font: inherit;
    font-size: 0.875rem;
    font-weight: 650;
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
  }

  @media (prefers-color-scheme: dark) {
    .stopwatch {
      border: 1px solid var(--border);
      background: linear-gradient(150deg, #1f3559 0%, #172b4a 50%, #101d33 100%);
    }
  }
</style>
