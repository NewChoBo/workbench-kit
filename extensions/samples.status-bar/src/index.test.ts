import { describe, expect, it, vi } from 'vitest';

import {
  EXTENSION_ID,
  SAMPLE_PROBLEMS_VIEW_ID,
  SAMPLE_STATUS_BAR_PING_COMMAND,
  activate,
} from './index.js';

describe('samples.status-bar', () => {
  it('registers the problems view provider and ping command on activate', () => {
    const registerCommand = vi.fn();
    const registerViewProvider = vi.fn();

    activate({
      extensionId: EXTENSION_ID,
      commands: { registerCommand },
      views: { registerViewProvider },
    } as never);

    expect(registerCommand).toHaveBeenCalledWith(
      SAMPLE_STATUS_BAR_PING_COMMAND,
      expect.any(Function),
    );
    expect(registerViewProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        viewId: SAMPLE_PROBLEMS_VIEW_ID,
      }),
    );

    const provider = registerViewProvider.mock.calls[0]?.[0] as {
      resolveViewHost: () => { render: () => string; title: string };
    };
    const host = provider.resolveViewHost();
    expect(host.title).toBe('Problems');
    expect(host.render()).toContain('contributes.panels');

    const ping = registerCommand.mock.calls[0]?.[1] as () => string;
    expect(ping()).toBe('Status bar sample ping');
  });
});
