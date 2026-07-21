import { describe, expect, it } from 'vitest';

import { CapabilityRegistry } from './capability-registry.js';

describe('CapabilityRegistry', () => {
  it('registers providers and resolves values', () => {
    const registry = new CapabilityRegistry();
    let disposed = false;

    registry.register({
      id: 'workbench.auth',
      get: () => ({ id: 'auth-provider' }),
      dispose: () => {
        disposed = true;
      },
    });

    expect(registry.has('workbench.auth')).toBe(true);
    expect(registry.get<{ id: string }>('workbench.auth')).toEqual({ id: 'auth-provider' });
    expect(registry.get('missing')).toBeUndefined();
    expect(disposed).toBe(false);
  });

  it('hard-fails duplicate capability IDs', () => {
    const registry = new CapabilityRegistry();
    registry.registerValue('workbench.auth', { id: 'first' });

    expect(() => registry.registerValue('workbench.auth', { id: 'second' })).toThrow(
      'Capability "workbench.auth" is already registered.',
    );
  });

  it('disposes providers when registration is disposed', () => {
    const registry = new CapabilityRegistry();
    let disposed = false;

    const registration = registry.register({
      id: 'workbench.workspace',
      get: () => ({ ready: true }),
      dispose: () => {
        disposed = true;
      },
    });

    registration.dispose();

    expect(disposed).toBe(true);
    expect(registry.has('workbench.workspace')).toBe(false);
  });

  it('lists registered provider ids', () => {
    const registry = new CapabilityRegistry();
    registry.registerValue('workbench.auth', { id: 'seeded-auth' });
    registry.registerValue('workbench.workspace', { ready: true });

    expect(registry.listProviderIds()).toEqual(['workbench.auth', 'workbench.workspace']);
  });

  it('disposes all providers when the registry is disposed', () => {
    const registry = new CapabilityRegistry();
    const disposed: string[] = [];

    registry.register({
      id: 'first',
      get: () => 'first',
      dispose: () => disposed.push('first'),
    });
    registry.register({
      id: 'second',
      get: () => 'second',
      dispose: () => disposed.push('second'),
    });

    registry.dispose();

    expect(disposed).toEqual(['second', 'first']);
    expect(registry.has('first')).toBe(false);
    expect(registry.has('second')).toBe(false);
  });
});
