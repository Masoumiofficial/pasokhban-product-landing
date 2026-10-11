import { ChatCircleDots, Headset, LinkSimple, PaperPlaneTilt, ThumbsDown, ThumbsUp } from '@phosphor-icons/react';
import { FormEvent, MouseEvent, useEffect, useRef, useState } from 'react';
import {
  CHAT_ANSWERS,
  CHAT_FALLBACK,
  CHAT_QUESTIONS,
  CHAT_SIDE_POINTS,
  CHAT_WELCOME,
  ChatAnswer,
  TICKET_SUCCESS,
} from '../data/content';
import { prefersReducedMotion } from '../lib/env';
import { tabKeyHandler } from '../hooks/useTabKeys';
import { DemoNotice } from './DemoNotice';
import { Logo } from './Logo';
import { SectionHead } from './SectionHead';
import { RichText } from './RichText';

type Msg = { id: number; role: 'bot' | 'user'; text: string; sources?: string[]; feedback?: 'up' | 'down' };
type Field = 'name' | 'contact' | 'message';
type FieldError = { field: Field; message: string };

const FIELDS: Field[] = ['name', 'contact', 'message'];
const LABELS: Record<Field, string> = { name: 'نام', contact: 'ایمیل یا شماره‌ی تماس', message: 'پیام شما' };

// Free-typed questions are matched to the scripted answers by keyword (demo only).
const KEYWORDS: [RegExp, string][] = [
  [/ووکامرس|سفارش|فروشگاه|محصول/, CHAT_QUESTIONS[0]],
  [/تلگرام|رله|بله|پیامک|اعلان/, CHAT_QUESTIONS[2]],
  [/اپراتور|انسان|پشتیبان|واگذار/, CHAT_QUESTIONS[3]],
  [/پاسخ|منبع|دانش|ایندکس|هوش/, CHAT_QUESTIONS[1]],
];

function findAnswer(question: string): ChatAnswer {
  const exact = CHAT_ANSWERS[question];
  if (exact) return exact;
  const hit = KEYWORDS.find(([re]) => re.test(question));
  return hit ? CHAT_ANSWERS[hit[1]] : CHAT_FALLBACK;
}

// Accepts an e-mail address or a phone number written with Persian or Latin digits.
function validContact(value: string): boolean {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return true;
  const digits = value
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[\s\-()+]/g, '');
  return /^\d{7,15}$/.test(digits);
}

