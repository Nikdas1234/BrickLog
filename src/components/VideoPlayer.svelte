<script lang="ts">
  import { onMount } from 'svelte';
  import { getDb } from '../lib/context';
  import { getVideo } from '../lib/db';
  import ConfirmDialog from './ConfirmDialog.svelte';

  let { id, onclose, ondelete }: { id: string; onclose: () => void; ondelete: (id: string) => void } = $props();

  const db = getDb();
  let url = $state<string | null>(null);
  let failed = $state(false);
  let confirmDelete = $state(false);

  // Like the photo viewer, the player gets its own history entry, so the phone's back
  // button closes it instead of leaving the set page.
  onMount(() => {
    history.pushState({ viewer: true }, '');
    const onPop = () => onclose();
    addEventListener('popstate', onPop);

    let created: string | null = null;
    // svelte-ignore state_referenced_locally
    getVideo(db, id).then((video) => {
      if (!video) {
        failed = true;
        return;
      }
      // The video stays on disk; the address only points at it.
      created = URL.createObjectURL(video.blob);
      url = created;
    });

    return () => {
      removeEventListener('popstate', onPop);
      if (created) URL.revokeObjectURL(created);
    };
  });
</script>

<div class="player" role="dialog" aria-modal="true" aria-label="Video">
  <div class="top">
    <button type="button" class="plain" onclick={() => history.back()}>Schließen</button>
  </div>

  <div class="stage">
    {#if failed}
      <p>Dieses Video lässt sich hier nicht abspielen. Es ist weiterhin gespeichert und in der Sicherung enthalten.</p>
    {:else if url}
      <!-- svelte-ignore a11y_media_has_caption -->
      <video src={url} controls autoplay playsinline onerror={() => (failed = true)}></video>
    {/if}
  </div>

  <div class="bottom">
    <button type="button" class="plain" onclick={() => (confirmDelete = true)}>Löschen</button>
  </div>
</div>

<ConfirmDialog
  bind:open={confirmDelete}
  title="Video löschen?"
  message="Das lässt sich nicht rückgängig machen."
  confirmLabel="Löschen"
  danger
  onconfirm={() => ondelete(id)}
/>

<style>
  .player {
    position: fixed;
    inset: 0;
    z-index: 10;
    display: grid;
    grid-template-rows: auto 1fr auto;
    background: #000;
    color: #fff;
  }

  .top,
  .bottom {
    display: flex;
    justify-content: flex-end;
    padding: 4px 8px;
  }

  .top {
    padding-top: calc(4px + var(--inset-top));
  }

  .bottom {
    padding-bottom: calc(4px + var(--inset-bottom));
  }

  .stage {
    display: grid;
    place-items: center;
    min-height: 0;
  }

  video {
    max-width: 100%;
    max-height: 100%;
  }

  p {
    max-width: 32ch;
    padding: 24px;
    text-align: center;
  }

  .plain {
    min-height: 44px;
    padding: 0 12px;
    border: 0;
    background: none;
    color: #fff;
    font: inherit;
    font-weight: 650;
    cursor: pointer;
  }
</style>
