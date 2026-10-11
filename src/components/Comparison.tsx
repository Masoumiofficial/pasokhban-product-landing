import { CheckCircle, XCircle } from '@phosphor-icons/react';
import { COMPARE } from '../data/content';
import { SectionHead } from './SectionHead';
import { RichText } from './RichText';

export function Comparison() {
  return (
    <section className="section section--a" id="compare" data-scene="split" aria-labelledby="compare-title">
      <div className="container">
        <SectionHead
          id="compare-title"
          eyebrow="مقایسه"
          title="قبل و بعد از پاسخ‌بان"
          lead="پاسخ‌گویی دستی در برابر یک مرکز پاسخ‌گویی با دو مسیر؛ در یک نگاه."
        />
        <div className="before-after">
          <article className="card ba-card ba-card--before">
            <h3 className="ba-title">
              <XCircle size={22} weight="fill" aria-hidden="true" /> {COMPARE.before.title}
            </h3>
            <p>{COMPARE.before.lead}</p>
            <ul>
              {COMPARE.before.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </article>
          <article className="card ba-card ba-card--after">
            <h3 className="ba-title">
              <CheckCircle size={22} weight="fill" aria-hidden="true" /> {COMPARE.after.title}
            </h3>
            <p>{COMPARE.after.lead}</p>
            <ul>
              {COMPARE.after.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </article>
        </div>

        <div className="table-wrap" role="region" aria-labelledby="compare-caption" tabIndex={0}>
          <table className="compare">
            <caption id="compare-caption">مقایسه‌ی پاسخ‌گویی دستی با پاسخ‌بان</caption>
            <thead>
              <tr>
                {COMPARE.columns.map((c, i) => (
                  <th key={c} scope="col" className={i === 2 ? 'is-brand' : undefined}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE.rows.map((row) => (
                <tr key={row[0]}>
                  <th scope="row">{row[0]}</th>
                  <td data-label={COMPARE.columns[1]}>
                    <RichText text={row[1]} />
                  </td>
                  <td className="is-brand" data-label={COMPARE.columns[2]}>
                    <RichText text={row[2]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="compare-note">{COMPARE.note}</p>
      </div>
    </section>
  );
}
