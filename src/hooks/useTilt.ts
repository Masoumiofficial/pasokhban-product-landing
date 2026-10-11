import { PointerEvent, useCallback, useRef } from 'react';

// Pointer-driven 3D tilt for cards (adapted from the Avand landing). Sets --tilt-x / --tilt-y, which the .tilt
// rules in global.css turn into a perspective rotation. Disabled for touch input, hover-less devices and
// prefers-reduced-motion.
export function useTilt<T extends HTMLElement>(max = 6) {
  const ref = useRef<T>(null);

  const reset = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--tilt-x', '0deg');
    el.style.setProperty('--tilt-y', '0deg');
  }, []);

  const onPointerMove = useCallback(
    (e: PointerEvent<T>) => {
      if (e.pointerType === 'touch') return;
      const el = ref.current;
      if (!el) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (window.matchMedia('(hover: none)').matches) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--tilt-x', `${(-py * max).toFixed(2)}deg`);
      el.style.setProperty('--tilt-y', `${(px * max).toFixed(2)}deg`);
    },
    [max],
  );

  return { ref, onPointerMove, onPointerLeave: reset };
}
