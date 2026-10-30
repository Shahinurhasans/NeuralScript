# Technical blog

A personal blog for technical writing, built with [Astro](https://astro.build). Posts are Markdown files with LaTeX math, highlighted code, figures with captions, callouts, footnotes, and an optional "Cite this post" box (off by default; set `citations: true` in `src/config.ts`). The site builds to plain HTML and CSS, and it is hosted for free on Vercel.

## Run it locally

You need [Node.js](https://nodejs.org) 24, the same version Vercel uses to build the site.

```sh
npm install      # once
npm run dev      # the site runs at http://localhost:4321
```

The page updates each time you save a file. Posts marked `draft: true` appear here with a "Draft" label but are never published.

To check that the site builds without errors before you publish, run `npm run build`.

## Make it yours

| File | What to change |
| --- | --- |
| `src/config.ts` | The blog's name and one-line description, your name (for the copyright line and citations), and profile links. A link left as `''` is hidden. |
| `src/pages/_about.md` | Background, education, publications, and contact details. Replace everything in [square brackets]. Hidden for now: the `_` keeps it unpublished. To show it, rename it to `about.md` and set `about: true` in `src/config.ts`. |
| `public/cv.pdf` | Your CV. Create a `public/` folder, add the file, and set `cv: '/cv.pdf'` in `src/config.ts`. |

The browser-tab icon is generated from your initials.

## Write a post

Create `src/content/posts/my-post.md`, or `src/content/posts/my-post/index.md` if the post has images to keep beside it. Either way, the post is published at `/posts/my-post/`. Each post starts with front matter:

```yaml
---
title: "What I learned reproducing ResNet on CIFAR-10"
description: "One or two sentences, shown in post lists and link previews."
date: 2026-11-02
updated: 2026-11-15   # optional
tags: [deep-learning, reproducibility]
featured: true        # optional: pin it to the home page
draft: false          # true: visible only on your computer
---
```

| Feature | Markdown |
| --- | --- |
| Inline math | `$\nabla_\theta \mathcal{L}$` |
| Display math | `$$` on the line before and the line after the equation |
| Numbered equation | `\tag{1}` inside display math |
| Code | a fenced code block that names its language, such as `python` |
| Figure with caption | `![Alt text](./plot.svg "Figure 1. Caption.")` |
| Callout | `> [!NOTE]`, or `TIP`, `IMPORTANT`, `WARNING`, `CAUTION` |
| Footnote | `text[^1]`, then `[^1]: The note.` on its own line |
| Link to another post | `[text](/posts/other-post/)` |

The home page lists the newest posts with the first lines of each, ending in "Continue reading". **Posts** shows every post the same way, and **Archives** lists every title by year.

The `templates/` folder isn't part of the site. `templates/how-posts-render/` shows every feature next to its source, and `paper-notes-template.md` and `project-writeup-template.md` give structures for explaining a paper and writing up a project. To use one, copy it into `src/content/posts/`, rename it, and remove `draft: true` when it's ready to publish.

Posts can also be `.mdx` files, which can import and use components.

## Publish for free on Vercel

Vercel's free Hobby plan covers personal, non-commercial sites like this one. Vercel recognizes the project as Astro by itself, and the build fills in the site's address (used in links, the RSS feed, and the sitemap), so nothing needs configuring.

### Option 1: publish from GitHub (recommended)

With this option, every push to GitHub publishes the site again automatically.

1. Push this folder to a GitHub repository. It can be private, which keeps your drafts private too.
   ```sh
   git init
   git add .
   git commit -m "Create blog"
   git branch -M main
   git remote add origin https://github.com/<username>/<repository>.git
   git push -u origin main
   ```
2. Sign up at [vercel.com](https://vercel.com) with your GitHub account.
3. Choose **Add New → Project**, import the repository, keep the suggested settings, and select **Deploy**.

The site goes live at `https://<project-name>.vercel.app` within a couple of minutes. Each push to `main` updates it, and pushes to other branches get their own preview links.

### Option 2: publish from your computer

```sh
npx vercel login     # once
npx vercel --prod    # publish the current version
```

Run `npx vercel --prod` again whenever you want to publish your changes.

### Good to know

- Share the main `https://<project-name>.vercel.app` address. Preview links, which have a random part in the name, are protected by Vercel by default, so visitors may be asked to log in.
- To get a different address, add another `*.vercel.app` name or your own domain (about $10–15 a year) under the project's **Settings → Domains**. The code doesn't need to change.
- The project is built for Vercel, because reactions, comments, and the visitor counter run as Vercel Functions. Another host would need a different [Astro adapter](https://docs.astro.build/en/guides/on-demand-rendering/).

## Reactions

Under each post, readers can react with 👍 Like, ❤️ Love, 🤩 Amazing, or 👎 Dislike: one reaction per reader, no sign-in needed. Clicking your reaction again removes it. The counts are stored in a free Upstash Redis database connected through Vercel. A small Vercel Function (`src/pages/api/reactions.ts`) reads and updates them, and allows each visitor 20 requests a minute so nobody can flood the counts.

To connect the database (once), run:

```sh
vercel integration add upstash/upstash-kv
```

Choose the free plan if asked. This connects the database to the Vercel project and saves its keys in `.env.local` for local development. The reaction bar stays hidden until the database is connected. To change the emoji or labels, edit `src/reactions.ts`.

## Comments and replies

Below the reactions, each post has a "Questions and answers" section. Anyone can ask a question, comment, or reply without an account, and comments appear right away. Giving a name is optional; comments without one are shown as "Anonymous". They are stored in the same free database as the reactions.

To keep spam out:

- each visitor can post 5 comments every 10 minutes
- a comment can contain at most two links
- a hidden form field catches most spam bots

Comments are shown as plain text, so they can't change your page.

### Moderating, and replying as the author

1. Open `/admin/` on your site, for example https://shahinhasanronys-blog.vercel.app/admin/.
2. Sign in with your admin password, which is the `ADMIN_TOKEN` value in `.env.local`. It is also stored, hidden, in the Vercel project under **Settings → Environment Variables**.
3. The admin page shows the visitor numbers and the latest comments, each with a **Delete** button.
4. While you're signed in, every post shows **Delete** under each comment, and your replies carry an **Author** badge.

The sign-in is remembered in that browser until you choose **Sign out**, so sign out on shared computers. To change the password, edit `ADMIN_TOKEN` under **Settings → Environment Variables** and publish again. To turn comments off, set `comments: false` in `src/config.ts`.

## Visitor counter

The footer shows how many visits the site has had. Each time someone opens the site in a new browser tab counts as one visit. Refreshing the page or moving between pages in the same tab doesn't count again.

The admin page also shows unique visitors (each browser counted once, accurate to within about 1%) and the total number of page views. Your own visits aren't counted while you're signed in at `/admin/`, and nothing is counted while you run the site on your computer. Search engines and other bots are never counted.

## Project layout

```text
src/
  config.ts               blog name, your name, and links
  reactions.ts            the four reactions (emoji and labels)
  content/posts/          blog posts (Markdown or MDX)
  pages/_about.md         the About page (hidden until renamed to about.md)
  pages/admin/            your admin page: comments and visitor numbers
  pages/api/              reactions, comments, and the visitor counter (Vercel Functions)
  pages/                  the other pages, RSS feed, robots.txt, and favicon
  lib/api.ts              database, rate-limit, and password helpers for the API
  scripts/reader.ts       browser helpers shared by those features
  layouts/, components/   page structure
  plugins/markdown.mjs    callouts, figure captions, and sub-path links
  styles/global.css       colors, fonts, and layout
```
