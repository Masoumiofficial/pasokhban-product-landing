import { List, X } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { LINKS, NAV_ITEMS, PLUGIN_VERSION, PRODUCT, SHOW_PLUGIN_VERSION, toFaDigits } from '../data/content';
import { useActiveSection } from '../hooks/useActiveSection';
import { Logo } from './Logo';
import { PurchaseButton } from './PurchaseButton';
import { ThemeToggle } from './ThemeToggle';

const NAV_IDS = NAV_ITEMS.map((n) => n.id);

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const active = useActiveSection(NAV_IDS);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // The mobile menu closes with Escape (focus returns to the toggle), with a click outside and when the
  // viewport grows to the desktop layout.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!navRef.current?.contains(t) && !toggleRef.current?.contains(t)) setOpen(false);
    };
    const mq = window.matchMedia('(min-width: 1200px)');
    const onMq = () => mq.matches && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    mq.addEventListener('change', onMq);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
      mq.removeEventListener('change', onMq);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}>
      <div className="container site-header__inner">
        <a className="brand" href="#top" title="بازگشت به ابتدای صفحه">
          <Logo className="brand__logo" decorative />
          <span className="brand__name">{PRODUCT.nameFa}</span>
          <span className="badge badge--soft brand__badge">
            {SHOW_PLUGIN_VERSION ? `نسخه‌ی ${toFaDigits(PLUGIN_VERSION)}` : 'افزونه‌ی وردپرس'}
          </span>
        </a>

        <nav id="site-nav" ref={navRef} className={`site-nav${open ? ' is-open' : ''}`} aria-label="ناوبری اصلی">
          <ul>
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} aria-current={active === item.id ? 'true' : undefined} onClick={close}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="site-nav__actions">
            <PurchaseButton block onClick={close} />
            <a className="btn btn--ghost btn--block" href={LINKS.guide} onClick={close}>
              راهنمای راه‌اندازی
            </a>
          </div>
        </nav>

        <div className="header-actions">
          <ThemeToggle />
          <a className="btn btn--ghost btn--sm header-actions__guide" href={LINKS.guide}>
            راهنمای راه‌اندازی
          </a>
          <PurchaseButton small className="header-actions__buy" />
          <button
            ref={toggleRef}
            type="button"
            className="icon-btn menu-toggle"
            aria-expanded={open}
            aria-controls="site-nav"
            aria-label={open ? 'بستن منو' : 'باز کردن منو'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={22} aria-hidden="true" /> : <List size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  );
}
