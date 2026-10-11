import { FINAL_CTA, LINKS } from '../data/content';
import { PurchaseButton } from './PurchaseButton';

export function FinalCta() {
  return (
    <section className="final-cta" id="get" data-scene="hub" aria-labelledby="cta-title">
      <div className="container final-cta__inner">
        <div>
          <p className="final-cta__eyebrow">{FINAL_CTA.eyebrow}</p>
          <h2 id="cta-title">{FINAL_CTA.title}</h2>
          <p>{FINAL_CTA.body}</p>
        </div>
        <div className="final-cta__actions">
          <PurchaseButton variant="onbrand" />
          <a className="btn btn--onbrand-ghost" href={LINKS.guide}>
            راهنمای راه‌اندازی
          </a>
        </div>
      </div>
    </section>
  );
}
