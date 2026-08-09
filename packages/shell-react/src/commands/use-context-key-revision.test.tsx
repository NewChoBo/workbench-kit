/** @vitest-environment jsdom */

import { act, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { ContextKeyService } from '@workbench-kit/platform';

import { useContextKeyRevision } from './use-context-key-revision.js';

function ContextKeyRevisionProbe({ service }: { service: ContextKeyService }) {
  const revision = useContextKeyRevision(service);

  return <output data-testid="context-key-revision">{revision}</output>;
}

function LayoutEffectContextKeyWriter({ service }: { service: ContextKeyService }) {
  useLayoutEffect(() => {
    service.set('workbench.test.layoutEffect', true);
  }, [service]);

  return null;
}

describe('useContextKeyRevision', () => {
  it('observes a layout-effect change made before its store subscription settles', async () => {
    const service = new ContextKeyService();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <>
          <ContextKeyRevisionProbe service={service} />
          <LayoutEffectContextKeyWriter service={service} />
        </>,
      );
    });

    expect(container.querySelector('[data-testid="context-key-revision"]')?.textContent).toBe('1');

    await act(async () => {
      root.unmount();
    });
    container.remove();
    service.dispose();
  });
});
