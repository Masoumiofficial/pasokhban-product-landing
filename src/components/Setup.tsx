import { CaretLeft, Clock } from '@phosphor-icons/react';
import { Fragment } from 'react';
import { GUIDE_URL, SETUP_NOTE, SETUP_STEPS } from '../data/content';
import { SectionHead } from './SectionHead';
import { RichText } from './RichText';

export function Setup() {
  return (
    <section className="section section--a" id="setup" data-scene="path" aria-labelledby="setup-title">
      <div className="container">
        <SectionHead
          id="setup-title"
          eyebrow="راه‌اندازی"
          title="از نصب تا اولین پاسخ، چهار گام روشن"
          lead="ترتیب گام‌ها را رعایت کنید؛ هر گام پیش‌نیاز گام بعدی است و مسیر دقیق منو کنار هر گام آمده است."
        />
        <ol className="steps">
          {SETUP_STEPS.map((s) => (
            <li key={s.no} className="card step">
              <span className="step__no" aria-hidden="true">
                {s.no}
              </span>
              <h3>
                <span className="sr-only">گام {s.no}: </span>
                {s.title}
              </h3>
              <p>
                <RichText text={s.body} />
              </p>
              <p className="menu-path">
                <span className="sr-only">مسیر در پیشخوان: </span>
                {s.path.map((part, i) => (
                  <Fragment key={part + i}>
                    {i > 0 && <CaretLeft size={14} weight="bold" aria-hidden="true" className="menu-path__sep" />}
                    <span className="menu-path__item">{part}</span>
                  </Fragment>
                ))}
              </p>
            </li>
          ))}
        </ol>
        <p className="setup-note">
          <Clock size={18} aria-hidden="true" />
          <span>
            {SETUP_NOTE}{' '}
            {GUIDE_URL ? <a href={GUIDE_URL}>راهنمای کامل راه‌اندازی</a> : <a href="#faq">پرسش‌های رایج</a>}
          </span>
        </p>
      </div>
    </section>
  );
}
