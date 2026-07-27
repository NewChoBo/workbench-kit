import {
  withActivatedExtension,
  type WorkbenchExtensionDescription,
} from '@workbench-kit/workbench-core';
import { describe, expect, it } from 'vitest';

import * as helloWorld from './index.js';

const description: WorkbenchExtensionDescription = {
  manifest: {
    schemaVersion: 1,
    id: 'workbench-kit.samples.hello-world',
    name: 'samples-hello-world',
    displayName: 'Hello World Sample',
    version: '0.0.0',
    publisher: 'workbench-kit',
    engines: {
      workbench: '^0.0.0',
      extensionApi: '^0.0.0',
    },
    activationEvents: ['onCommand:workbench-kit.samples.hello-world.sayHello'],
    contributes: {
      commands: [
        {
          command: 'workbench-kit.samples.hello-world.sayHello',
          title: 'Hello World: Say Hello',
        },
      ],
    },
  },
  module: helloWorld,
};

describe('samples.hello-world', () => {
  it('activates through the in-memory harness and registers sayHello', async () => {
    await withActivatedExtension(description, async ({ registry, extensionId }) => {
      expect(extensionId).toBe('workbench-kit.samples.hello-world');
      expect(registry.isActive(extensionId)).toBe(true);
      await expect(
        registry.executeCommand('workbench-kit.samples.hello-world.sayHello'),
      ).resolves.toBe('Hello from Workbench Kit');
    });
  });
});
