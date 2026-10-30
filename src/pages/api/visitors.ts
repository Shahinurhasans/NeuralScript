// Site-wide visitor counter. It keeps three numbers:
// - visits: one each time someone opens the site in a new tab (refreshing doesn't count again)
// - unique visitors: each browser counts once, kept in a Redis HyperLogLog (12 KB, about 1% accurate)
// - page views: every page opened
import type { APIRoute } from 'astro';
import { allow, database, json } from '../../lib/api';

export const prerender = false;

const VISITS = 'visitors:visits';
const UNIQUE = 'visitors:unique';
const VIEWS = 'visitors:views';
const VISITOR = /^[A-Za-z0-9-]{16,64}$/;
// Search engines, link previews, and screenshot services run the page's JavaScript too.
const BOTS = /bot|crawl|spider|slurp|headless|lighthouse|preview|screenshot|facebookexternalhit|embedly|curl|wget|python|^$/i;

/** Reads the totals, optionally after counting one page view (and a visit, if it starts one). */
async function count(view?: { visitor: string; newVisit: boolean }) {
  const db = database()!;
  const batch = db.pipeline();
  if (view) {
    batch.pfadd(UNIQUE, view.visitor);
    batch.incr(VIEWS);
    if (view.newVisit) batch.incr(VISITS);
  }
  batch.get<number>(VISITS);
  batch.pfcount(UNIQUE);
  batch.get<number>(VIEWS);
  const results = await batch.exec<unknown[]>();
  const [visits, visitors, views] = results.slice(-3);
  return { visits: Number(visits ?? 0), visitors: Number(visitors ?? 0), views: Number(views ?? 0) };
}

export const GET: APIRoute = async () => {
  if (!database()) return json({ error: 'The visitor counter is not set up yet.' }, 503);
  return json(await count());
};

/** Counts one page view; `newVisit` is true on the first page of a new browser tab. */
export const POST: APIRoute = async ({ request, clientAddress }) => {
  const db = database();
  if (!db) return json({ error: 'The visitor counter is not set up yet.' }, 503);

  let input: { visitor?: unknown; newVisit?: unknown };
  try {
    input = await request.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }
  const { visitor, newVisit } = input;
  if (typeof visitor !== 'string' || !VISITOR.test(visitor)) return json({ error: 'Invalid visitor id.' }, 400);

  // Bots aren't counted, and past 60 page views a minute from one address counting pauses;
  // either way the response still carries the current totals.
  const human = !BOTS.test(request.headers.get('User-Agent') ?? '');
  const counted = human && (await allow(db, 'visits', clientAddress, 60, 60));
  return json(await count(counted ? { visitor, newVisit: newVisit === true } : undefined));
};
