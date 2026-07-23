const DEFAULT_DEV_API = 'http://localhost:5000/api';

export function normalizeApiUrl(raw: string | undefined, production = import.meta.env.PROD): string {
  const value = (raw || (production ? '' : DEFAULT_DEV_API)).trim().replace(/\/+$/, '');
  if (/^[A-Z][A-Z0-9_]*\s*=/.test(value)) {
    throw new Error('Invalid VITE_API_URL: use the URL value only, without "VITE_API_URL=".');
  }
  if (!value) throw new Error('VITE_API_URL is required in production.');
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error('Invalid VITE_API_URL: expected an absolute http(s) URL.'); }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Invalid VITE_API_URL protocol.');
  if (production && parsed.protocol !== 'https:') throw new Error('VITE_API_URL must use HTTPS in production.');
  return value;
}

export const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL);
export const SOCKET_URL = API_URL.replace(/\/api$/, '');
