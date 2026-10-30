// Comments and replies for posts. Anyone can post without an account. The site owner signs in
// at /admin/ (with the ADMIN_TOKEN password) to reply as the author and to delete comments.
import type { Redis } from '@upstash/redis';
import type { APIRoute } from 'astro';
import { SITE } from '../../config';
import { allow, database, isAdmin, isPost, json } from '../../lib/api';

export const prerender = false;

interface Comment {
  id: string;
  /** The comment this one replies to. Replies are one level deep. */
  parentId: string | null;
  name: string;
  body: string;
  createdAt: string;
  /** Written by the site owner while signed in at /admin/. */
  author: boolean;
}

const MAX_NAME = 60;
const MAX_BODY = 3000;
const MAX_LINKS = 2;
const RECENT = 'comments:recent';

const commentsKey = (post: string) => `comments:${post}`;

/** All comments on a post, oldest first. */
async function load(db: Redis, post: string): Promise<Comment[]> {
  const stored = await db.hgetall<Record<string, Comment>>(commentsKey(post));
  return Object.values(stored ?? {}).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Trims text and drops invisible control characters (line breaks and tabs are kept). */
const tidy = (text: unknown) =>
  typeof text === 'string' ? text.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim() : '';

export const GET: APIRoute = async ({ url, request }) => {
  const db = database();
  if (!db) return json({ error: 'Comments are not set up yet.' }, 503);

  // The admin page asks for the latest comments across all posts.
  if (url.searchParams.has('recent')) {
    if (!isAdmin(request)) return json({ error: 'Wrong password.' }, 401);
    const refs = (await db.zrange<string[]>(RECENT, 0, 49, { rev: true })).map((ref) => {
      const split = ref.lastIndexOf('/');
      return { post: ref.slice(0, split), id: ref.slice(split + 1) };
    });
    if (refs.length === 0) return json({ comments: [] });
    const lookups = db.pipeline();
    for (const { post, id } of refs) lookups.hget(commentsKey(post), id);
    const found = await lookups.exec<(Comment | null)[]>();
    return json({ comments: refs.flatMap((ref, i) => (found[i] ? [{ ...found[i], post: ref.post }] : [])) });
  }

  const post = url.searchParams.get('post');
  if (!(await isPost(post))) return json({ error: 'Unknown post.' }, 404);
  return json({ comments: await load(db, post!) });
};

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const db = database();
  if (!db) return json({ error: 'Comments are not set up yet.' }, 503);

  let input: Record<string, unknown>;
  try {
    input = await request.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }
  if (!(await isPost(input.post))) return json({ error: 'Unknown post.' }, 404);
  const post = input.post as string;

  // People never see the hidden "website" field, but spam bots fill it in. Pretend it worked.
  if (input.website) return json({ comment: null }, 201);

  const admin = isAdmin(request);
  // The name is optional; comments without one are shown as "Anonymous".
  const name = admin ? SITE.author : tidy(input.name).replace(/\s+/g, ' ') || 'Anonymous';
  const body = tidy(input.body);
  const parentId = typeof input.parentId === 'string' ? input.parentId : null;

  if (name.length > MAX_NAME) return json({ error: `Names can be up to ${MAX_NAME} characters.` }, 400);
  if (!body) return json({ error: 'Please write a comment.' }, 400);
  if (body.length > MAX_BODY) return json({ error: `Comments can be up to ${MAX_BODY} characters.` }, 400);
  if ((body.match(/https?:\/\/|www\./gi) ?? []).length > MAX_LINKS) {
    return json({ error: `Please include at most ${MAX_LINKS} links.` }, 400);
  }
  if (!admin && !(await allow(db, 'comments', clientAddress, 5, 600))) {
    return json({ error: 'You have posted several comments in a short time. Please try again in a few minutes.' }, 429);
  }
  if (parentId) {
    const parent = await db.hget<Comment>(commentsKey(post), parentId);
    if (!parent || parent.parentId) return json({ error: 'That comment no longer exists.' }, 400);
  }

  const comment: Comment = {
    id: crypto.randomUUID(),
    parentId,
    name,
    body,
    createdAt: new Date().toISOString(),
    author: admin,
  };
  const save = db.multi();
  save.hset(commentsKey(post), { [comment.id]: comment });
  save.zadd(RECENT, { score: Date.now(), member: `${post}/${comment.id}` });
  save.zremrangebyrank(RECENT, 0, -201); // The admin page lists the newest 200 at most.
  await save.exec();

  return json({ comment }, 201);
};

export const DELETE: APIRoute = async ({ url, request }) => {
  const db = database();
  if (!db) return json({ error: 'Comments are not set up yet.' }, 503);
  if (!isAdmin(request)) return json({ error: 'Wrong password.' }, 401);

  const post = url.searchParams.get('post');
  const id = url.searchParams.get('id');
  if (!post || !id) return json({ error: 'Missing comment.' }, 400);

  // Deleting a comment also deletes the replies under it.
  const ids = (await load(db, post)).filter((c) => c.id === id || c.parentId === id).map((c) => c.id);
  if (ids.length > 0) {
    const removal = db.multi();
    removal.hdel(commentsKey(post), ...ids);
    removal.zrem(RECENT, ...ids.map((commentId) => `${post}/${commentId}`));
    await removal.exec();
  }
  return json({ deleted: ids.length });
};
