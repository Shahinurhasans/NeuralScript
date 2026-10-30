// The opening words of a post, for post lists ("… Continue reading").
// Math, inline code, and links in those words are rendered just as in the post itself.
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { rehypeBaseLinks } from '../plugins/markdown.mjs';

let renderer: ReturnType<typeof createMarkdownProcessor> | undefined;

/** Up to `words` words of prose from the start of a post, as inline HTML. */
export async function excerpt(markdown = '', words = 55): Promise<{ html: string; truncated: boolean }> {
  const prose = markdown
    .replace(/^(```|~~~)[\s\S]*?^\1[^\n]*$/gm, '') // code blocks
    .replace(/\$\$[\s\S]*?\$\$/g, '') // display math
    .replace(/<!--[\s\S]*?-->/g, '') // comments
    .replace(/\[\^[^\]\s]+\]/g, ''); // footnote markers

  // Only paragraphs: skip headings, quotes and callouts, tables, images, HTML, footnotes, and lists.
  const text = prose
    .split(/\n\s*\n/)
    .map((block) => block.trim().replace(/\s+/g, ' '))
    .filter((block) => block && !/^(#|>|\||!\[|<|\[\^|[-*+]\s|\d+[.)]\s)/.test(block))
    .join(' ');

  // Inline math, inline code, and links count as one word each, so they are never cut in half.
  const tokens = [...text.matchAll(/\$[^$]+\$|`[^`]+`|\[[^\]]*\]\([^)]*\)|\S+/g)];
  const truncated = tokens.length > words;
  const end = truncated ? tokens[words - 1].index! + tokens[words - 1][0].length : text.length;
  // Drop bold markers, which a cut could leave unpaired (math and code are kept as they are).
  const source = text.slice(0, end).replace(/(\$[^$]+\$|`[^`]+`)|\*\*|__/g, (match, kept) => kept ?? '');

  renderer ??= createMarkdownProcessor({
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex, [rehypeBaseLinks, { base: import.meta.env.BASE_URL }]],
    syntaxHighlight: false,
  });
  const { code } = await (await renderer).render(source);
  return { html: code.trim().replace(/^<p>|<\/p>$/g, ''), truncated };
}
