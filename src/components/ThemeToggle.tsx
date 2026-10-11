import { Moon, Sun } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { currentTheme, type Theme } from '../lib/env';

const STORAGE_KEY = 'pasokhban-theme';
const THEME_COLOR: Record<Theme, string> = { dark: '#0b1120', light: '#f4f7fb' };

// Dark is the default; the choice is remembered in localStorage (the pre-paint script in index.html reads it).
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* storage can be unavailable (private mode or file://); the theme still applies for this visit */
    }
  }, [theme]);

  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      className="icon-btn theme-toggle"
      onClick={() => setTheme(next)}
      aria-label={next === 'light' ? 'تغییر به تم روشن' : 'تغییر به تم تیره'}
      title={next === 'light' ? 'تم روشن' : 'تم تیره'}
    >
      {theme === 'dark' ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
    </button>
  );
}
