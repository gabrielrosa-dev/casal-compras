const THEME_KEY = 'casalcompras.theme';

function isDark() {
  return document.documentElement.classList.contains('dark');
}

function applyTheme(dark) {
  document.documentElement.classList.toggle('dark', dark);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = dark ? '#1a1530' : '#7c3aed';
}

function toggleTheme() {
  const dark = !isDark();
  applyTheme(dark);
  try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch (e) { /* sem persistência */ }
}

(function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch (e) { /* ignora */ }
  const dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', dark);
})();
