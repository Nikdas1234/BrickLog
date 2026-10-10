<script lang="ts">
  import { getDb } from '../lib/context';
  import { getVideo } from '../lib/db';
  import Icon from './Icon.svelte';

  // One video inside the full-screen viewer. Only the slide currently on screen holds a
  // real player; the others show their still picture, so swiping away stops playback.
  let { id, active, autoplay }: { id: string; active: boolean; autoplay: boolean } = $props();

  const db = getDb();
  let url = $state<string | null>(null);
  let posterUrl = $state<string | null>(null);
  let failed = $state(false);

  $effect(() => {
    let stale = false;
    const created: string[] = [];
    getVideo(db, id).then((video) => {
      if (stale) return;
      if (!video) {
        failed = true;
        return;
      }
      if (video.poster) {
        posterUrl = URL.createObjectURL(new Blob([video.poster], { type: 'image/jpeg' }));
        created.push(posterUrl);
      }
      // The video stays on disk; the address only points at it.
      url = URL.createObjectURL(video.blob);
      created.push(url);
    });
    return () => {
      stale = true;
      created.forEach((address) => URL.revokeObjectURL(address));
    };
  });
</script>

<div class="stage">
  {#if failed}
    <p>Dieses Video lässt sich hier nicht abspielen. Es ist weiterhin gespeichert und in der Sicherung enthalten.</p>
  {:else if active && url}
    <!-- svelte-ignore a11y_media_has_caption -->
    <video src={url} poster={posterUrl} controls playsinline {autoplay} onerror={() => (failed = true)}></video>
  {:else}
    {#if posterUrl}<img src={posterUrl} alt="Video" />{/if}
    <span class="play"><Icon name="play" size={56} /></span>
  {/if}
</div>

<style>
  .stage {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
  }

  video,
  img {
    max-width: 100%;
    max-height: 100%;
    min-height: 0;
    object-fit: contain;
  }

  .play {
    position: absolute;
    color: #ffffff;
    filter: drop-shadow(0 2px 8px rgb(0 0 0 / 0.7));
  }

  p {
    max-width: 32ch;
    padding: 24px;
    text-align: center;
  }
</style>
