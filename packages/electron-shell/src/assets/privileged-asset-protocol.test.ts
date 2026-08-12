import { describe, expect, it, vi } from 'vitest';

import { registerPrivilegedAssetProtocolScheme } from './privileged-asset-protocol.js';

describe('registerPrivilegedAssetProtocolScheme', () => {
  it('registers secure asset privileges with CORS disabled by default', () => {
    const registerSchemesAsPrivileged = vi.fn();

    registerPrivilegedAssetProtocolScheme({ registerSchemesAsPrivileged }, 'workbench-asset');

    expect(registerSchemesAsPrivileged).toHaveBeenCalledWith([
      {
        scheme: 'workbench-asset',
        privileges: {
          corsEnabled: false,
          secure: true,
          standard: true,
          stream: true,
          supportFetchAPI: true,
        },
      },
    ]);
  });

  it('enables CORS only by explicit opt-in', () => {
    const registerSchemesAsPrivileged = vi.fn();

    registerPrivilegedAssetProtocolScheme({ registerSchemesAsPrivileged }, 'workbench-asset', {
      corsEnabled: true,
    });

    expect(registerSchemesAsPrivileged.mock.calls[0]?.[0][0]?.privileges.corsEnabled).toBe(true);
  });
});
