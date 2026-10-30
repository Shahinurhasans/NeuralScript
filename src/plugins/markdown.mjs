// Markdown extensions used by every post and page. They run while the site
// builds, so readers only download plain HTML.

/** Calls `visit(node, parent)` for every node in a syntax tree, parents first. */
function walk(node, visit, parent) {
  visit(node, parent);
  for (const child of [...(node.children ?? [])]) walk(child, visit, node);
}

const CALLOUT_TITLES = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
};

/**
 * GitHub-style callouts. A custom title can follow the marker:
 *
 *   > [!TIP] Rule of thumb
 *   > Lead with the result.
 */
export function remarkCallouts() {
  return (tree) => {
    walk(tree, (node) => {
      if (node.type !== 'blockquote') return;
      const paragraph = node.children[0];
      const text = paragraph?.type === 'paragraph' ? paragraph.children[0] : undefined;
      const match = text?.type === 'text' ? /^\[!(\w+)\][ \t]*([^\n]*)\n?/.exec(text.value) : null;
      const type = match?.[1].toLowerCase();
      if (!match || !Object.hasOwn(CALLOUT_TITLES, type)) return;

      text.value = text.value.slice(match[0].length);
      if (!text.value) paragraph.children.shift();
      if (!paragraph.children.length) node.children.shift();

      node.data = { hName: 'div', hProperties: { className: ['callout', `callout-${type}`], role: 'note' } };
      node.children.unshift({
        type: 'paragraph',
        data: { hProperties: { className: ['callout-title'] } },
        children: [{ type: 'text', value: match[2].trim() || CALLOUT_TITLES[type] }],
      });
    });
  };
}

/**
 * An image on its own line with a title becomes a figure with a caption:
 *
 *   ![Alt text for screen readers](./plot.svg "Figure 1. What the reader should notice.")
 */
export function remarkFigures() {
  return (tree) => {
    walk(tree, (node) => {
      if (node.type !== 'paragraph') return;
      const content = node.children.filter((child) => child.type !== 'text' || child.value.trim());
      const image = content[0];
      if (content.length !== 1 || image.type !== 'image' || !image.title) return;

      const caption = image.title;
      image.title = null;
      node.data = { hName: 'figure' };
      node.children = [
        image,
        { type: 'paragraph', data: { hName: 'figcaption' }, children: [{ type: 'text', value: caption }] },
      ];
    });
  };
}

/**
 * Puts the site's base path in front of root-relative links and images, so
 * `[a post](/posts/x/)` keeps working when the site lives under a sub-path like /blog/.
 */
export function rehypeBaseLinks({ base = '/' } = {}) {
  const prefix = base.replace(/\/+$/, '');
  return (tree) => {
    if (!prefix) return;
    walk(tree, (node) => {
      if (node.type !== 'element') return;
      for (const attribute of ['href', 'src']) {
        const value = node.properties[attribute];
        if (
          typeof value === 'string' &&
          value.startsWith('/') &&
          !value.startsWith('//') &&
          value !== prefix &&
          !value.startsWith(`${prefix}/`)
        ) {
          node.properties[attribute] = prefix + value;
        }
      }
    });
  };
}

/** Wraps each table in a scrollable box so wide tables don't overflow on phones. */
export function rehypeWrapTables() {
  return (tree) => {
    walk(tree, (node, parent) => {
      if (node.type !== 'element' || node.tagName !== 'table' || !parent) return;
      const wrapper = { type: 'element', tagName: 'div', properties: { className: ['table-wrap'] }, children: [node] };
      parent.children[parent.children.indexOf(node)] = wrapper;
    });
  };
}
