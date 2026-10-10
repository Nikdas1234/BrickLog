<script lang="ts">
  import ConfirmDialog from '../components/ConfirmDialog.svelte';
  import Icon from '../components/Icon.svelte';
  import MediaPicker, { type PendingPhoto, type PendingVideo } from '../components/MediaPicker.svelte';
  import PhotoImg from '../components/PhotoImg.svelte';
  import VideoTile from '../components/VideoTile.svelte';
  import { getDb } from '../lib/context';
  import { deleteEntry, deletePhoto, deleteVideo, getEntry, getSet, saveEntryWithMedia } from '../lib/db';
  import { parseCount, todayIso } from '../lib/format';
  import { revokePhotoUrl } from '../lib/photoUrl';
  import type { LogEntry, Photo, Video } from '../lib/types';

  let { setId, entryId }: { setId: string; entryId: string | null } = $props();

  const db = getDb();

  let entry = $state<LogEntry | null>(null);
  let missing = $state(false);
  let setName = $state('');
  let minutes = $state('');
  let originalPhotoIds: string[] = [];
  let originalVideoIds: string[] = [];
  let keptPhotoIds = $state<string[]>([]);
  let keptVideoIds = $state<string[]>([]);
  let pendingPhotos = $state.raw<PendingPhoto[]>([]);
  let pendingVideos = $state.raw<PendingVideo[]>([]);
  let busy = $state(false);
  let saving = $state(false);
  let errors = $state<{ date?: string; minutes?: string; save?: string }>({});
  let confirmDelete = $state(false);

  async function load() {
    // svelte-ignore state_referenced_locally
    const [set, existing] = await Promise.all([getSet(db, setId), entryId ? getEntry(db, entryId) : undefined]);
    if (!set || (entryId && !existing)) {
      missing = true;
      return;
    }
    setName = set.name;
    const loaded: LogEntry = existing ?? {
      id: crypto.randomUUID(),
      setId: set.id,
      date: todayIso(),
      note: '',
      section: '',
      minutes: null,
      photoIds: [],
      videoIds: [],
      createdAt: new Date().toISOString(),
    };
    minutes = loaded.minutes?.toString() ?? '';
    originalPhotoIds = [...loaded.photoIds];
    originalVideoIds = [...loaded.videoIds];
    keptPhotoIds = [...loaded.photoIds];
    keptVideoIds = [...loaded.videoIds];
    entry = loaded;
  }
  load();

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!entry || saving || busy) return;

    const parsedMinutes = parseCount(minutes);
    errors = {
      date: entry.date ? undefined : 'Bitte wähle ein Datum.',
      minutes: parsedMinutes === undefined ? 'Bauzeit bitte als ganze Zahl in Minuten.' : undefined,
    };
    if (!entry.date || parsedMinutes === undefined) return;

    saving = true;
    const stamp = new Date().toISOString();
    const next: LogEntry = {
      ...$state.snapshot(entry),
      section: entry.section.trim(),
      minutes: parsedMinutes,
      photoIds: [...keptPhotoIds, ...pendingPhotos.map((p) => p.id)],
      videoIds: [...keptVideoIds, ...pendingVideos.map((v) => v.id)],
    };
    const newPhotos: Photo[] = pendingPhotos.map((p) => ({
      id: p.id,
      setId: next.setId,
      data: p.data,
      width: p.width,
      height: p.height,
      createdAt: stamp,
    }));
    const newVideos: Video[] = pendingVideos.map((v) => ({
      id: v.id,
      setId: next.setId,
      blob: v.file,
      type: v.type,
      size: v.size,
      durationSec: v.durationSec,
      poster: v.poster,
      createdAt: stamp,
    }));

    try {
      await saveEntryWithMedia(db, next, newPhotos, newVideos);
    } catch {
      errors = { save: 'Speichern fehlgeschlagen – möglicherweise ist der Speicher voll.' };
      saving = false;
      return;
    }
    for (const photoId of originalPhotoIds.filter((p) => !keptPhotoIds.includes(p))) {
      await deletePhoto(db, photoId);
      revokePhotoUrl(photoId);
    }
    for (const videoId of originalVideoIds.filter((v) => !keptVideoIds.includes(v))) {
      await deleteVideo(db, videoId);
    }
    pendingPhotos.forEach((p) => URL.revokeObjectURL(p.url));
    pendingVideos.forEach((v) => v.posterUrl && URL.revokeObjectURL(v.posterUrl));
    history.back();
  }

  async function remove() {
    if (!entry) return;
    await deleteEntry(db, entry.id);
    originalPhotoIds.forEach(revokePhotoUrl);
    history.back();
  }
