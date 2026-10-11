import { BellRinging, ChatsCircle, ShoppingCart, Sparkle, type Icon } from '@phosphor-icons/react';
import { PILLARS } from '../data/content';
import { useTilt } from '../hooks/useTilt';
import { SectionHead } from './SectionHead';
import { RichText } from './RichText';

const ICONS: Icon[] = [Sparkle, ChatsCircle, ShoppingCart, BellRinging];

function PillarCard({ p, icon: IconCmp }: { p: (typeof PILLARS)[number]; icon: Icon }) {
  const tilt = useTilt<HTMLLIElement>(5);
  return (
    <li ref={tilt.ref} className="card pillar tilt" onPointerMove={tilt.onPointerMove} onPointerLeave={tilt.onPointerLeave}>
      <span className="pillar__icon" aria-hidden="true">
        <IconCmp size={26} weight="duotone" />
      </span>
      <span className="pillar__key">{p.key}</span>
      <h3>{p.title}</h3>
      <ul>
        {p.items.map((i) => (
          <li key={i}>
            <RichText text={i} />
          </li>
        ))}
      </ul>
    </li>
  );
}

export function Pillars() {
  return (
    <section className="section section--b" id="features" data-scene="towers" aria-labelledby="features-title">
      <div className="container">
        <SectionHead
          id="features-title"
          eyebrow="ستون‌های محصول"
          title="چهار ستون پاسخ‌بان، در یک افزونه"
          lead="از اتصال به سرویس هوش مصنوعی تا ووکامرس، تیم و اعلان‌ها؛ همه در یک منوی پیشخوان و بدون افزونه‌ی جانبی."
        />
        <ul className="pillars">
          {PILLARS.map((p, i) => (
            <PillarCard key={p.key} p={p} icon={ICONS[i]} />
          ))}
        </ul>
      </div>
    </section>
  );
}
