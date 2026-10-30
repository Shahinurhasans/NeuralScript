---
title: 'How posts render on this blog'
description: 'A working reference for math, code, figures, callouts, tables, and footnotes. Open this file next to the page to see the Markdown behind each example.'
date: 2026-10-28
tags: [guide, writing]
featured: true
draft: true
---

This post is a style guide you can copy from. It is marked `draft: true`, so you see it while running the site on your computer, but it is never published. Its source is `src/content/posts/how-posts-render/index.md`.

## Front matter

Every post starts with a block of metadata between two `---` lines:

```yaml
---
title: "Why Adam needs bias correction"
description: "One or two sentences, shown in post lists and link previews."
date: 2026-11-02
updated: 2026-11-10   # optional
tags: [optimization, deep-learning]
featured: true        # optional: pin it to the home page
draft: false          # true = visible only on your computer
---
```

A post can be a single file (`my-post.md`) or a folder (`my-post/index.md`) that also holds its images. Either way, it is published at `/posts/my-post/`.

## Math

Inline math goes between single dollar signs. The softmax of a vector $z \in \mathbb{R}^K$ is $\sigma(z)_i = e^{z_i} / \sum_{j=1}^{K} e^{z_j}$.

Display math goes between double dollar signs, each on its own line:

$$
\operatorname{Attention}(Q, K, V) = \operatorname{softmax}\!\left(\frac{QK^\top}{\sqrt{d_k}}\right) V
$$

### Numbered equations

Add `\tag{1}` to number an equation you refer to later:

$$
\theta_{t+1} = \theta_t - \eta \, \nabla f(\theta_t) \tag{1}
$$

KaTeX turns equations into HTML while the site builds, so they appear instantly and nothing runs in the reader's browser.

## Code

Fenced code blocks are highlighted in both the light and dark themes. Hover over a block to copy it.

```python
import numpy as np

def gradient_descent(grad, x0, lr, steps):
    """Run gradient descent, equation (1), and return every iterate."""
    x = np.asarray(x0, dtype=float)
    path = [x.copy()]
    for _ in range(steps):
        x = x - lr * grad(x)
        path.append(x.copy())
    return np.array(path)

# f(x, y) = (x**2 + 10 * y**2) / 2 is ten times steeper along y than along x.
grad = lambda p: np.array([p[0], 10 * p[1]])
path = gradient_descent(grad, x0=[-4.0, 1.0], lr=0.18, steps=30)
print(path[-1])  # about [-0.0104, 0.0012], close to the minimum at (0, 0)
```

Inline code, like `np.linalg.solve`, gets a subtle background.

## Figures

Put the image file next to the post and give it a title in quotes. The title becomes the caption, and the text in square brackets is what screen readers announce.

![Elliptical contour lines around a minimum, with a gradient descent path that zig-zags across the narrow direction](./gd-contours.svg "Figure 1. Gradient descent on f(x, y) = (x² + 10y²)/2 from (−4, 1) with step size 0.18, the run in the code above. Each step overshoots across the narrow valley, so the path zig-zags instead of following the dashed line to the minimum.")

SVG is the best format for plots and diagrams because it stays sharp at any zoom. In matplotlib, use `plt.savefig("figure.svg", bbox_inches="tight")`. Photos work too, as `.jpg` or `.png`.

## Callouts

Callouts use GitHub's syntax, so they also render on GitHub:

> [!NOTE]
> Background that helps but isn't essential.

> [!TIP]
> Lead with the result. A reader who stops after the first paragraph should still learn what you found.

> [!WARNING]
> State the setup behind every number: dataset, number of seeds, and hardware.

Write a title after the marker to replace the default one:

> [!IMPORTANT] Key idea
> With the best fixed step size, $\eta = 2/(\mu + L)$, gradient descent shrinks the error by a factor of $(\kappa - 1)/(\kappa + 1)$ per step, where $\kappa = L/\mu$ is the condition number. For the function above, $\kappa = 10$ and $\eta \approx 0.18$.

The fifth kind is `[!CAUTION]`.

## Tables

| Method              | Uses                 | Rate on a quadratic with condition number $\kappa$             |
| :------------------ | :------------------- | :------------------------------------------------------------- |
| Gradient descent    | gradient             | $(\kappa - 1)/(\kappa + 1)$ per step                           |
| Heavy-ball momentum | gradient             | $(\sqrt{\kappa} - 1)/(\sqrt{\kappa} + 1)$ per step, when tuned |
| Newton's method     | gradient and Hessian | exact after one step                                           |

Wide tables scroll sideways on phones instead of breaking the layout.

## Footnotes and references

Footnotes are numbered and collected at the end of the post automatically.[^1] For a reference list, use a numbered list under a "References" heading and link each paper to its arXiv or DOI page.

[^1]: Like this one. A typical reference: Kingma and Ba, "Adam: A Method for Stochastic Optimization," ICLR 2015, https://arxiv.org/abs/1412.6980.

## Links

Link to another post with a path that starts at the site root, such as [the paper notes template](/posts/paper-notes-template/). These links keep working even if the site is hosted under a sub-path like `/blog/`.

## Citation box

Every post ends with a "Cite this post" box built from its title, date, and address. Turn it off with `citations: false` in `src/config.ts`.
