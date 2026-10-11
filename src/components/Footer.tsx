import { FOOTER_GUIDE_LINKS, NAV_ITEMS, PLUGIN_VERSION, PRODUCT, PURCHASE_URL, SHOW_PLUGIN_VERSION, STORE_NAME, toFaDigits } from '../data/content';
import { Logo } from './Logo';
import { PurchaseButton } from './PurchaseButton';

const persianYear = () => {
  try {
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric' }).format(new Date());
  } catch {
    return '۱۴۰۵';
  }
};

export function Footer() {
  return (
    <footer className="site-footer" data-scene="keeper">
      <div className="container">
        <div className="foot-grid">
          <div className="foot-brand">
            <a className="brand" href="#top">
              <Logo className="brand__logo" decorative />
              <span className="brand__name">{PRODUCT.nameFa}</span>
            </a>
            <p>{PRODUCT.descriptionFa}</p>
            {SHOW_PLUGIN_VERSION && <span className="badge badge--soft">نسخه‌ی {toFaDigits(PLUGIN_VERSION)}</span>}
          </div>

          <nav aria-labelledby="foot-page-title">
            <h2 id="foot-page-title" className="foot-title">
              در این صفحه
            </h2>
            <ul>
              {NAV_ITEMS.map((n) => (
                <li key={n.id}>
                  <a href={`#${n.id}`}>{n.label}</a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="foot-guide-title">
            <h2 id="foot-guide-title" className="foot-title">
              راهنما
            </h2>
            <ul>
              {FOOTER_GUIDE_LINKS.map((l) => (
                <li key={l.label}>
                  <a href={l.href}>{l.label}</a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="foot-title">خرید</h2>
            <PurchaseButton small />
            <p className="foot-note">
              {PURCHASE_URL ? `خرید از فروشگاه ${STORE_NAME}.` : 'لینک خرید پس از نهایی‌شدن قیمت‌ها فعال می‌شود.'}
            </p>
          </div>
        </div>

        <div className="foot-bottom">
          <span>
            © {persianYear()} {PRODUCT.nameFa}. همه‌ی حقوق محفوظ است.
          </span>
          <span>چت هوشمند و پشتیبانی آنلاین برای وردپرس</span>
        </div>
      </div>
    </footer>
  );
}
