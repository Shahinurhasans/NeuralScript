// Helpers shared by the on-demand API routes in src/pages/api/ (reactions and comments).
import { timingSafeEqual } from 'node:crypto';
import { Redis } from '@upstash/redis';
import { getSecret } from 'astro:env/server';
import { getPosts } from '../utils/posts';

let redis: Redis | null | undefined;

/** The database client, or null until Upstash Redis is connected to the Vercel project. */
export function database(): Redis | null {
  if (redis === undefined) {
    const url = getSecret('KV_REST_API_URL') ?? getSecret('UPSTASH_REDIS_REST_URL');
    const token = getSecret('KV_REST_API_TOKEN') ?? getSecret('UPSTASH_REDIS_REST_TOKEN');
    redis = url && token ? new Redis({ url, token }) : null;
  }
  return redis;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

/** True when `post` is the slug of a published post (drafts count while running `npm run dev`). */
export async function isPost(post: unknown): Promise<boolean> {
  return typeof post === 'string' && (await getPosts()).some((entry) => entry.id === post);
}

/**
 * Counts one request from a network address and reports whether it stays within `limit`
 * requests per `seconds`. Addresses are stored only as short hashes, and the counters expire.
 */
export async function allow(db: Redis, scope: string, address: string, limit: number, seconds: number) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(address));
  const visitor = [...new Uint8Array(digest).slice(0, 8)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  const key = `ratelimit:${scope}:${visitor}:${Math.floor(Date.now() / (seconds * 1000))}`;
  const count = await db.incr(key);
  if (count === 1) await db.expire(key, seconds);
  return count <= limit;
}

/** True when the request carries the site owner's password (the ADMIN_TOKEN environment variable). */
export function isAdmin(request: Request): boolean {
  const expected = getSecret('ADMIN_TOKEN');
  const given = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!expected || !given) return false;
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
