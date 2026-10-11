import { Check, Info, WarningCircle } from '@phosphor-icons/react';
import { useState } from 'react';
import { BYOK_NOTE, Currency, LICENSE_TIERS, PRICING_CONFIRMED, PRICING_NOTICE, PURCHASE_URL } from '../data/content';
import { faDigits } from '../lib/env';
import { PurchaseButton } from './PurchaseButton';
import { SectionHead } from './SectionHead';
import { RichText } from './RichText';

const formatPrice = (amount: number, currency: Currency) =>
  currency === 'usd'
    ? { value: `$${amount.toLocaleString('en-US')}`, unit: 'دلار', mono: true }
    : { value: amount.toLocaleString('fa-IR'), unit: 'تومان', mono: false };

export function Pricing() {
  const [currency, setCurrency] = useState<Currency>('toman');

  return (
    <section className="section section--b" id="pricing" data-scene="tiers" aria-labelledby="pricing-title">
      <div className="container">
        <SectionHead
          id="pricing-title"
          eyebrow="قیمت‌ها"
          title="قیمت‌ها و لایسنس پاسخ‌بان"
          lead="سطح‌های لایسنس بر اساس تعداد سایت وردپرسی. هزینه‌ی مصرف سرویس هوش مصنوعی جداست و مستقیم به سرویس‌دهنده پرداخت می‌شود."
        />

        {!PRICING_CONFIRMED && (
          <div className="notice notice--warn pricing-warn" role="note">
            <WarningCircle size={20} weight="fill" aria-hidden="true" />
            <span>
              <strong>توجه: </strong>
              {PRICING_NOTICE}
            </span>
          </div>
        )}

        <div className="pricing-top">
          <div className="switch" role="group" aria-label="واحد پول">
            <button type="button" aria-pressed={currency === 'toman'} onClick={() => setCurrency('toman')}>
              تومان
            </button>
            <button type="button" aria-pressed={currency === 'usd'} onClick={() => setCurrency('usd')}>
              دلار
            </button>
          </div>
        </div>

        <ul className="plans">
          {LICENSE_TIERS.map((t) => {
            const price = formatPrice(t.prices[currency], currency);
            const featured = t.id === 'pro';
            return (
              <li key={t.id} className={`card plan${featured ? ' plan--featured' : ''}`}>
                {featured && <span className="plan__ribbon">پیشنهاد اصلی</span>}
                <div>
                  <span className="badge badge--soft">{t.tag}</span>
                  <h3 className="plan__name">{t.name}</h3>
                  <p className="plan__sites">{faDigits(t.sites)} سایت وردپرسی</p>
                </div>
                <p className="plan__price">
                  {!PRICING_CONFIRMED && <span className="plan__sample">قیمت نمونه</span>}
                  <span className={price.mono ? 'mono' : undefined}>{price.value}</span>
                  <small>{price.unit}</small>
                </p>
                <ul>
                  {t.features.map((f) => (
                    <li key={f}>
                      <Check size={16} weight="bold" aria-hidden="true" />
                      <span>
                        <RichText text={f} />
                      </span>
                    </li>
                  ))}
                </ul>
                {PURCHASE_URL ? (
                  <PurchaseButton variant={featured ? 'primary' : 'light'} block label={`خرید لایسنس ${t.name}`} />
                ) : (
                  <p className="plan__soon">لینک خرید پس از نهایی‌شدن قیمت‌ها فعال می‌شود.</p>
                )}
              </li>
            );
          })}
        </ul>

        <div className="notice notice--info pricing-foot" role="note">
          <Info size={20} weight="fill" aria-hidden="true" />
          <span>
            <strong>هزینه‌ی هوش مصنوعی: </strong>
            <RichText text={BYOK_NOTE} />
          </span>
        </div>
      </div>
    </section>
  );
}
