import { useEffect, useState } from 'react';

// Extension-local theme adapter: no inline scripts or remote assets.
// Preserve the original persisted preference and use the OS theme when unset.
export type Theme = 'light' | 'dark';
export const THEME_KEY = 'offer-toolkit-theme';
export function readTheme(): Theme {
  try {
    const saved=localStorage.getItem(THEME_KEY);
    if(saved==='light'||saved==='dark')return saved;
  } catch { /* private storage may be unavailable */ }
  return window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
}
function applyTheme(theme:Theme) {
  document.documentElement.classList.toggle('dark',theme==='dark');
  document.documentElement.dataset.theme=theme;
}
export function initTheme(){applyTheme(readTheme());}
export function useTheme(){
  const [resolvedTheme,setResolvedTheme]=useState(readTheme);
  useEffect(()=>{
    const media=window.matchMedia('(prefers-color-scheme: dark)');
    const sync=()=>{const next=readTheme();applyTheme(next);setResolvedTheme(next);};
    media.addEventListener('change',sync);
    window.addEventListener('storage',sync);
    sync();
    return ()=>{media.removeEventListener('change',sync);window.removeEventListener('storage',sync);};
  },[]);
  function setTheme(next:Theme){
    try{localStorage.setItem(THEME_KEY,next);}catch{ /* still apply in memory */ }
    applyTheme(next);
    setResolvedTheme(next);
  }
  return {resolvedTheme,setTheme};
}
