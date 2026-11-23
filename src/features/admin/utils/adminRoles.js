export function normalizeAdminRole(role) {
  const key = String(role || '').toLowerCase();
  if (key === 'admin' || key === 'administrator') return 'Admin';
  if (key === 'contentauthor' || key === 'content author' || key === 'author') return 'ContentAuthor';
  if (key === 'mentor' || key === 'consultant') return 'Mentor';
  return 'Learner';
}
