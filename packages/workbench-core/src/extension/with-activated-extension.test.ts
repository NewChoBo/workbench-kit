import { describe, expect, it } from 'vitest';

import type { WorkbenchExtensionDescription } from './registry.js';
import { withActivatedExtension } from './with-activated-extension.js';

const fixtureExtension: WorkbenchExtensionDescription = {
  manifest: {
    schemaVersion: 1,
    id: 'workbench-kit.samples.harness-fixture',
    name: 'samples-harness-fixture',
    displayName: 'Harness Fixture',
    version: '0.0.0',
    publisher: 'workbench-kit',
    engines: {
      workbench: '^0.0.0',
      extensionApi: '^0.0.0',
    },
    activationEvents: ['onCommand:workbench-kit.samples.harness-fixture.ping'],
    contributes: {
      commands: [
        {
          command: 'workbench-kit.samples.harness-fixture.ping',
          title: 'Harness: Ping',
        },
      ],
    },
  },
  module: {
    activate: (context) => {
      context.commands.registerCommand('workbench-kit.samples.harness-fixture.ping', () => 'pong');
    },
  },
};

describe('withActivatedExtension', () => {
  it('activates the extension and exposes an isolated registry', async () => {
    await withActivatedExtension(fixtureExtension, async ({ registry, extensionId, activated }) => {
      expect(extensionId).toBe('workbench-kit.samples.harness-fixture');
      expect(activated.extensionId).toBe(extensionId);
      expect(registry.isActive(extensionId)).toBe(true);
      expect(await registry.executeCommand('workbench-kit.samples.harness-fixture.ping')).toBe(
        'pong',
      );
    });
  });

  it('surfaces activation errors and still disposes the registry', async () => {
    await expect(
      withActivatedExtension(
        {
          ...fixtureExtension,
          module: {
            activate: () => {
              throw new Error('activation failed');
            },
          },
        },
        async () => {
          throw new Error('run should not execute');
        },
      ),
    ).rejects.toThrow('activation failed');
  });
});
