// The browser-tab icon: the blog's initials, from its name in src/config.ts ("NeuralScript" → "NS").
import type { APIRoute } from 'astro';
import { SITE } from '../config';

const words = SITE.title
  .replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2')
  .split(/\s+/)
  .filter((word) => /^\p{L}/u.test(word));
const initials = (words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0]?.[0] ?? '·')).toUpperCase();

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#2047c7"/>
  <text x="32" y="43" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="30" font-weight="700" fill="#ffffff">${initials}</text>
</svg>`;

export const GET: APIRoute = () => new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
