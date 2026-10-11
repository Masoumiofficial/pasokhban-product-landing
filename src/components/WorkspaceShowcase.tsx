import { useState } from 'react';
import { WORKSPACES, WORKSPACE_NOTE } from '../data/content';
import { tabKeyHandler } from '../hooks/useTabKeys';
import { useTilt } from '../hooks/useTilt';
import { SectionHead } from './SectionHead';
import { RichText } from './RichText';

// Bar heights of the sample chart in the "analytics" mockup (purely decorative).
const SAMPLE_BARS = [38, 52, 44, 66, 58, 74, 61, 80, 69, 86];

export function WorkspaceShowcase() {
  const [index, setIndex] = useState(0);
  const ws = WORKSPACES[index];
  const tilt = useTilt<HTMLDivElement>(4);

  return (
    <section className="section section--b" id="workspaces" data-scene="panels" aria-labelledby="ws-title">
      <div className="container">
        <SectionHead
          id="ws-title"
          eyebrow="نمای پنل"
          title="پاسخ‌بان داخل پیشخوان وردپرس"
          lead="هر زبانه یکی از صفحه‌های پنل پاسخ‌بان را نشان می‌دهد. ماکت‌ها ساده‌سازی شده‌اند و همه‌ی داده‌های داخل آن‌ها نمونه است."
        />
        <div className="ws">
          <div
            className="ws__tabs"
            role="tablist"
            aria-label="صفحه‌های پنل پاسخ‌بان"
            aria-orientation="vertical"
            onKeyDown={tabKeyHandler(WORKSPACES.length, index, setIndex)}
          >
            {WORKSPACES.map((w, i) => (
              <button
                key={w.id}
                role="tab"
                type="button"
                id={`ws-tab-${w.id}`}
                aria-selected={i === index}
                aria-controls="ws-panel"
                tabIndex={i === index ? 0 : -1}
                className="ws__tab"
                onClick={() => setIndex(i)}
              >
                <span className="ws__tab-no" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {w.label}
              </button>
            ))}
          </div>

          <div className="ws__panel" id="ws-panel" role="tabpanel" aria-labelledby={`ws-tab-${ws.id}`}>
            <p className="ws__desc">
              <RichText text={ws.desc} />
            </p>
            <div
              ref={tilt.ref}
              className="mock tilt"
              role="img"
              aria-label={`ماکت نمایشی صفحه‌ی «${ws.title}» در پیشخوان وردپرس؛ داده‌ها نمونه‌اند.`}
              onPointerMove={tilt.onPointerMove}
              onPointerLeave={tilt.onPointerLeave}
            >
              <div className="mock__bar">
                <i />
                <i />
                <i />
                <span>/wp-admin/admin.php?page={ws.page}</span>
              </div>
              <div className="mock__screen">
                <div className="mock__side">
                  {WORKSPACES.map((w, i) => (
                    <span key={w.id} className={i === index ? 'on' : ''} />
                  ))}
                </div>
                <div className="mock__main">
                  <div className="mock__title">{ws.title}</div>
                  <div className="mock__kpis">
                    {ws.kpis.map(([v, l]) => (
                      <div className="mock__kpi" key={l}>
                        <b>{v}</b>
                        <small>{l}</small>
                      </div>
                    ))}
                  </div>
                  {ws.bars && (
                    <div className="mock__bars">
                      {SAMPLE_BARS.map((h, i) => (
                        <i key={i} style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  )}
                  {ws.rows.map(([t, pill, tone]) => (
                    <div className="mock__row" key={t}>
                      <span>
                        <RichText text={t} />
                      </span>
                      <span className={`mock__pill mock__pill--${tone}`}>{pill}</span>
                    </div>
                  ))}
                  {ws.field && <div className="mock__field">{ws.field}</div>}
                  <div className="mock__note">{WORKSPACE_NOTE}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
