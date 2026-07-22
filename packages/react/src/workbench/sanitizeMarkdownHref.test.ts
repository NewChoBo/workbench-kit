import { describe, expect, it } from 'vitest';

import { sanitizeMarkdownHref } from './sanitizeMarkdownHref';

describe('sanitizeMarkdownHref', () => {
  it('allows http(s), mailto, and in-document hash links', () => {
    expect(sanitizeMarkdownHref('https://example.com/docs')).toBe('https://example.com/docs');
    expect(sanitizeMarkdownHref('http://example.com')).toBe('http://example.com');
    expect(sanitizeMarkdownHref('mailto:dev@example.com')).toBe('mailto:dev@example.com');
    expect(sanitizeMarkdownHref('#section')).toBe('#section');
  });

  it('blocks javascript, data, and vbscript schemes', () => {
    expect(sanitizeMarkdownHref('javascript:alert(1)')).toBeUndefined();
    expect(sanitizeMarkdownHref('JavaScript:alert(1)')).toBeUndefined();
    expect(sanitizeMarkdownHref('data:text/html,<script>alert(1)</script>')).toBeUndefined();
    expect(sanitizeMarkdownHref('vbscript:msgbox(1)')).toBeUndefined();
  });

  it('returns undefined for empty and malformed values', () => {
    expect(sanitizeMarkdownHref(undefined)).toBeUndefined();
    expect(sanitizeMarkdownHref('')).toBeUndefined();
    expect(sanitizeMarkdownHref('   ')).toBeUndefined();
  });
});
