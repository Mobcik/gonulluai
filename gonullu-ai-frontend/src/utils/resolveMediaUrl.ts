const BACKEND_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api')
  .replace('/api', '');

/**
 * Relative paths like /uploads/avatars/xyz.jpg are served by the backend,
 * not the frontend dev server.  Prepend the backend origin so the browser
 * fetches from the right host.
 */
export const resolveMediaUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `${BACKEND_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};
