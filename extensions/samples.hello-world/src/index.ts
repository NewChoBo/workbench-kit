import type { ExtensionContext } from '@workbench-kit/workbench-extension-sdk';

export const EXTENSION_ID = 'workbench-kit.samples.hello-world' as const;

export function activate(context: ExtensionContext): void {
  context.commands.registerCommand('workbench-kit.samples.hello-world.sayHello', () => {
    return 'Hello from Workbench Kit';
  });
}
