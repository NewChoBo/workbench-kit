import { describe, expect, it } from 'vitest';

import { createMemorySecretStorage } from './memory-secret-storage.js';

describe('createMemorySecretStorage', () => {
  it('isolates keys by extension id', () => {
    const secrets = createMemorySecretStorage();
    const alpha = secrets.forExtension('ext.alpha');
    const beta = secrets.forExtension('ext.beta');

    alpha.set('token', 'alpha-secret');
    beta.set('token', 'beta-secret');

    expect(alpha.get('token')).toBe('alpha-secret');
    expect(beta.get('token')).toBe('beta-secret');
  });

  it('deletes keys within a namespace', () => {
    const secrets = createMemorySecretStorage();
    const ns = secrets.forExtension('ext.demo');
    ns.set('session', 'abc');
    ns.delete('session');
    expect(ns.get('session')).toBeUndefined();
  });

  it('rejects empty extension ids', () => {
    const secrets = createMemorySecretStorage();
    expect(() => secrets.forExtension('   ')).toThrow(/extension id/i);
  });
});
