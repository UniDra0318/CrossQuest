import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Theme state: 'light' | 'dark' | 'system'
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('crossquest_theme');
      if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
      // Default to user's system preference or 'light'
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  // Additional profile settings: sound effects, compact mode, high contrast, email alerts
  const [soundEffects, setSoundEffects] = useState(() => {
    try {
      const saved = localStorage.getItem('crossquest_sound_fx');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [compactMode, setCompactMode] = useState(() => {
    try {
      const saved = localStorage.getItem('crossquest_compact_mode');
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [highContrast, setHighContrast] = useState(() => {
    try {
      const saved = localStorage.getItem('crossquest_high_contrast');
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('crossquest_notifications_enabled');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // Calculate actual applied theme
  const [effectiveTheme, setEffectiveTheme] = useState('light');

  useEffect(() => {
    const updateTheme = () => {
      let resolved = theme;
      if (theme === 'system') {
        resolved = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      setEffectiveTheme(resolved);

      const root = document.documentElement;
      if (resolved === 'dark') {
        root.setAttribute('data-theme', 'dark');
        root.classList.add('dark');
        document.body.classList.add('dark');
      } else {
        root.setAttribute('data-theme', 'light');
        root.classList.remove('dark');
        document.body.classList.remove('dark');
      }

      // High contrast
      if (highContrast) {
        root.setAttribute('data-contrast', 'high');
        root.classList.add('high-contrast');
      } else {
        root.removeAttribute('data-contrast');
        root.classList.remove('high-contrast');
      }

      // Compact density
      if (compactMode) {
        root.setAttribute('data-density', 'compact');
        root.classList.add('compact-density');
      } else {
        root.removeAttribute('data-density');
        root.classList.remove('compact-density');
      }
    };

    updateTheme();
    localStorage.setItem('crossquest_theme', theme);
    localStorage.setItem('crossquest_high_contrast', JSON.stringify(highContrast));
    localStorage.setItem('crossquest_compact_mode', JSON.stringify(compactMode));
    localStorage.setItem('crossquest_sound_fx', JSON.stringify(soundEffects));
    localStorage.setItem('crossquest_notifications_enabled', JSON.stringify(notificationsEnabled));

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => updateTheme();
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme, highContrast, compactMode, soundEffects, notificationsEnabled]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      effectiveTheme,
      isDark: effectiveTheme === 'dark',
      toggleTheme,
      soundEffects,
      setSoundEffects,
      compactMode,
      setCompactMode,
      highContrast,
      setHighContrast,
      notificationsEnabled,
      setNotificationsEnabled
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

