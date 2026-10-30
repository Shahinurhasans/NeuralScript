// Everything personal about the site lives in this file.
// Edit a value, save, and every page updates.

export const SITE = {
  /** The blog's name, shown at the top of every page and in the browser tab. */
  title: 'NeuralScript',
  /** One line about the blog, shown under its name and in search results and link previews. */
  description: 'Technical notes on research, experiments, and papers',
  /** Your full name, used for the copyright line, citations, and search engines. */
  author: 'Md. Shahinur Hasan',
  /** Your name in BibTeX order ("Last, First"), used in the "Cite this post" box. */
  authorBib: 'Hasan, Md. Shahinur',
  /** Put your CV in the public/ folder as cv.pdf and set this to '/cv.pdf'. '' hides the link. */
  cv: '',
  /** Profile links, shown in the footer. Leave any of them as '' to hide it. */
  links: {
    email: '', // you@university.edu
    github: '', // https://github.com/username
    scholar: '', // https://scholar.google.com/citations?user=...
    linkedin: '', // https://www.linkedin.com/in/username
    orcid: '', // https://orcid.org/0000-0000-0000-0000
    portfolio: '', // https://your-portfolio-site
  },
  /**
   * Show the About page in the menu. It is hidden for now: its text is in src/pages/_about.md,
   * which is not published. To show it, rename that file to about.md and set this to true.
   */
  about: false,
  /** End every post with a "Cite this post" box (APA and BibTeX). */
  citations: false,
  /**
   * "Questions and answers" under each post. Anyone can comment and reply without an account;
   * you moderate at /admin/ (see README.md). Set to false to turn comments off.
   */
  comments: true,
  /** Language and date format. */
  locale: 'en-US',
};
