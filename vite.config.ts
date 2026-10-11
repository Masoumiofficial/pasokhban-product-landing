import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { FAQ_ITEMS, LANDING_VERSION, PRODUCT, SEO, SITE_URL } from './src/data/content';

// STANDALONE=1 builds the file:// friendly bundle that goes into the downloadable zip:
// one classic script (IIFE), no code splitting, no modulepreload. scripts/standalone-html.mjs then
// removes type="module" and crossorigin from index.html. The regular build is unchanged.
const standalone = process.env.STANDALONE === '1';

const escAttr = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Title, description, Open Graph and JSON-LD are generated from src/data/content.ts so the copy has a
// single source of truth. Placeholders in index.html look like %PSB_NAME%.
function seoFromContent(): Plugin {
  return {
    name: 'pasokhban-seo-from-content',
    transformIndexHtml(html) {
      const base = SITE_URL.replace(/\/+$/, '');
      const ogImage = base ? `${base}/og-cover.png` : './og-cover.png';
      const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'SoftwareApplication',
            name: PRODUCT.nameFa,
            alternateName: PRODUCT.nameEn,
            applicationCategory: 'BusinessApplication',
            applicationSubCategory: PRODUCT.categoryFa,
            operatingSystem: 'WordPress',
            inLanguage: 'fa-IR',
            description: SEO.description,
          },
          {
            '@type': 'FAQPage',
            inLanguage: 'fa-IR',
            mainEntity: FAQ_ITEMS.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a.replace(/`/g, '') },
            })),
          },
        ],
      };
      // The boot shell in index.html repeats the name and tagline as literal text (so even the raw source shows
      // real words); fail the build if it drifts from content.ts.
      if (!html.includes(`<p class="boot__name">${PRODUCT.nameFa}</p>`) || !html.includes(`<p class="boot__tagline">${PRODUCT.taglineFa}</p>`)) {
        throw new Error('index.html boot shell text differs from src/data/content.ts (PRODUCT.nameFa / taglineFa)');
      }
      const extraHead = base ? `<link rel="canonical" href="${escAttr(base)}/" />\n    <meta property="og:url" content="${escAttr(base)}/" />` : '';
      return html
        .replace(/%PSB_TITLE%/g, escAttr(SEO.title))
        .replace(/%PSB_DESCRIPTION%/g, escAttr(SEO.description))
        .replace(/%PSB_OG_TITLE%/g, escAttr(SEO.ogTitle))
        .replace(/%PSB_OG_DESCRIPTION%/g, escAttr(SEO.ogDescription))
        .replace(/%PSB_OG_IMAGE%/g, escAttr(ogImage))
        .replace(/%PSB_NAME%/g, escAttr(PRODUCT.nameFa))
        .replace(/%PSB_LANDING_VERSION%/g, escAttr(LANDING_VERSION))
        .replace(/%PSB_EXTRA_HEAD%/g, extraHead)
        .replace(/%PSB_JSON_LD%/g, JSON.stringify(jsonLd).replace(/</g, '\\u003c'));
    },
  };
}

// allowedHosts: true lets the sandbox preview proxy (https://{port}-{sandbox}.e2b.app) reach the dev server.
export default defineConfig({
  base: './', // relative asset URLs so the built folder works from any sub-folder and from file://
  plugins: [react(), seoFromContent()],
  build: {
    // Keep the delivered CSS readable (multi-line); JavaScript is minified as usual.
    cssMinify: false,
    // three.js alone is ~520 kB minified; it is loaded lazily in the regular build.
    chunkSizeWarningLimit: 900,
    ...(standalone
      ? {
          modulePreload: false,
          // One real stylesheet <link> instead of CSS injected by JavaScript, so styles load before the script.
          cssCodeSplit: false,
          rollupOptions: { output: { format: 'iife' as const, inlineDynamicImports: true } },
        }
      : {}),
  },
  server: { host: '0.0.0.0', allowedHosts: true },
  preview: { host: '0.0.0.0', allowedHosts: true },
});
