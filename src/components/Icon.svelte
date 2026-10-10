<script lang="ts" module>
  // Line icons on a 24 x 24 grid, drawn for this app.
  const PATHS = {
    plus: 'M12 5v14M5 12h14',
    close: 'M6 6l12 12M18 6L6 18',
    back: 'M15 5l-7 7 7 7',
    camera:
      'M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM12 10a3.500 3.500 0 1 0 0 7 3.500 3.500 0 0 0 0-7z',
    image:
      'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3 16l5-5 4 4 3-3 6 6M8 8.500a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
    video:
      'M4 6h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM15 10.500l6-3.500v10l-6-3.500',
    film: 'M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4',
    trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
    clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
    pause: 'M9 5v14M15 5v14',
    check: 'M5 12.500l4.500 4.500L19 7.500',
  } as const;

  export type IconName = keyof typeof PATHS | 'play';
</script>

<script lang="ts">
  let { name, size = 22 }: { name: IconName; size?: number } = $props();
</script>

{#if name === 'play'}
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
{:else}
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d={PATHS[name]} />
  </svg>
{/if}
