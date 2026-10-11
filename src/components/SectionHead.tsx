import type { ReactNode } from 'react';

type Props = { id: string; eyebrow: ReactNode; title: string; lead?: ReactNode };

// Section heading. `id` goes on the <h2> so the section's aria-labelledby resolves.
export function SectionHead({ id, eyebrow, title, lead }: Props) {
  return (
    <div className="section__head">
      <span className="section__eyebrow">{eyebrow}</span>
      <h2 id={id}>{title}</h2>
      {lead && <p className="section__lead">{lead}</p>}
    </div>
  );
}
