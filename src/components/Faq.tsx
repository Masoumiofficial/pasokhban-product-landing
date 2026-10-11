import { Plus } from '@phosphor-icons/react';
import { FAQ_ITEMS } from '../data/content';
import { SectionHead } from './SectionHead';
import { RichText } from './RichText';

export function Faq() {
  return (
    <section className="section section--a" id="faq" data-scene="qa" aria-labelledby="faq-title">
      <div className="container">
        <SectionHead
          id="faq-title"
          eyebrow="پرسش‌های متداول"
          title="قبل از تصمیم، شفاف بدانید"
          lead="پاسخ‌های کوتاه و دقیق به پرسش‌هایی که بیشتر پرسیده می‌شوند."
        />
        <div className="faq">
          {FAQ_ITEMS.map((item, i) => (
            <details key={item.q} open={i === 0}>
              <summary>
                <span>{item.q}</span>
                <Plus size={18} weight="bold" aria-hidden="true" className="faq__icon" />
              </summary>
              <p>
                <RichText text={item.a} />
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
