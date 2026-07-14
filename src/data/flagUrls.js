// Vite turns these SVGs into local, hashed production assets. Keeping only the
// 4:3 set avoids the package's second square set and its large global CSS file.
const modules = import.meta.glob('../../node_modules/flag-icons/flags/4x3/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});

const FLAG_URLS = Object.fromEntries(Object.entries(modules).map(([path, url]) => {
  const code = path.match(/\/([a-z0-9-]+)\.svg$/)?.[1]?.toUpperCase();
  return [code, url];
}));

export function flagUrl(code) {
  return FLAG_URLS[String(code || '').toUpperCase()] || FLAG_URLS.XX || '';
}

