export const API_BASE_URL = 'http://localhost:8080';

export function apiUrl(path) {
  if (!API_BASE_URL) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}
