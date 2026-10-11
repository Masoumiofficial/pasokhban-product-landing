import { Info } from '@phosphor-icons/react';
import { DEMO_LABEL } from '../data/content';

type Props = { detail?: string; compact?: boolean };

// The mandatory «دموی نمایشی؛ به هوش مصنوعی زنده وصل نیست» label for every interactive demo.
export function DemoNotice({ detail, compact }: Props) {
  return (
    <p className={`demo-notice${compact ? ' demo-notice--compact' : ''}`} role="note">
      <Info size={18} weight="bold" aria-hidden="true" className="demo-notice__icon" />
      <span>
        <strong>{DEMO_LABEL}</strong>
        {detail && <span className="demo-notice__detail"> {detail}</span>}
      </span>
    </p>
  );
}
