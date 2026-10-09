<script lang="ts" module>
  export interface PendingPhoto {
    id: string;
    data: ArrayBuffer;
    width: number;
    height: number;
    url: string;
  }
</script>

<script lang="ts">
  import { PhotoDecodeError, resizeToJpeg } from '../lib/photos';

  let { photos = $bindable([]), busy = $bindable(false) }: { photos?: PendingPhoto[]; busy?: boolean } = $props();

  let skipped = $state<string[]>([]);

  async function addFiles(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const files = [...(input.files ?? [])];
    input.value = '';
    if (files.length === 0) return;

    busy = true;
    skipped = [];
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

  function remove(photo: PendingPhoto) {
    URL.revokeObjectURL(photo.url);
    photos = photos.filter((p) => p.id !== photo.id);
  }
</script>

<div class="picker">
  <div class="two-col">
    <label class="btn">
      Kamera
      <input type="file" accept="image/*" capture="environment" onchange={addFiles} hidden />
    </label>
    <label class="btn">
      Galerie
      <input type="file" accept="image/*" multiple onchange={addFiles} hidden />
    </label>
  </div>

  {#if busy}<p class="muted small">Fotos werden verkleinert …</p>{/if}
  {#if skipped.length > 0}
    <p class="notice bad" role="alert">Nicht lesbar und übersprungen: {skipped.join(', ')}</p>
  {/if}

  {#if photos.length > 0}
    <ul>
      {#each photos as photo (photo.id)}
        <li>
          <img src={photo.url} alt="Neues Foto" />
          <button type="button" aria-label="Foto entfernen" onclick={() => remove(photo)}>×</button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .picker {
    display: grid;
    gap: 12px;
  }

  ul {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 10px;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  button {
    position: absolute;
    top: 0;
    right: 0;
    width: 44px;
    height: 44px;
    border: 0;
    background: none;
    color: #fff;
    font-size: 1.5rem;
    line-height: 1;
    text-shadow: 0 0 6px #000, 0 0 2px #000;
    cursor: pointer;
  }
</style>
