'use client';

import { useEffect, useState } from 'react';
import { THEME_CHANGED_EVENT, readThemePreference, saveThemePreference,
  type ThemePreference } from '@/ui/theme-preference';

const choices: { value: ThemePreference; label: string; description: string }[] = [
  { value: 'system', label: 'Système', description: 'Suit le thème clair ou sombre de cet appareil.' },
  { value: 'light', label: 'Clair', description: 'Utilise le thème clair sur ce navigateur.' },
  { value: 'dark', label: 'Sombre', description: 'Utilise le thème sombre sur ce navigateur.' },
];

export function AppearancePreference() {
  const [theme, setTheme] = useState<ThemePreference>('system');
  useEffect(() => {
    const sync = () => setTheme(readThemePreference());
    sync();
    window.addEventListener(THEME_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(THEME_CHANGED_EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);
  return <fieldset className="card appearance-options">
    <legend>Thème de ce navigateur</legend>
    {choices.map(({ value, label, description }) => <label key={value} className="appearance-option">
      <input type="radio" name="theme-preference" value={value} checked={theme === value}
        onChange={() => { saveThemePreference(value); setTheme(value); }} />
      <span><strong>{label}</strong><small>{description}</small></span>
    </label>)}
  </fieldset>;
}
