// Reaction counts for posts. GET reads them; POST sets, changes, or removes one reader's reaction.
// Counts are kept in Upstash Redis, connected through the Vercel Marketplace on its free plan.
import type { Redis } from '@upstash/redis';
import type { APIRoute } from 'astro';
import { allow, database, isPost, json } from '../../lib/api';
import { REACTIONS } from '../../reactions';

export const prerender = false;

const IDS = new Set<string>(REACTIONS.map((reaction) => reaction.id));
const VISITOR = /^[A-Za-z0-9-]{16,64}$/;

const countsKey = (post: string) => `reactions:${post}`;
const readersKey = (post: string) => `reactions:${post}:readers`;

/** Current counts for a post, plus the reaction this reader picked (if any). */
async function state(db: Redis, post: string, visitor?: string) {
  const [counts, mine] = await Promise.all([
    db.hgetall<Record<string, number>>(countsKey(post)),
    visitor ? db.hget<string>(readersKey(post), visitor) : null,
  ]);
  return {
    counts: Object.fromEntries(REACTIONS.map(({ id }) => [id, Math.max(0, Number(counts?.[id] ?? 0))])),
    mine: mine && IDS.has(mine) ? mine : null,
  };
}

export const GET: APIRoute = async ({ url }) => {
  const db = database();
  if (!db) return json({ error: 'Reactions are not set up yet.' }, 503);

  const post = url.searchParams.get('post');
  const visitor = url.searchParams.get('visitor') ?? '';
  if (!(await isPost(post))) return json({ error: 'Unknown post.' }, 404);

  return json(await state(db, post!, VISITOR.test(visitor) ? visitor : undefined));
};

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const db = database();
  if (!db) return json({ error: 'Reactions are not set up yet.' }, 503);

  let body: { post?: unknown; visitor?: unknown; reaction?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }
  const { post, visitor, reaction } = body;
  if (!(await isPost(post))) return json({ error: 'Unknown post.' }, 404);
  if (typeof visitor !== 'string' || !VISITOR.test(visitor)) return json({ error: 'Invalid reader id.' }, 400);
  if (reaction !== null && (typeof reaction !== 'string' || !IDS.has(reaction))) {
    return json({ error: 'Unknown reaction.' }, 400);
  }
  if (!(await allow(db, 'reactions', clientAddress, 20, 60))) {
    return json({ error: 'Too many reactions. Try again in a minute.' }, 429);
  }

  const slug = post as string;
  const previous = await db.hget<string>(readersKey(slug), visitor);
  if (previous !== reaction) {
    const change = db.multi();
    if (previous && IDS.has(previous)) change.hincrby(countsKey(slug), previous, -1);
    if (reaction) {
      change.hset(readersKey(slug), { [visitor]: reaction });
      change.hincrby(countsKey(slug), reaction, 1);
    } else {
      change.hdel(readersKey(slug), visitor);
    }
    await change.exec();
  }

  return json(await state(db, slug, visitor));
};
