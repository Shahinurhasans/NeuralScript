// '' when the site is served from the domain root, '/blog' when it lives under a sub-path.
const base = import.meta.env.BASE_URL.replace(/\/+$/, '');

/** Puts the site's base path in front of a root-relative path: '/posts/' → '/blog/posts/'. */
export function url(path: string): string {
  return `${base}/${path.replace(/^\/+/, '')}`;
}
