export type Route =
  | { page: 'collection' }
  | { page: 'wishlist' }
  | { page: 'stats' }
  | { page: 'settings' }
  | { page: 'set'; id: string }
  | { page: 'setForm'; id: string | null; wish: boolean }
  | { page: 'entryForm'; setId: string; entryId: string | null };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [a, b, c, d] = parts;
  if (a === 'wunschliste' && parts.length === 1) return { page: 'wishlist' };
  if (a === 'statistik' && parts.length === 1) return { page: 'stats' };
  if (a === 'einstellungen' && parts.length === 1) return { page: 'settings' };
  if (a === 'wunsch' && b === 'neu' && parts.length === 2) return { page: 'setForm', id: null, wish: true };
  if (a === 'set' && b) {
    if (parts.length === 2) return b === 'neu' ? { page: 'setForm', id: null, wish: false } : { page: 'set', id: b };
    if (c === 'bearbeiten' && parts.length === 3) return { page: 'setForm', id: b, wish: false };
    if (c === 'eintrag' && d && parts.length === 4) {
      return { page: 'entryForm', setId: b, entryId: d === 'neu' ? null : d };
    }
  }
  return { page: 'collection' };
}

export function href(route: Route): string {
  switch (route.page) {
    case 'collection':
      return '#/sammlung';
    case 'wishlist':
      return '#/wunschliste';
    case 'stats':
      return '#/statistik';
    case 'settings':
      return '#/einstellungen';
    case 'set':
      return `#/set/${route.id}`;
    case 'setForm':
      if (route.id) return `#/set/${route.id}/bearbeiten`;
      return route.wish ? '#/wunsch/neu' : '#/set/neu';
    case 'entryForm':
      return `#/set/${route.setId}/eintrag/${route.entryId ?? 'neu'}`;
  }
}

export function navigate(route: Route): void {
  location.hash = href(route);
}

// Replaces the current history entry, so "back" skips a form that was just saved.
export function replaceRoute(route: Route): void {
  location.replace(href(route));
}
