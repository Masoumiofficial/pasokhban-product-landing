// Small browser helpers shared by the 3D scenes and the UI.

export type Theme = 'dark' | 'light';

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// True only when a WebGL context can really be created (not just when the API exists).
export function supportsWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function scrollToTarget(selector: string) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
}

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
export const fa = (n: number, digits = 0) =>
  n.toLocaleString('fa-IR', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
export const faDigits = (s: string | number) => String(s).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
