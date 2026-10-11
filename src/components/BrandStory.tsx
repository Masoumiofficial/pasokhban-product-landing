import { BRAND_STORY } from '../data/content';
import { Logo } from './Logo';
import { SectionHead } from './SectionHead';
import { RichText } from './RichText';

export function BrandStory() {
  const [lead, ...rest] = BRAND_STORY.paragraphs;
  return (
    <section className="section section--b" id="story" data-scene="keeper" aria-labelledby="story-title">
      <div className="container">
        <SectionHead id="story-title" eyebrow="داستان برند" title={BRAND_STORY.title} lead={BRAND_STORY.lead} />
        <div className="story">
          <div className="story__mark">
            <Logo decorative />
          </div>
          <article className="card story__card">
            <p className="lead-line">
              <RichText text={lead} />
            </p>
            {rest.map((p) => (
              <p key={p.slice(0, 24)}>
                <RichText text={p} />
              </p>
            ))}
          </article>
        </div>
        <h3 className="problems__title">سه هزینه‌ی پنهان پشتیبانی</h3>
        <ul className="problems">
          {BRAND_STORY.problems.map((p) => (
            <li key={p.no} className="card problem">
              <span className="problem__no" aria-hidden="true">
                {p.no}
              </span>
              <h4>{p.title}</h4>
              <p>{p.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
