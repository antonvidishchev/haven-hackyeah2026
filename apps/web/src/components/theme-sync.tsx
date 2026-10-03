'use client';

import { useEffect } from 'react';

import type { Theme } from '@/lib/theme';

/** Runs before first paint: for the "system" theme, follow the OS colour scheme. */
export const systemThemeScript = `(function(){try{var m=matchMedia('(prefers-color-scheme: dark)');if(m.matches)document.documentElement.classList.add('dark')}catch(e){}})()`;

/** Keeps the `.dark` class in step with the preference and, for "system", with the OS. */
export function ThemeSync({ theme }: { theme: Theme }) {
  useEffect(() => {
    const root = document.documentElement;
    if (theme !== 'system') {
      root.classList.toggle('dark', theme === 'dark');
      return;
    }
    const query = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => root.classList.toggle('dark', query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, [theme]);
  return null;
}
