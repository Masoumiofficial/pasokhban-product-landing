import { Database, FileLock, Gauge, IdentificationCard, Key, ShieldCheck, type Icon } from '@phosphor-icons/react';
import { SECURITY_CARDS } from '../data/content';
import { SectionHead } from './SectionHead';
import { RichText } from './RichText';

const ICONS: Icon[] = [Key, IdentificationCard, FileLock, Gauge, ShieldCheck, Database];

export function Security() {
  return (
    <section className="section section--a" id="security" data-scene="shield" aria-labelledby="sec-title">
      <div className="container">
        <SectionHead
          id="sec-title"
          eyebrow="امنیت و داده"
          title="داده‌های شما، سر جای خودشان می‌مانند"
          lead="رفتار پیش‌فرض پاسخ‌بان محافظه‌کارانه است: کلیدها روی سرور می‌مانند، داده‌ی حساس سفارش بی‌تأیید نشان داده نمی‌شود و غیرفعال‌سازی چیزی را پاک نمی‌کند."
        />
        <ul className="sec-grid">
          {SECURITY_CARDS.map((c, i) => {
            const IconCmp = ICONS[i];
            return (
              <li key={c.title} className="card sec-card">
                <span className="sec-card__icon" aria-hidden="true">
                  <IconCmp size={28} weight="duotone" />
                </span>
                <h3>{c.title}</h3>
                <p>
                  <RichText text={c.body} />
                </p>
                <span className="tag mono">{c.tag}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