</script>

{#if missing}
  <p class="empty">Diesen Eintrag gibt es nicht (mehr).</p>
{:else if entry}
  <header class="page-head">
    <div>
      <h1>{entryId ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}</h1>
      <p class="muted">{setName}</p>
    </div>
  </header>

  <form class="stack" onsubmit={save} novalidate>
    <label class="field">
      <span>Datum *</span>
      <input type="date" bind:value={entry.date} aria-invalid={!!errors.date} />
      {#if errors.date}<span class="error" role="alert">{errors.date}</span>{/if}
    </label>

    <div class="two-col">
      <label class="field">
        <span>Bauabschnitt</span>
        <input type="text" bind:value={entry.section} placeholder="z. B. Tüte 3" autocomplete="off" />
      </label>
      <label class="field">
        <span>Bauzeit (Minuten)</span>
        <input type="text" inputmode="numeric" bind:value={minutes} aria-invalid={!!errors.minutes} />
      </label>
    </div>
    {#if errors.minutes}<span class="error" role="alert">{errors.minutes}</span>{/if}

    <label class="field">
      <span>Notiz</span>
      <textarea bind:value={entry.note}></textarea>
    </label>

    <div class="field">
      <span class="label">Fotos und Videos</span>
      {#if keptPhotoIds.length + keptVideoIds.length > 0}
        <ul class="existing">
          {#each keptPhotoIds as photoId (photoId)}
            <li>
              <PhotoImg id={photoId} alt="Gespeichertes Foto" />
              <button
                type="button"
                class="remove"
                aria-label="Foto entfernen"
                onclick={() => (keptPhotoIds = keptPhotoIds.filter((p) => p !== photoId))}
              >
                <Icon name="close" size={18} />
              </button>
            </li>
          {/each}
          {#each keptVideoIds as videoId (videoId)}
            <li>
              <VideoTile id={videoId}>
                <button
                  type="button"
                  class="remove"
                  aria-label="Video entfernen"
                  onclick={() => (keptVideoIds = keptVideoIds.filter((v) => v !== videoId))}
                >
                  <Icon name="close" size={18} />
                </button>
              </VideoTile>
            </li>
          {/each}
        </ul>
      {/if}
      <MediaPicker bind:photos={pendingPhotos} bind:videos={pendingVideos} bind:busy />
    </div>

    {#if errors.save}<p class="notice bad" role="alert">{errors.save}</p>{/if}

    <div class="form-actions">
      <button type="button" class="btn" onclick={() => history.back()}>Abbrechen</button>
      <button type="submit" class="btn primary" disabled={saving || busy}>
        {saving && pendingVideos.length > 0 ? 'Speichert …' : 'Speichern'}
      </button>
    </div>

    {#if entryId}
      <button type="button" class="btn danger wide" onclick={() => (confirmDelete = true)}>Eintrag löschen</button>
    {/if}
  </form>

  <ConfirmDialog
    bind:open={confirmDelete}
    title="Eintrag löschen?"
    message="Der Eintrag wird mit seinen Fotos und Videos gelöscht. Das lässt sich nicht rückgängig machen."
    confirmLabel="Löschen"
    danger
    onconfirm={remove}
  />
{/if}

<style>
  .existing {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .existing li {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 14px;
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
