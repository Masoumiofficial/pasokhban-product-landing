import { ArrowClockwise, ChatTeardropText, Check, Play } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { SCENARIOS, SIMULATOR_NOTE } from '../data/content';
import { tabKeyHandler } from '../hooks/useTabKeys';
import { faDigits, prefersReducedMotion } from '../lib/env';
import { DemoNotice } from './DemoNotice';
import { SectionHead } from './SectionHead';
import { RichText } from './RichText';

const STEP_MS = 1000;

export function WorkflowSimulator() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState(0); // number of finished steps
  const [running, setRunning] = useState(false);
  const scenario = SCENARIOS[index];
  const total = scenario.steps.length;

  useEffect(() => {
    if (!running) return;
    if (phase >= total) {
      setRunning(false);
      return;
    }
    const t = window.setTimeout(() => setPhase((p) => p + 1), STEP_MS);
    return () => window.clearTimeout(t);
  }, [running, phase, total]);

  const select = (i: number) => {
    setIndex(i);
    setPhase(0);
    setRunning(false);
  };
  const run = () => {
    // Under reduced motion the result appears at once, without the step animation.
    if (prefersReducedMotion()) {
      setPhase(total);
      setRunning(false);
      return;
    }
    setPhase(0);
    setRunning(true);
  };
  const done = phase >= total;
  const status = done
    ? 'پایان شبیه‌سازی؛ همه‌ی گام‌ها انجام شد.'
    : running
      ? `در حال اجرای گام ${faDigits(phase + 1)} از ${faDigits(total)}…`
      : `${faDigits(phase)} از ${faDigits(total)} گام انجام شده است.`;

  return (
    <section className="section section--a" id="demo" data-scene="pipeline" aria-labelledby="demo-title">
      <div className="container">
        <SectionHead
          id="demo-title"
          eyebrow="شبیه‌ساز گردش کار"
          title="یک پیام، از ویجت تا پاسخ"
          lead="یکی از سه سناریوی رایج را انتخاب کنید و ببینید پیام بازدیدکننده در پاسخ‌بان قدم‌به‌قدم چه مسیری را طی می‌کند."
        />
        <div className="sim">
          <div
            className="sim__tabs"
            role="tablist"
            aria-label="سناریوهای شبیه‌ساز"
            aria-orientation="vertical"
            onKeyDown={tabKeyHandler(SCENARIOS.length, index, select)}
          >
            {SCENARIOS.map((s, i) => (
              <button
                key={s.id}
                role="tab"
                type="button"
                id={`sim-tab-${s.id}`}
                aria-selected={i === index}
                aria-controls="sim-panel"
                tabIndex={i === index ? 0 : -1}
                className="sim__tab"
                onClick={() => select(i)}
              >
                <strong>{s.label}</strong>
                <span>{s.summary}</span>
              </button>
            ))}
          </div>

          <div className="sim__panel" id="sim-panel" role="tabpanel" aria-labelledby={`sim-tab-${scenario.id}`}>
            <DemoNotice detail={SIMULATOR_NOTE} />
            <div className="sim__message">
              <ChatTeardropText size={22} weight="duotone" aria-hidden="true" />
              <div>
                <span className="sim__label">پیام بازدیدکننده</span>
                <p>«{scenario.message}»</p>
              </div>
            </div>

            <ol className="sim__steps">
              {scenario.steps.map((step, i) => {
                const state = i < phase ? 'is-done' : i === phase && running ? 'is-running' : '';
                return (
                  <li key={step} className={`sim__step ${state}`}>
                    <span className="sim__dot" aria-hidden="true">
                      {i < phase ? <Check size={14} weight="bold" /> : null}
                    </span>
                    <span>
                      <b className="sim__step-no">گام {faDigits(i + 1)}</b>
                      <RichText text={step} />
                      {state && <span className="sr-only">{i < phase ? ' (انجام شد)' : ' (در حال اجرا)'}</span>}
                    </span>
                  </li>
                );
              })}
            </ol>

            <div>
              <span className="sim__label">خروجی‌ها</span>
              <ul className="sim__outputs">
                {scenario.outputs.map((o) => (
                  <li key={o} className={done ? 'is-ready' : ''}>
                    <RichText text={o} />
                  </li>
                ))}
              </ul>
            </div>

            <div className="sim__controls">
              <button type="button" className="btn btn--primary btn--sm" onClick={run} disabled={running}>
                {running ? (
                  'در حال اجرا…'
                ) : done ? (
                  <>
                    <ArrowClockwise size={16} aria-hidden="true" /> اجرای دوباره
                  </>
                ) : (
                  <>
                    <Play size={16} weight="fill" aria-hidden="true" /> اجرای شبیه‌سازی
                  </>
                )}
              </button>
              {(phase > 0 || running) && (
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => select(index)}>
                  بازنشانی
                </button>
              )}
              <p className="sim__status" aria-live="polite">
                {status}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
