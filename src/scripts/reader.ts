// Small browser helpers shared by the reactions, comments, visitor counter, and admin page.

/** A random id kept in this browser: one reaction per post, and one visitor in the counter. */
export function readerId(): string {
  try {
    const saved = localStorage.getItem('reader-id');
    if (saved) return saved;
    const id = crypto.randomUUID();
    localStorage.setItem('reader-id', id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/** The site owner's admin password, saved in this browser after signing in at /admin/. */
export function adminToken(): string | null {
  try {
    return localStorage.getItem('admin-token');
  } catch {
    return null;
  }
}

export function saveAdminToken(token: string | null) {
  try {
    if (token) localStorage.setItem('admin-token', token);
    else localStorage.removeItem('admin-token');
  } catch {
    // Storage blocked (private window): the sign-in lasts only for this page.
  }
}
