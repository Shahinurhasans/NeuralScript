import { type CollectionEntry, getCollection } from 'astro:content';
import { url } from './url';

export type Post = CollectionEntry<'posts'>;

export interface Tag {
  name: string;
  slug: string;
  posts: Post[];
}

/** Published posts, newest first. Drafts are included only while running `npm run dev`. */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => import.meta.env.DEV || !data.draft);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function tagSlug(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/\+/g, 'plus')
    .replace(/#/g, 'sharp')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

/** Every tag used by `posts`, most used first. */
export function getTags(posts: Post[]): Tag[] {
  const tags = new Map<string, Tag>();
  for (const post of posts) {
    for (const name of post.data.tags) {
      const slug = tagSlug(name);
      const tag = tags.get(slug) ?? { name, slug, posts: [] };
      if (!tag.posts.includes(post)) tag.posts.push(post);
      tags.set(slug, tag);
    }
  }
  return [...tags.values()].sort((a, b) => b.posts.length - a.posts.length || a.name.localeCompare(b.name));
}

export const postUrl = (post: Post) => url(`/posts/${post.id}/`);
export const tagUrl = (tag: string) => url(`/tags/${tagSlug(tag)}/`);
