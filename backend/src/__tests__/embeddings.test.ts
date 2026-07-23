/// <reference types="jest" />
import { describe, it, expect } from '@jest/globals';
import { cleanText, sliceTextIntoChunks, similaritySearch, getRepresentativeChunks } from '../utils/embeddings';

describe('cleanText', () => {
  it('collapses multiple spaces', () => expect(cleanText('hello   world')).toBe('hello world'));
  it('trims leading/trailing whitespace', () => expect(cleanText('  hello  ')).toBe('hello'));
  it('collapses newlines into spaces', () => expect(cleanText('a\n\nb\nc')).toBe('a b c'));
  it('returns empty for whitespace-only input', () => expect(cleanText('   ')).toBe(''));
});

describe('sliceTextIntoChunks', () => {
  it('returns empty array for empty string', () => expect(sliceTextIntoChunks('')).toEqual([]));
  it('returns single chunk for short text', () => {
    const chunks = sliceTextIntoChunks('short text', 100, 20);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe('short text');
  });
  it('creates overlapping chunks for long text', () => {
    const text = 'a'.repeat(250);
    const chunks = sliceTextIntoChunks(text, 100, 20);
    expect(chunks.length).toBeGreaterThan(1);
    // Each chunk should be at most chunkSize in length
    chunks.forEach(c => expect(c.length).toBeLessThanOrEqual(100));
  });
  it('uses default chunk size and overlap', () => {
    const text = 'x'.repeat(2500);
    const chunks = sliceTextIntoChunks(text);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach(c => expect(c.length).toBeLessThanOrEqual(1000));
  });
});

describe('similaritySearch', () => {
  const chunks = [
    { text: 'chunk A', embedding: [1, 0, 0] },
    { text: 'chunk B', embedding: [0, 1, 0] },
    { text: 'chunk C', embedding: [0, 0, 1] },
    { text: 'chunk D', embedding: [0.5, 0.5, 0] },
  ];

  it('returns top-K most similar chunks', () => {
    const result = similaritySearch([1, 0, 0], chunks, 2);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('chunk A');
  });

  it('ranks by dot product similarity', () => {
    const result = similaritySearch([0, 1, 0], chunks, 1);
    expect(result[0].text).toBe('chunk B');
  });

  it('returns all chunks if topK >= length', () => {
    const result = similaritySearch([1, 1, 1], chunks, 10);
    expect(result).toHaveLength(4);
  });
});

describe('getRepresentativeChunks', () => {
  it('returns all items when count <= maxCount', () => {
    const items = [1, 2, 3];
    expect(getRepresentativeChunks(items, 5)).toEqual([1, 2, 3]);
  });

  it('returns exactly maxCount items when array is larger', () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    const result = getRepresentativeChunks(items, 4);
    expect(result).toHaveLength(4);
  });

  it('samples evenly across the array', () => {
    const items = Array.from({ length: 10 }, (_, i) => i);
    const result = getRepresentativeChunks(items, 5);
    // Should pick indices 0, 2, 4, 6, 8
    expect(result).toEqual([0, 2, 4, 6, 8]);
  });

  it('handles maxCount of 1', () => {
    const items = [10, 20, 30, 40, 50];
    const result = getRepresentativeChunks(items, 1);
    expect(result).toEqual([10]);
  });
});
