import {
  ExtensionRegistry,
  type ActivatedExtension,
  type WorkbenchExtensionDescription,
} from './registry.js';

/**
 * In-memory activation context for extension unit tests.
 * Isolated per call — does not share registries across tests.
 */
export interface ActivatedExtensionTestContext {
  readonly activated: ActivatedExtension;
  readonly extensionId: string;
  readonly registry: ExtensionRegistry;
}

/**
 * Registers and activates an extension against a fresh {@link ExtensionRegistry},
 * runs the test body, then deactivates and disposes. Activation errors propagate.
 */
export async function withActivatedExtension(
  description: WorkbenchExtensionDescription,
  run: (ctx: ActivatedExtensionTestContext) => void | Promise<void>,
): Promise<void> {
  const registry = new ExtensionRegistry();
  const registration = registry.registerExtension(description);

  try {
    const extensionId = description.manifest.id;
    const activated = await registry.activateExtension(extensionId);
    await run({ activated, extensionId, registry });
  } finally {
    await registry.deactivateAll();
    registration.dispose();
    registry.dispose();
  }
}
