import { useEffect } from 'react';

// Scroll-triggered 3D entrance for page sections (adapted from the Avand landing).
// CSS only hides sections while `html.motion-ok` is present, and that class is added here, so content stays
// visible without JavaScript, without IntersectionObserver and under prefers-reduced-motion.
// threshold 0 + a bottom margin makes very tall sections (for example on a 390px phone) reveal reliably.
export function useSectionReveal() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) return;

    const root = document.documentElement;
    root.classList.add('motion-ok');
    const targets = Array.from(document.querySelectorAll<HTMLElement>('main > section:not(.hero), .site-footer'));

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: '0px 0px -8% 0px' },
    );
    targets.forEach((t) => io.observe(t));

    // Printing must never hide content.
    const reveal = () => targets.forEach((t) => t.classList.add('is-revealed'));
    window.addEventListener('beforeprint', reveal);

    return () => {
      io.disconnect();
      window.removeEventListener('beforeprint', reveal);
      root.classList.remove('motion-ok');
    };
  }, []);
}
