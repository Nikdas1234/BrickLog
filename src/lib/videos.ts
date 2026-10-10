import { fitWithin } from './photos';

// A single video above this size is refused. Phone cameras write roughly 100 to 150 MB
// per minute, so this allows several minutes while keeping backups within reach.
export const MAX_VIDEO_BYTES = 1024 ** 3;
const POSTER_EDGE = 640;

export interface VideoInfo {
  durationSec: number | null;
  // A still picture as JPEG, or null when the browser cannot decode the video.
  poster: ArrayBuffer | null;
}

const within = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);

// Finds out the length of a video and takes a still picture from its beginning. The
// video itself is stored unchanged; converting it on the phone would take minutes.
export async function describeVideo(file: Blob): Promise<VideoInfo> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  try {
    await within(
      new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(new Error('unreadable'));
        video.src = url;
      }),
      10_000,
    );
    const durationSec = Number.isFinite(video.duration) ? Math.round(video.duration) : null;

    // The very first frame is often black, so we look a moment into the video.
    await within(
      new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
        video.currentTime = Math.min(1, (video.duration || 0) / 2);
      }),
      5_000,
    ).catch(() => {});

    if (video.videoWidth === 0 || video.videoHeight === 0) return { durationSec, poster: null };
    const { width, height } = fitWithin(video.videoWidth, video.videoHeight, POSTER_EDGE);
    const canvas = new OffscreenCanvas(width, height);
    canvas.getContext('2d')!.drawImage(video, 0, 0, width, height);
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 });
    return { durationSec, poster: await blob.arrayBuffer() };
  } catch {
    return { durationSec: null, poster: null };
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}
