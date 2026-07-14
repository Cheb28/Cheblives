// Display formatting helpers.
export function money(n) {
  if (n == null) return '—';
  const v = Math.round(n);
  if (Math.abs(v) >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (Math.abs(v) >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'k';
  return '$' + v.toLocaleString();
}

export function pop(n) {
  if (n == null) return '—';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'k';
  return String(n);
}

export const STAT_COLORS = {
  health: 'var(--health)',
  happiness: 'var(--happiness)',
  intelligence: 'var(--intelligence)',
  fitness: 'var(--fitness)',
  charisma: 'var(--charisma)',
};

export function statColor(v) {
  if (v >= 66) return 'var(--good)';
  if (v >= 33) return 'var(--warn)';
  return 'var(--bad)';
}

export function titleCase(s) {
  return s ? s.replace(/\b\w/g, c => c.toUpperCase()) : s;
}
