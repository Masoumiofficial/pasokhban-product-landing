import { KeyboardEvent } from 'react';

// Keyboard support for role="tablist" (WAI-ARIA tabs pattern with automatic activation).
// RTL aware: ArrowLeft moves to the next tab, ArrowRight to the previous one; Up/Down work for vertical lists.
export function tabKeyHandler(count: number, index: number, select: (i: number) => void) {
  return (e: KeyboardEvent<HTMLElement>) => {
    let next = -1;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = (index + 1) % count;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = (index - 1 + count) % count;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = count - 1;
    if (next < 0) return;
    e.preventDefault();
    select(next);
    const list = e.currentTarget;
    requestAnimationFrame(() => list.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus());
  };
}
