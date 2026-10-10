<script lang="ts" module>
  export interface MediaItem {
    kind: 'photo' | 'video';
    id: string;
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import PhotoImg from './PhotoImg.svelte';
  import ViewerVideo from './ViewerVideo.svelte';

  // Full-screen view of all photos and videos of a set, to swipe through.
  let {
    items,
    startIndex,
    coverId,
    onclose,
    onsetcover,
    ondelete,
  }: {
    items: MediaItem[];
    startIndex: number;
    coverId: string | null;
    onclose: () => void;
    onsetcover: (photoId: string) => void;
    ondelete: (item: MediaItem) => void;
  } = $props();

  let strip: HTMLDivElement;
  // svelte-ignore state_referenced_locally
  let index = $state(startIndex);
  // A video that was tapped starts playing at once; one reached by swiping waits.
  let swiped = $state(false);
  let confirmDelete = $state(false);

  const position = $derived(Math.min(index, items.length - 1));
  const current = $derived(items[position]);

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
    const next = Math.round(strip.scrollLeft / strip.clientWidth);
    if (next !== index) swiped = true;
    index = next;
  }
</script>

<div class="viewer" role="dialog" aria-modal="true" aria-label="Fotos und Videos">
  <div class="top">
    <span>{position + 1} / {items.length}</span>
    <button type="button" class="plain" onclick={() => history.back()}>Schließen</button>
  </div>

  <div class="strip" bind:this={strip} onscroll={onScroll}>
    {#each items as item, i (item.id)}
      <div class="slide">
        {#if item.kind === 'photo'}
          <PhotoImg id={item.id} alt="Foto" contain />
        {:else}
          <ViewerVideo id={item.id} active={i === position} autoplay={i === startIndex && !swiped} />
        {/if}
      </div>
    {/each}
  </div>

  <div class="bottom">
    {#if current?.kind === 'photo'}
      <button type="button" class="plain" disabled={current.id === coverId} onclick={() => onsetcover(current.id)}>
        {current.id === coverId ? 'Ist Titelbild' : 'Als Titelbild'}
      </button>
    {:else}
      <span></span>
    {/if}
    <button type="button" class="plain" onclick={() => (confirmDelete = true)}>Löschen</button>
  </div>
</div>

<ConfirmDialog
  bind:open={confirmDelete}
  title={current?.kind === 'video' ? 'Video löschen?' : 'Foto löschen?'}
  message="Das lässt sich nicht rückgängig machen."
  confirmLabel="Löschen"
  danger
  onconfirm={() => current && ondelete(current)}
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
    min-height: 0;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
  }

  .slide {
    flex: 0 0 100%;
    min-width: 0;
    min-height: 0;
    scroll-snap-align: center;
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

  .plain:disabled {
    opacity: 0.55;
  }
</style>
