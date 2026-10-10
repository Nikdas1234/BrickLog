<script lang="ts" module>
  export interface PendingPhoto {
    id: string;
    data: ArrayBuffer;
    width: number;
    height: number;
    url: string;
  }

  export interface PendingVideo {
    id: string;
    file: Blob;
    type: string;
    size: number;
    durationSec: number | null;
    poster: ArrayBuffer | null;
    posterUrl: string | null;
  }
</script>

<script lang="ts">
  import { formatBytes, formatDuration } from '../lib/format';
  import { PhotoDecodeError, resizeToJpeg } from '../lib/photos';
  import { describeVideo, MAX_VIDEO_BYTES } from '../lib/videos';
  import Icon from './Icon.svelte';

  let {
    photos = $bindable([]),
    videos = $bindable([]),
    busy = $bindable(false),
  }: { photos?: PendingPhoto[]; videos?: PendingVideo[]; busy?: boolean } = $props();

  let skipped = $state<string[]>([]);
  let tooLarge = $state<string[]>([]);

  const filesOf = (event: Event): File[] => {
    const input = event.currentTarget as HTMLInputElement;
    const files = [...(input.files ?? [])];
    input.value = '';
    return files;
  };

  async function addPhotos(event: Event) {
    const files = filesOf(event);
    if (files.length === 0) return;
    busy = true;
    skipped = [];
    tooLarge = [];
    const unreadable: string[] = [];
    for (const file of files) {
      try {
        const resized = await resizeToJpeg(file);
        const url = URL.createObjectURL(new Blob([resized.data], { type: 'image/jpeg' }));
        photos = [...photos, { id: crypto.randomUUID(), ...resized, url }];
      } catch (error) {
        unreadable.push(error instanceof PhotoDecodeError ? error.fileName : file.name);
      }
    }
    skipped = unreadable;
    busy = false;
  }

  async function addVideos(event: Event) {
    const files = filesOf(event);
    if (files.length === 0) return;
    busy = true;
    skipped = [];
    tooLarge = [];
    const oversized: string[] = [];
    for (const file of files) {
      if (file.size > MAX_VIDEO_BYTES) {
        oversized.push(`${file.name} (${formatBytes(file.size)})`);
        continue;
      }
      const info = await describeVideo(file);
      videos = [
        ...videos,
        {
          id: crypto.randomUUID(),
          file,
          type: file.type || 'video/mp4',
          size: file.size,
          ...info,
          posterUrl: info.poster ? URL.createObjectURL(new Blob([info.poster], { type: 'image/jpeg' })) : null,
        },
      ];
    }
    tooLarge = oversized;
    busy = false;
  }

  function removePhoto(photo: PendingPhoto) {
    URL.revokeObjectURL(photo.url);
    photos = photos.filter((p) => p.id !== photo.id);
  }

  function removeVideo(video: PendingVideo) {
    if (video.posterUrl) URL.revokeObjectURL(video.posterUrl);
    videos = videos.filter((v) => v.id !== video.id);
  }
</script>

<div class="picker">
  <div class="sources">
    <label class="btn">
      <Icon name="camera" />Foto
      <input type="file" accept="image/*" capture="environment" onchange={addPhotos} hidden />
    </label>
    <label class="btn">
      <Icon name="image" />Galerie
      <input type="file" accept="image/*" multiple onchange={addPhotos} hidden />
    </label>
    <label class="btn">
      <Icon name="video" />Video
      <input type="file" accept="video/*" capture="environment" onchange={addVideos} hidden />
    </label>
    <label class="btn">
      <Icon name="film" />Videos
      <input type="file" accept="video/*" multiple onchange={addVideos} hidden />
    </label>
  </div>

  {#if busy}<p class="muted small" role="status">Medien werden vorbereitet …</p>{/if}
  {#if skipped.length > 0}
    <p class="notice bad" role="alert">Nicht lesbar und übersprungen: {skipped.join(', ')}</p>
  {/if}
  {#if tooLarge.length > 0}
    <p class="notice bad" role="alert">
      Zu groß und übersprungen (höchstens {formatBytes(MAX_VIDEO_BYTES)} je Video): {tooLarge.join(', ')}
    </p>
  {/if}

  {#if photos.length + videos.length > 0}
    <ul>
      {#each photos as photo (photo.id)}
        <li>
          <img src={photo.url} alt="Neues Foto" />
          <button type="button" class="remove" aria-label="Foto entfernen" onclick={() => removePhoto(photo)}>
            <Icon name="close" size={18} />
          </button>
        </li>
      {/each}
      {#each videos as video (video.id)}
        <li class="video">
          {#if video.posterUrl}<img src={video.posterUrl} alt="Neues Video" />{/if}
          <span class="play"><Icon name="play" size={20} /></span>
          <span class="info">
            {video.durationSec !== null ? `${formatDuration(video.durationSec)} · ` : ''}{formatBytes(video.size)}
          </span>
          <button type="button" class="remove" aria-label="Video entfernen" onclick={() => removeVideo(video)}>
            <Icon name="close" size={18} />
          </button>
        </li>
      {/each}
    </ul>
    {#if videos.some((v) => v.poster === null)}
      <p class="muted small">
        Für ein Video gibt es kein Vorschaubild, weil dieses Gerät das Format nicht anzeigen kann. Es wird trotzdem
        gespeichert.
      </p>
    {/if}
  {/if}
</div>

<style>
  .picker {
    display: grid;
    gap: 12px;
  }

  .sources {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  ul {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
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
  }

  .remove {
    position: absolute;
    top: 0;
    right: 0;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border: 0;
    background: none;
    color: #ffffff;
    filter: drop-shadow(0 0 3px rgb(0 0 0 / 0.9));
    cursor: pointer;
  }
</style>
