import { lazy, Suspense } from 'react';
import { Play } from '@phosphor-icons/react';
import { HERO_STATS, LINKS, PRODUCT } from '../data/content';
import { Logo } from './Logo';
import { PurchaseButton } from './PurchaseButton';

// The Three.js core is code-split. Without WebGL only the static brand mark stands in (no 2D diagram).
const HeroCore3D = lazy(() => import('./HeroCore3D').then((m) => ({ default: m.HeroCore3D })));

function StaticCore() {
  return (
    <div className="hero__fallback">
      <Logo className="hero__fallback-logo" title="لوگوی پاسخ‌بان" />
    </div>
  );
}

export function Hero() {
  return (
    <section className="hero" id="top" data-scene="hub" aria-labelledby="hero-title">
      <div className="container hero__grid">
        <div className="hero__copy">
          <p className="hero__badge">
            <span className="badge badge--soft">{PRODUCT.badgeFa}</span>
          </p>
          <h1 id="hero-title">
            <span className="hl">{PRODUCT.heroTitle[0]}</span> {PRODUCT.heroTitle[1]}
          </h1>
          <p className="hero__sub">{PRODUCT.subtitleFa}</p>
          <div className="hero__ctas">
            <a className="btn btn--primary" href="#demo">
              <Play size={16} weight="fill" aria-hidden="true" /> دموی تعاملی را ببینید
            </a>
            <PurchaseButton variant="ghost" />
          </div>
          <p className="hero__guide">
            می‌خواهید مسیر نصب را ببینید؟ <a href={LINKS.guide}>راه‌اندازی در چهار گام</a>
          </p>
          <ul className="hero__stats">
            {HERO_STATS.map((s) => (
              <li className="stat" key={s.title}>
                <span className={`stat__value${s.mono ? ' mono' : ''}`}>{s.value}</span>
                <span className="stat__title">{s.title}</span>
                <span className="stat__note">{s.note}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="hero__visual">
          <Suspense fallback={<StaticCore />}>
            <HeroCore3D fallback={<StaticCore />} />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
