// @ts-check
import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import { defineConfig } from 'astro/config';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { rehypeBaseLinks, rehypeWrapTables, remarkCallouts, remarkFigures } from './src/plugins/markdown.mjs';

// The site's public address, used in canonical links, the RSS feed, and the sitemap.
// Vercel provides it automatically. On other hosts, set SITE_URL, e.g. https://yourname.netlify.app
const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const site = process.env.SITE_URL || (vercelDomain ? `https://${vercelDomain}` : 'http://localhost:4321');
// Set BASE_PATH (e.g. /blog) only when the site is served from a sub-path instead of the domain root.
const base = process.env.BASE_PATH || '/';

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site,
  base,
  // Page addresses end in "/"; on Vercel, /posts redirects to /posts/.
  trailingSlash: 'always',
  // Every page is static HTML; only the reactions API (src/pages/api/) runs as a Vercel Function.
  adapter: vercel(),
  integrations: [mdx(), sitemap({ filter: (page) => !page.includes('/admin/') })],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath, remarkCallouts, remarkFigures],
      rehypePlugins: [rehypeKatex, [rehypeBaseLinks, { base }], rehypeWrapTables],
    }),
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
    },
  },
});
