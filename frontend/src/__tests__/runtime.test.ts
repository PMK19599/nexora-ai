import { describe, expect, it } from 'vitest';
import { normalizeApiUrl } from '@/config/runtime';

describe('runtime API configuration', () => {
  it('normalizes whitespace and trailing slashes', () => {
    expect(normalizeApiUrl(' https://api.example.invalid/api/ ', true)).toBe('https://api.example.invalid/api');
  });
  it('rejects an environment assignment prefix', () => {
    expect(() => normalizeApiUrl('VITE_API_URL=https://api.example.invalid/api', true)).toThrow(/without "VITE_API_URL="/);
  });
  it('requires HTTPS in production', () => {
    expect(() => normalizeApiUrl('http://api.example.invalid/api', true)).toThrow(/HTTPS/);
  });
});
