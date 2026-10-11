import { ArrowLeft } from '@phosphor-icons/react';
import { PURCHASE_URL } from '../data/content';

type Props = {
  variant?: 'primary' | 'ghost' | 'light' | 'onbrand';
  small?: boolean;
  block?: boolean;
  /** Text used once PURCHASE_URL is set. While it is empty the button always reads «مشاهده‌ی قیمت‌ها». */
  label?: string;
  className?: string;
  onClick?: () => void;
};

// Every buy/get button on the page is this component, so all of them read the single PURCHASE_URL constant.
// While PURCHASE_URL is empty the button scrolls to the pricing section.
export function PurchaseButton({ variant = 'primary', small, block, label = 'خرید پاسخ‌بان', className, onClick }: Props) {
  const ready = PURCHASE_URL !== '';
  const cls = ['btn', `btn--${variant}`, small ? 'btn--sm' : '', block ? 'btn--block' : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <a className={cls} href={ready ? PURCHASE_URL : '#pricing'} onClick={onClick} data-cta="purchase">
      {ready ? label : 'مشاهده‌ی قیمت‌ها'}
      <ArrowLeft size={16} weight="bold" aria-hidden="true" />
    </a>
  );
}
