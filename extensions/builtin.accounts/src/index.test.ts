import { WORKBENCH_AUTH_CAPABILITY_ID, type WorkbenchAuthProvider } from '@workbench-kit/platform';
import type { CommandServiceHandler } from '@workbench-kit/platform';
import type { ExtensionContext } from '@workbench-kit/workbench-extension-sdk';
import { describe, expect, it } from 'vitest';

import { activate, MANAGE_ACCOUNTS_COMMAND_ID } from './index.js';

describe('builtin accounts extension', () => {
  it('reports whether the host exposes the standard auth capability', async () => {
    const handlers = new Map<string, CommandServiceHandler>();
    const authProvider = {
      id: 'test-auth',
      label: 'Test Auth',
      getSessions: () => [],
      signIn: () => ({
        accountId: 'account',
        id: 'session',
        providerId: 'test-auth',
        scopes: [],
      }),
      signOut: () => undefined,
    } satisfies WorkbenchAuthProvider;

    activate({
      capabilities: {
        registerProvider: () => ({ dispose() {} }),
      },
      commands: {
        registerCommand: (commandId, handler) => {
          handlers.set(commandId, handler);
          return { dispose() {} };
        },
      },
      editorHostFactories: {
        registerFactory: () => ({ dispose() {} }),
      },
      extensionId: 'workbench-kit.builtin.accounts',
      extensionPath: 'extensions/builtin.accounts',
      getCapability: <T>(capabilityId: string) =>
        (capabilityId === WORKBENCH_AUTH_CAPABILITY_ID ? authProvider : undefined) as T | undefined,
      subscriptions: {
        add() {},
      },
      viewHostFactories: {
        registerFactory: () => ({ dispose() {} }),
      },
      views: {
        registerViewProvider: () => ({ dispose() {} }),
      },
    } satisfies ExtensionContext);

    expect(handlers.get(MANAGE_ACCOUNTS_COMMAND_ID)?.()).toEqual({
      authCapabilityAvailable: true,
    });
  });
});
