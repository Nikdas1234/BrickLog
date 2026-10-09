<script lang="ts">
  import { onMount } from 'svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import PhotoImg from './PhotoImg.svelte';

  let {
    photoIds,
    startIndex,
    coverId,
    onclose,
    onsetcover,
    ondelete,
  }: {
    photoIds: string[];
    startIndex: number;
    coverId: string | null;
    onclose: () => void;
    onsetcover: (id: string) => void;
    ondelete: (id: string) => void;
  } = $props();

  let strip: HTMLDivElement;
  // svelte-ignore state_referenced_locally
  let index = $state(startIndex);
  let confirmDelete = $state(false);

  const currentId = $derived(photoIds[Math.min(index, photoIds.length - 1)]);

  // The viewer gets its own history entry, so the phone's back button closes it
  // instead of leaving the set page.
  onMount(() => {
    history.pushState({ viewer: true }, '');
    const onPop = () => onclose();
    addEventListener('popstate', onPop);
    strip.scrollLeft = startIndex * strip.clientWidth;
    return () => removeEventListener('popstate', onPop);
  });

  function onScroll() {
    index = Math.round(strip.scrollLeft / strip.clientWidth);
  }
</script>

<div class="viewer" role="dialog" aria-modal="true" aria-label="Fotos">
  <div class="top">
    <span>{Math.min(index, photoIds.length - 1) + 1} / {photoIds.length}</span>
    <button type="button" class="plain" onclick={() => history.back()}>Schließen</button>
  </div>

  <div class="strip" bind:this={strip} onscroll={onScroll}>
    {#each photoIds as id (id)}
      <div class="slide"><PhotoImg {id} alt="Foto" contain /></div>
    {/each}
  </div>

  <div class="bottom">
    <button type="button" class="plain" disabled={currentId === coverId} onclick={() => onsetcover(currentId)}>
      {currentId === coverId ? 'Ist Titelbild' : 'Als Titelbild'}
    </button>
    <button type="button" class="plain" onclick={() => (confirmDelete = true)}>Löschen</button>
  </div>
</div>

<ConfirmDialog
  bind:open={confirmDelete}
  title="Foto löschen?"
  message="Das lässt sich nicht rückgängig machen."
  confirmLabel="Löschen"
  danger
  onconfirm={() => ondelete(currentId)}
/>

<style>
  .viewer {
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
    align-items: center;
    justify-content: space-between;
    padding: 4px 8px 4px 16px;
  }

  .top {
    padding-top: calc(4px + var(--inset-top));
  }

  .bottom {
    padding: 4px 8px calc(4px + var(--inset-bottom));
  }

  .strip {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
  }

  .slide {
    flex: 0 0 100%;
    min-width: 0;
    scroll-snap-align: center;
  }

  .plain {
    min-height: 44px;
    padding: 0 12px;
    border: 0;
    background: none;
    color: #fff;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }

  .plain:disabled {
    opacity: 0.55;
  }
</style>
