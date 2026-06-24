import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const getStoredTheme = (): Theme => {
  try {
    const stored = localStorage.getItem('grocery_saas_theme');
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {}
  return 'light';
};

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getStoredTheme(),

  toggleTheme: () => {
    set((state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('grocery_saas_theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
      return { theme: newTheme };
    });
  },

  setTheme: (theme: Theme) => {
    localStorage.setItem('grocery_saas_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
}));
