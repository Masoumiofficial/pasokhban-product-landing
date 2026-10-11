import { CheckCircle, Hourglass, ListChecks, type Icon } from '@phosphor-icons/react';
import { ROADMAP } from '../data/content';
import { SectionHead } from './SectionHead';
import { RichText } from './RichText';

export function Roadmap() {
  const cols: { cls: string; icon: Icon; title: string; items: string[]; empty?: string }[] = [
    { cls: 'road__col--done', icon: CheckCircle, title: ROADMAP.active.title, items: ROADMAP.active.items },
    { cls: 'road__col--req', icon: ListChecks, title: ROADMAP.requirements.title, items: ROADMAP.requirements.items },
    { cls: 'road__col--next', icon: Hourglass, title: ROADMAP.next.title, items: ROADMAP.next.items, empty: ROADMAP.next.empty },
  ];
  return (
    <section className="section section--a" id="roadmap" data-scene="timeline" aria-labelledby="road-title">
      <div className="container">
        <SectionHead
          id="road-title"
          eyebrow="نقشه‌ی راه"
          title="نقشه‌ی راه و وضعیت امکانات"
          lead="آنچه امروز فعال است، پیش‌نیازهایی که باید بدانید و آنچه هنوز اعلام نشده را جدا کرده‌ایم تا دقیقاً بدانید چه چیزی می‌گیرید."
        />
        <div className="road">
          {cols.map((c) => (
            <article key={c.title} className={`card road__col ${c.cls}`}>
              <h3 className="road__title">
                <c.icon size={20} aria-hidden="true" /> {c.title}
              </h3>
              {c.items.length > 0 ? (
                <ul>
                  {c.items.map((i) => (
                    <li key={i}>
                      <RichText text={i} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="road__empty">{c.empty}</p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