export function ChatConsole() {
  const [tab, setTab] = useState<'chat' | 'ticket'>('chat');
  const [messages, setMessages] = useState<Msg[]>([{ id: 0, role: 'bot', text: CHAT_WELCOME }]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const nextId = useRef(1);
  const bodyRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (messages.length < 2 && !thinking) return;
    const body = bodyRef.current;
    body?.scrollTo({ top: body.scrollHeight, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [messages, thinking]);

  useEffect(() => {
    if (errors.length) summaryRef.current?.focus();
  }, [errors]);

  useEffect(() => {
    if (sent) successRef.current?.focus();
  }, [sent]);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const ask = (question: string) => {
    const q = question.trim();
    if (!q || thinking) return;
    setMessages((m) => [...m, { id: nextId.current++, role: 'user', text: q }]);
    setInput('');
    setThinking(true);
    timerRef.current = window.setTimeout(() => {
      const a = findAnswer(q);
      setMessages((m) => [...m, { id: nextId.current++, role: 'bot', text: a.answer, sources: a.sources }]);
      setThinking(false);
    }, 750);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    ask(input);
  };

  const setFeedback = (id: number, value: 'up' | 'down') =>
    setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, feedback: value } : msg)));

  const submitTicket = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const found: FieldError[] = [];
    FIELDS.forEach((field) => {
      const value = String(data.get(field) ?? '').trim();
      if (!value) found.push({ field, message: `«${LABELS[field]}» را وارد کنید.` });
      else if (field === 'contact' && !validContact(value))
        found.push({ field, message: 'ایمیل یا شماره‌ی تماس معتبر نیست؛ مثلاً name@example.com یا ۰۹۱۲۱۲۳۴۵۶۷.' });
    });
    setErrors(found);
    if (found.length === 0) setSent(true);
  };

  const focusField = (field: Field) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById(`ticket-${field}`)?.focus();
  };
  const errorFor = (field: Field) => errors.find((er) => er.field === field);
  const tabs: ('chat' | 'ticket')[] = ['chat', 'ticket'];

  return (
    <section className="section section--b chat-section" id="chat" data-scene="bubbles" aria-labelledby="chat-title">
      <div className="container">
        <SectionHead
          id="chat-title"
          eyebrow={
            <>
              پیش‌نمایش ویجت · <span className="mono">[pasokhban]</span>
            </>
          }
          title="ویجت گفتگوی پاسخ‌بان را امتحان کنید"
          lead="پاسخ‌های این پیش‌نمایش از قبل نوشته شده‌اند تا رفتار ویجت را ببینید: پاسخ با منبع، امتیاز رضایت و درخواست اپراتور انسانی."
        />
        <div className="chat-layout">
          <aside className="chat-side" aria-labelledby="chat-side-title">
            <h3 id="chat-side-title">آنچه این پیش‌نمایش نشان می‌دهد</h3>
            <ul>
              {CHAT_SIDE_POINTS.map((p) => (
                <li key={p}>
                  <RichText text={p} />
                </li>
              ))}
            </ul>
            <p className="chat-side__note">
              ویجت واقعی با شورت‌کد <span className="mono">[pasokhban]</span> داخل برگه هم جاسازی می‌شود.
            </p>
          </aside>

          <div className="chat" role="region" aria-label="پیش‌نمایش نمایشی ویجت گفتگوی پاسخ‌بان">
            <div className="chat__head">
              <Logo className="chat__avatar" decorative />
              <div>
                <strong>پاسخ‌بان</strong>
                <small>پاسخ‌گویی آنلاین</small>
              </div>
              <span className="badge badge--warn">نمایشی</span>
            </div>
            <div
              className="chat__tabs"
              role="tablist"
              aria-label="حالت ویجت"
              onKeyDown={tabKeyHandler(2, tabs.indexOf(tab), (i) => setTab(tabs[i]))}
            >
              <button
                type="button"
                role="tab"
                id="tab-chat"
                aria-selected={tab === 'chat'}
                aria-controls="panel-chat"
                tabIndex={tab === 'chat' ? 0 : -1}
                onClick={() => setTab('chat')}
              >
                <ChatCircleDots size={18} aria-hidden="true" /> گفتگو
              </button>
              <button
                type="button"
                role="tab"
                id="tab-ticket"
                aria-selected={tab === 'ticket'}
                aria-controls="panel-ticket"
                tabIndex={tab === 'ticket' ? 0 : -1}
                onClick={() => setTab('ticket')}
              >
                <Headset size={18} aria-hidden="true" /> گفتگو با پشتیبان
              </button>
            </div>
            <div className="chat__notice">
              <DemoNotice compact />
            </div>

            {tab === 'chat' ? (
              <div id="panel-chat" role="tabpanel" aria-labelledby="tab-chat" className="chat__panel">
                <div className="chat__body" ref={bodyRef} aria-live="polite" aria-relevant="additions">
                  {messages.map((m) => (
                    <div key={m.id} className={`msg msg--${m.role}`}>
                      <span className="sr-only">{m.role === 'bot' ? 'پاسخ‌بان: ' : 'شما: '}</span>
                      {m.role === 'bot' ? <RichText text={m.text} /> : <span className="msg__user-text">{m.text}</span>}
                      {m.sources && m.sources.length > 0 && (
                        <div className="msg__sources">
                          <strong>
                            <LinkSimple size={16} aria-hidden="true" /> منابع سایت
                          </strong>
                          <ul>
                            {m.sources.map((s) => (
                              <li key={s}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {m.role === 'bot' && m.id !== 0 && (
                        <div className="msg__feedback" role="group" aria-label="امتیاز رضایت این پاسخ">
                          <button type="button" aria-pressed={m.feedback === 'up'} onClick={() => setFeedback(m.id, 'up')}>
                            <ThumbsUp size={16} aria-hidden="true" /> مفید بود
                          </button>
                          <button type="button" aria-pressed={m.feedback === 'down'} onClick={() => setFeedback(m.id, 'down')}>
                            <ThumbsDown size={16} aria-hidden="true" /> مفید نبود
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {thinking && (
                    <div className="msg msg--bot msg--typing" role="status">
                      <span className="sr-only">پاسخ‌بان در حال نوشتن است</span>
                      <span className="typing" aria-hidden="true">
                        <i />
                        <i />
                        <i />
                      </span>
                    </div>
                  )}
                </div>

                <div className="chat__suggest" aria-label="پرسش‌های نمونه" role="group">
                  {CHAT_QUESTIONS.map((q) => (
                    <button key={q} type="button" onClick={() => ask(q)} disabled={thinking}>
                      {q}
                    </button>
                  ))}
                </div>

                <form className="chat__input" onSubmit={onSubmit}>
                  <label className="sr-only" htmlFor="chat-input">
                    پرسش خود را بنویسید
                  </label>
                  <input
                    id="chat-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="پرسش خود را بنویسید…"
                    autoComplete="off"
                    maxLength={300}
                  />
                  <button type="submit" className="send" disabled={!input.trim() || thinking}>
                    <PaperPlaneTilt size={18} weight="fill" aria-hidden="true" className="send__icon" /> ارسال
                  </button>
                </form>
                <p className="chat__hint">پاسخ‌ها نمونه‌ی ثابت‌اند و هیچ درخواستی به سرویس هوش مصنوعی ارسال نمی‌شود.</p>
              </div>
            ) : sent ? (
              <div id="panel-ticket" role="tabpanel" aria-labelledby="tab-ticket" className="ticket">
                <div className="ticket__ok" role="status" tabIndex={-1} ref={successRef}>
                  {TICKET_SUCCESS}
                </div>
                <button
                  type="button"
                  className="btn btn--light btn--sm ticket__again"
                  onClick={() => {
                    setSent(false);
                    setErrors([]);
                  }}
                >
                  ثبت درخواست جدید
                </button>
              </div>
            ) : (
              <form id="panel-ticket" role="tabpanel" aria-labelledby="tab-ticket" className="ticket" onSubmit={submitTicket} noValidate>
                <p className="ticket__intro">
                  این فرم، درخواست گفتگو با اپراتور انسانی را شبیه‌سازی می‌کند؛ اطلاعات آن به هیچ‌جا ارسال نمی‌شود.
                </p>
                {errors.length > 0 && (
                  <div className="ticket__errors" role="alert" tabIndex={-1} ref={summaryRef} aria-labelledby="ticket-err-title">
                    <strong id="ticket-err-title">فرم کامل نیست؛ این موارد را اصلاح کنید:</strong>
                    <ul>
                      {errors.map((er) => (
                        <li key={er.field}>
                          <a href={`#ticket-${er.field}`} onClick={focusField(er.field)}>
                            {er.message}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {FIELDS.map((field) => {
                  const err = errorFor(field);
                  const id = `ticket-${field}`;
                  const errId = `${id}-error`;
                  const common = {
                    id,
                    name: field,
                    'aria-invalid': err ? true : undefined,
                    'aria-describedby': err ? errId : undefined,
                  };
                  return (
                    <div className="ticket__field" key={field}>
                      <label htmlFor={id}>{LABELS[field]}</label>
                      {field === 'message' ? (
                        <textarea {...common} placeholder="درخواست خود را کوتاه بنویسید…" maxLength={600} />
                      ) : (
                        <input
                          {...common}
                          placeholder={field === 'name' ? 'مثلاً سارا محمدی' : 'name@example.com یا ۰۹۱۲۱۲۳۴۵۶۷'}
                          dir={field === 'contact' ? 'ltr' : undefined}
                          autoComplete={field === 'name' ? 'name' : 'off'}
                          inputMode={field === 'contact' ? 'email' : undefined}
                        />
                      )}
                      {err && (
                        <span id={errId} className="ticket__error">
                          {err.message}
                        </span>
                      )}
                    </div>
                  );
                })}
                <button type="submit" className="btn btn--primary btn--sm ticket__submit">
                  ثبت درخواست (نمایشی)
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
