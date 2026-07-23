import { describe, expect, it } from 'vitest';

import { sanitizeThemeTokenValue } from './sanitize-theme-token-value.js';

describe('sanitizeThemeTokenValue', () => {
  it('allows legitimate color and length tokens', () => {
    expect(sanitizeThemeTokenValue('#0a1628')).toBe('#0a1628');
    expect(sanitizeThemeTokenValue('#abc')).toBe('#abc');
    expect(sanitizeThemeTokenValue('rgb(10, 22, 40)')).toBe('rgb(10, 22, 40)');
    expect(sanitizeThemeTokenValue('rgba(10, 22, 40, 0.75)')).toBe('rgba(10, 22, 40, 0.75)');
    expect(sanitizeThemeTokenValue('hsl(210, 40%, 20%)')).toBe('hsl(210, 40%, 20%)');
    expect(sanitizeThemeTokenValue('transparent')).toBe('transparent');
    expect(sanitizeThemeTokenValue('4px')).toBe('4px');
    expect(sanitizeThemeTokenValue('0.5rem')).toBe('0.5rem');
  });

  it('rejects unsafe CSS injection values', () => {
    expect(sanitizeThemeTokenValue('url(https://evil.example/x.png)')).toBeNull();
    expect(sanitizeThemeTokenValue('expression(alert(1))')).toBeNull();
    expect(sanitizeThemeTokenValue('red; background: url(x)')).toBeNull();
    expect(sanitizeThemeTokenValue('javascript:alert(1)')).toBeNull();
    expect(sanitizeThemeTokenValue('data:text/css,body{}')).toBeNull();
    expect(sanitizeThemeTokenValue('var(--x)')).toBeNull();
    expect(sanitizeThemeTokenValue('')).toBeNull();
  });
});
