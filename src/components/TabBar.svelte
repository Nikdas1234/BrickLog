<script lang="ts">
  import { href, type Route } from '../lib/router';

  let { current }: { current: Route['page'] } = $props();

  const tabs: { page: 'collection' | 'wishlist' | 'stats' | 'settings'; label: string; icon: string }[] = [
    { page: 'collection', label: 'Sammlung', icon: 'M4 5h7v6H4zM13 5h7v6h-7zM4 13h7v6H4zM13 13h7v6h-7z' },
    { page: 'wishlist', label: 'Wunschliste', icon: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.500l6.1-.9z' },
    { page: 'stats', label: 'Statistik', icon: 'M5 20V10h3v10zM10.500 20V4h3v16zM16 20v-7h3v7z' },
    { page: 'settings', label: 'Einstellungen', icon: 'M4 7h10v2H4zM17 6h3v4h-3zM4 15h3v4H4zM10 16h10v2H10z' },
  ];
</script>

<nav aria-label="Bereiche">
  {#each tabs as tab (tab.page)}
    <a href={href({ page: tab.page })} aria-current={current === tab.page ? 'page' : undefined}>
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d={tab.icon} /></svg>
      <span>{tab.label}</span>
    </a>
  {/each}
</nav>

<style>
  nav {
    position: fixed;
    inset: auto 0 0 0;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    height: calc(var(--tab-height) + env(safe-area-inset-bottom));
    padding-bottom: env(safe-area-inset-bottom);
    background: var(--surface);
    border-top: 1px solid var(--border);
  }

  a {
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 2px;
    color: var(--muted);
    font-size: 0.6875rem;
    font-weight: 600;
    text-decoration: none;
  }

  a[aria-current='page'] {
    color: var(--accent);
  }

  svg {
    fill: currentColor;
  }
</style>
