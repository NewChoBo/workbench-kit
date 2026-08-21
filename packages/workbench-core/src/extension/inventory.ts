import { toDisposable, type Disposable } from '@workbench-kit/base';

import type { WorkbenchExtensionDescription } from './registry.js';

export interface RegisteredExtension {
  readonly description: WorkbenchExtensionDescription;
  invalidated: boolean;
}

export class ExtensionInventory implements Disposable {
  private readonly registrations = new Map<string, RegisteredExtension>();

  get(extensionId: string): WorkbenchExtensionDescription | undefined {
    return this.registrations.get(extensionId)?.description;
  }

  getRegistration(extensionId: string): RegisteredExtension | undefined {
    return this.registrations.get(extensionId);
  }

  list(): readonly WorkbenchExtensionDescription[] {
    return [...this.registrations.values()].map(({ description }) => description);
  }

  listRegistrations(): readonly RegisteredExtension[] {
    return [...this.registrations.values()];
  }

  register(description: WorkbenchExtensionDescription): Disposable {
    const { id } = description.manifest;
    if (this.registrations.has(id)) {
      throw new Error(`Extension "${id}" is already registered.`);
    }

    const registration: RegisteredExtension = { description, invalidated: false };
    this.registrations.set(id, registration);

    return toDisposable(() => {
      if (this.registrations.get(id) !== registration) {
        return;
      }

      registration.invalidated = true;
      this.registrations.delete(id);
    });
  }

  dispose(): void {
    for (const registration of this.registrations.values()) {
      registration.invalidated = true;
    }
    this.registrations.clear();
  }
}
