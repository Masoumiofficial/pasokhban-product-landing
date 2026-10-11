import { ChangeEvent, useMemo, useState } from 'react';
import { BYOK_NOTE, ROI_DEFAULTS } from '../data/content';
import { fa } from '../lib/env';
import { SectionHead } from './SectionHead';
import { RichText } from './RichText';

type Inputs = { conversations: number; share: number; minutes: number; rate: number };

export function RoiCalculator() {
  const [v, setV] = useState<Inputs>({
    conversations: ROI_DEFAULTS.conversationsPerMonth,
    share: ROI_DEFAULTS.repetitiveSharePct,
    minutes: ROI_DEFAULTS.minutesPerManualReply,
    rate: ROI_DEFAULTS.hourlyRateToman,
  });

  const set = (key: keyof Inputs, max: number) => (e: ChangeEvent<HTMLInputElement>) => {
    const n = Number(e.target.value);
    setV((prev) => ({ ...prev, [key]: Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0 }));
  };

  const calc = useMemo(() => {
    const automated = Math.round((v.conversations * v.share) / 100);
    const remaining = Math.max(0, v.conversations - automated);
    const hours = (automated * v.minutes) / 60;
    return { automated, remaining, hours, money: hours * v.rate };
  }, [v]);

  return (
    <section className="section section--b" id="roi" data-scene="clock" aria-labelledby="roi-title">
      <div className="container">
        <SectionHead
          id="roi-title"
          eyebrow="محاسبه‌گر"
          title="محاسبه‌گر صرفه‌جویی زمان تیم پشتیبانی"
          lead="تعداد گفتگوها و سهم پرسش‌های تکراری را تنظیم کنید. همه‌ی پیش‌فرض‌ها فقط نمونه‌اند و با شرایط شما عوض می‌شوند."
        />
        <div className="roi">
          <div className="card roi__inputs">
            <div className="slider">
              <label htmlFor="r-conv">
                گفتگوهای ماهانه <output htmlFor="r-conv">{fa(v.conversations)}</output>
              </label>
              <input id="r-conv" type="range" min={0} max={5000} step={50} value={v.conversations} onChange={set('conversations', 5000)} />
              <small>همه‌ی گفتگوهایی که در یک ماه در سایت شروع می‌شود.</small>
            </div>
            <div className="slider">
              <label htmlFor="r-share">
                سهم پرسش‌های تکراری <output htmlFor="r-share">{fa(v.share)}٪</output>
              </label>
              <input id="r-share" type="range" min={0} max={100} step={5} value={v.share} onChange={set('share', 100)} />
              <small>گفتگوهایی که جوابشان در محتوای سایت هست و هوش مصنوعی می‌تواند پاسخ بدهد.</small>
            </div>
            <fieldset className="assump">
              <legend>فرض‌های قابل ویرایش</legend>
              <label>
                دقیقه‌ی پاسخ دستی برای هر گفتگو
                <input type="number" inputMode="numeric" min={0} max={120} value={v.minutes} onChange={set('minutes', 120)} />
              </label>
              <label>
                ارزش یک ساعت کار تیم (تومان)
                <input type="number" inputMode="numeric" min={0} step={10000} max={100000000} value={v.rate} onChange={set('rate', 100000000)} />
              </label>
            </fieldset>
          </div>

          <div className="card roi__result" aria-live="polite">
            <h3>برآورد ماهانه</h3>
            <p className="roi__big">
              {fa(calc.hours, 1)}
              <small>ساعت آزادشده‌ی تیم</small>
            </p>
            <p className="roi__money">معادل {fa(Math.round(calc.money))} تومان</p>
            <ul className="roi__breakdown">
              <li>
                <span>گفتگوهایی که هوش مصنوعی پاسخ می‌دهد</span>
                <b>{fa(calc.automated)}</b>
              </li>
              <li>
                <span>گفتگوهایی که به اپراتور می‌رسد</span>
                <b>{fa(calc.remaining)}</b>
              </li>
            </ul>
            <p className="roi__disclaimer">
              این عدد فقط بر اساس فرض‌های بالا محاسبه می‌شود و تضمین صرفه‌جویی نیست؛ پاسخ‌بان آماری درباره‌ی سهم پرسش‌های تکراری
              منتشر نکرده است. <RichText text={BYOK_NOTE} /> هزینه‌ی مصرف <bdi dir="ltr">API</bdi> در این محاسبه لحاظ نشده
              است.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
