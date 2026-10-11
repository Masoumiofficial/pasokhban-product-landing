import { Fragment } from 'react';

// Renders Persian copy that contains Latin words or technical names.
//  - `backticks` mark technical names: rendered as <code> in JetBrains Mono, left-to-right.
//  - other Latin runs (OpenAI, WooCommerce, API…) are isolated with <bdi> so the bidi algorithm cannot
//    reorder neighbouring words, e.g. «گپ‌جی‌پی‌تی، OpenAI، Gemini» keeps its reading order in RTL.
const LATIN = /([A-Za-z][A-Za-z0-9._\-/:+]*(?:[ ()]+[A-Za-z0-9._\-/:+()]+)*\)?)/g;

function isolateLatin(text: string, keyBase: string) {
  const parts = text.split(LATIN);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <bdi key={`${keyBase}-${i}`} dir="ltr">
        {part}
      </bdi>
    ) : (
      <Fragment key={`${keyBase}-${i}`}>{part}</Fragment>
    ),
  );
}

export function RichText({ text }: { text: string }) {
  const chunks = text.split('`');
  return (
    <>
      {chunks.map((chunk, i) =>
        i % 2 === 1 ? (
          <code key={i} className="mono" dir="ltr">
            {chunk}
          </code>
        ) : (
          <Fragment key={i}>{isolateLatin(chunk, String(i))}</Fragment>
        ),
      )}
    </>
  );
}

// Plain text for meta tags and JSON-LD (drops the backticks).
export const plainText = (text: string) => text.replace(/`/g, '');
