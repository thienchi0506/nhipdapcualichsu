const KEY = 'dcls.bd938.preferences.v1';
const heroes = ['H01', 'H02', 'H03', 'H04'];
const presets = ['economy', 'balanced', 'detailed'];

export function readPreferences() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { /* usable without storage */ }
  return {
    hero: heroes.includes(saved.hero) ? saved.hero : 'H01',
    quality: presets.includes(saved.quality) ? saved.quality : (matchMedia('(max-width: 760px)').matches ? 'economy' : 'balanced'),
  };
}

export function writePreferences(preferences) {
  try { localStorage.setItem(KEY, JSON.stringify({ hero: preferences.hero, quality: preferences.quality })); return true; }
  catch { return false; }
}
