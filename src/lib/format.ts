export type EuroResult = { ok: true; cents: number | null } | { ok: false };

// A dot counts as thousands separator only when a comma is present too ("1.234,50");
// on its own it is the decimal separator ("12.99").
export function parseEuro(input: string): EuroResult {
  let s = input.replace(/€/g, '').replace(/\s/g, '');
  if (s === '') return { ok: true, cents: null };
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return { ok: false };
  const [euros, frac = ''] = s.split('.');
  return { ok: true, cents: Number(euros) * 100 + Number(frac.padEnd(2, '0')) };
}

function euroDigits(cents: number): string {
  const euros = Math.floor(cents / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${euros},${(cents % 100).toString().padStart(2, '0')}`;
}

export function formatEuro(cents: number | null): string {
  return cents === null ? '–' : `${euroDigits(cents)} €`;
}

// Value for a price input field: "12,99" or empty.
export function euroInput(cents: number | null): string {
  return cents === null ? '' : euroDigits(cents).replace(/\./g, '');
}

export function formatDate(iso: string | null): string {
  if (!iso) return '–';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

export function todayIso(now: Date = new Date()): string {
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const d = now.getDate().toString().padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const min = minutes % 60;
  if (h === 0) return `${min} min`;
  return min === 0 ? `${h} h` : `${h} h ${min} min`;
}

// Length of a video: 75 → '1:15'
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const min = Math.floor((s % 3600) / 60);
  const sec = (s % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${min.toString().padStart(2, '0')}:${sec}` : `${min}:${sec}`;
}

// Size of a file: 1536 → '1,5 kB'
export function formatBytes(bytes: number): string {
  const units = ['B', 'kB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  const digits = unit === 0 || value >= 100 ? 0 : 1;
  return `${value.toFixed(digits).replace('.', ',')} ${units[unit]}`;
}

// plural(1, 'Foto', 'Fotos') → '1 Foto'
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

// Whole number >= 0, or null for an empty field. undefined means invalid input.
export function parseCount(input: string): number | null | undefined {
  const s = input.trim().replace(/\./g, '');
  if (s === '') return null;
  return /^\d+$/.test(s) ? Number(s) : undefined;
}
