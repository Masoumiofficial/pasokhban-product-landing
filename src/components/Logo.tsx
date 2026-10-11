// Pasokhban brand mark, from assets/img/brand-mark.svg of the plugin (also public/pasokhban-mark.svg).
// Same circle, colours, bubble, eyes and accent dots as the original; two drawing glitches of the original
// were corrected: its mouth curve bowed upwards (it read as a frown at large sizes) and the bubble's top-left
// corner had a 6px step. Pass `decorative` when a visible product name sits next to it.
type LogoProps = { className?: string; title?: string; decorative?: boolean };

export function Logo({ className, title = 'لوگوی پاسخ‌بان', decorative = false }: LogoProps) {
  const a11y = decorative ? { 'aria-hidden': true as const, focusable: false as const } : { role: 'img', 'aria-label': title };
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" {...a11y}>
      <circle cx="32" cy="32" r="30" fill="#22d3ee" />
      <path
        d="M24 12h16c3.3 0 6 2.7 6 6v18c0 3.3-2.7 6-6 6h-8l-7 7v-7h-1c-3.3 0-6-2.7-6-6V18c0-3.3 2.7-6 6-6z"
        fill="#ffffff"
      />
      <circle cx="27" cy="25" r="2.5" fill="#22d3ee" />
      <circle cx="37" cy="25" r="2.5" fill="#22d3ee" />
      <path d="M27.5 31.5c1.6 2.6 7.4 2.6 9 0" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="50.5" cy="16" r="2" fill="#06b6d4" opacity="0.6" />
      <circle cx="16" cy="47" r="1.5" fill="#06b6d4" opacity="0.5" />
    </svg>
  );
}
