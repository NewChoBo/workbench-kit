import { describe, expect, it } from 'vitest';

import {
  ExtensionNotAllowlistedError,
  assertExtensionAllowlisted,
  isExtensionAllowlisted,
} from './enterprise-allowlist.js';

describe('enterprise extension allowlist', () => {
  it('is inactive when allowedExtensionIds is omitted', () => {
    expect(isExtensionAllowlisted('ext.any', {})).toBe(true);
    expect(() => assertExtensionAllowlisted('ext.any', {})).not.toThrow();
  });

  it('denies all when the allowlist is empty', () => {
    const policy = { allowedExtensionIds: [] as const };
    expect(isExtensionAllowlisted('ext.a', policy)).toBe(false);
    expect(() => assertExtensionAllowlisted('ext.a', policy)).toThrow(ExtensionNotAllowlistedError);
  });

  it('allows only listed ids', () => {
    const policy = { allowedExtensionIds: ['ext.a', 'ext.b'] };
    expect(isExtensionAllowlisted('ext.a', policy)).toBe(true);
    expect(isExtensionAllowlisted('ext.c', policy)).toBe(false);
  });
});
