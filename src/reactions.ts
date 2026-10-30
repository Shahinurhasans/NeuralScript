// The reactions readers can leave on a post: one per reader, no sign-in needed.
// The ids are what the database stores, so after launch change only the emoji and labels.
export const REACTIONS = [
  { id: 'like', emoji: '👍', label: 'Like' },
  { id: 'love', emoji: '❤️', label: 'Love' },
  { id: 'amazing', emoji: '🤩', label: 'Amazing' },
  { id: 'dislike', emoji: '👎', label: 'Dislike' },
] as const;
