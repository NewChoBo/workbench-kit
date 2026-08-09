import { describe, expect, it, vi } from 'vitest';

import { ContextKeyService } from './context-key-service.js';

describe('ContextKeyService', () => {
  it('exposes a monotonic revision for effective context changes', () => {
    const service = new ContextKeyService();
    const onDidChangeContext = vi.fn();
    service.onDidChangeContext(onDidChangeContext);

    expect(service.getRevision()).toBe(0);

    service.set('workbench.test.enabled', true);
    expect(service.getRevision()).toBe(1);

    service.set('workbench.test.enabled', true);
    service.delete('workbench.test.missing');
    expect(service.getRevision()).toBe(1);

    service.set('workbench.test.enabled', false);
    service.delete('workbench.test.enabled');
    expect(service.getRevision()).toBe(3);
    expect(onDidChangeContext).toHaveBeenCalledTimes(3);

    service.dispose();
  });
});
