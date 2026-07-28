import { describe, expect, it, vi } from 'vitest';

import { activate, EXTENSION_ID, PANEL_OUTPUT_VIEW_ID } from './index.js';

describe('samples.panel-output', () => {
  it('registers the panel Output view provider on activate', () => {
    const registerViewProvider = vi.fn();

    activate({
      extensionId: EXTENSION_ID,
      views: { registerViewProvider },
    } as never);

    expect(registerViewProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        viewId: PANEL_OUTPUT_VIEW_ID,
      }),
    );

    const provider = registerViewProvider.mock.calls[0]?.[0] as {
      resolveViewHost: () => { render: () => string; title: string };
    };
    const host = provider.resolveViewHost();
    expect(host.title).toBe('Output');
    expect(host.render()).toContain('Sample Output');
  });
});
