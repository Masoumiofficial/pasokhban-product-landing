import { useEffect, useState } from 'react';

// Returns the id of the section that currently crosses the reading line (45% of the viewport height),
// the same line SiteScene uses to pick its 3D topic. Used to mark the matching navigation link.
export function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join('|');

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const probe = window.innerHeight * 0.45;
      let found: string | null = null;
      for (const id of key.split('|')) {
        const el = document.getElementById(id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= probe && r.bottom > probe) found = id;
      }
      setActive(found);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [key]);

  return active;
}
