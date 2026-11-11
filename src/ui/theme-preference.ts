/** Préférence locale à ce navigateur : aucune écriture serveur ni partage entre appareils. */
export type ThemePreference = 'system' | 'light' | 'dark';
export const THEME_STORAGE_KEY = 'toutenun.theme';
export const THEME_CHANGED_EVENT = 'toutenun:theme-changed';

export function readThemePreference(): ThemePreference {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

export function applyThemePreference(theme: ThemePreference): void {
  if (theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

export function saveThemePreference(theme: ThemePreference): void {
  if (theme === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
  else localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyThemePreference(theme);
  window.dispatchEvent(new Event(THEME_CHANGED_EVENT));
}
