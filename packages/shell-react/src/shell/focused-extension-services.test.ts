import { describe, expect, it, vi } from 'vitest';
import { WORKBENCH_SETTINGS_CAPABILITY_ID } from '@workbench-kit/workbench-core';

import {
  createWorkbenchExtensionActivationStateReader,
  createWorkbenchExtensionCatalogReader,
  createWorkbenchSettingsCapabilityPublisher,
} from './focused-extension-services.js';

describe('focused extension services', () => {
  it('observes activation and deactivation through one read-only listener', () => {
    const activationListeners = new Set<() => void>();
    const deactivationListeners = new Set<() => void>();
    const reader = createWorkbenchExtensionActivationStateReader({
      activateView: async () => [],
      getActiveExtensions: () => [{ extensionId: 'sample.active', internal: true }],
      onDidActivateExtension: (listener) => {
        activationListeners.add(listener);
        return { dispose: () => activationListeners.delete(listener) };
      },
      onDidDeactivateExtension: (listener) => {
        deactivationListeners.add(listener);
        return { dispose: () => deactivationListeners.delete(listener) };
      },
    });
    const listener = vi.fn();

    const subscription = reader.onDidChangeActiveExtensions(listener);
    activationListeners.forEach((notify) => notify());
    deactivationListeners.forEach((notify) => notify());

    expect(listener).toHaveBeenCalledTimes(2);
    expect(reader.getActiveExtensions()).toEqual([{ extensionId: 'sample.active' }]);

    subscription.dispose();
    activationListeners.forEach((notify) => notify());
    deactivationListeners.forEach((notify) => notify());
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('preserves the complete capability provider id projection', () => {
    const providerIds = ['host.editor', 'extension.sample', 'host.settings'];
    const reader = createWorkbenchExtensionCatalogReader({
      capabilityRegistry: { listProviderIds: () => providerIds },
      getDependencyDiagnostics: () => [],
      getExtension: () => undefined,
      getExtensions: () => [],
      getFeatureInspections: () => [],
      getFeatureSpecs: () => [],
    });

    expect(reader.listCapabilityProviderIds()).toEqual(providerIds);
  });

  it('does not take ownership of a pre-existing settings capability', () => {
    const register = vi.fn();
    const publisher = createWorkbenchSettingsCapabilityPublisher({
      has: (id) => id === WORKBENCH_SETTINGS_CAPABILITY_ID,
      register,
    });

    expect(publisher.publishSettingsCapability({ openSettings() {} })).toEqual({
      kind: 'already-registered',
    });
    expect(register).not.toHaveBeenCalled();
  });

  it('owns and disposes only the settings capability registration it creates', () => {
    let registered = false;
    const dispose = vi.fn(() => {
      registered = false;
    });
    const publisher = createWorkbenchSettingsCapabilityPublisher({
      has: () => registered,
      register: ({ id }) => {
        expect(id).toBe(WORKBENCH_SETTINGS_CAPABILITY_ID);
        registered = true;
        return { dispose };
      },
    });

    const publication = publisher.publishSettingsCapability({ openSettings() {} });
    expect(publication.kind).toBe('registered');
    if (publication.kind === 'registered') {
      publication.disposable.dispose();
    }
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(registered).toBe(false);
  });

  it('treats a registration-time collision as non-owned', () => {
    let registered = false;
    const publisher = createWorkbenchSettingsCapabilityPublisher({
      has: () => registered,
      register: () => {
        registered = true;
        throw new Error('duplicate capability');
      },
    });

    expect(publisher.publishSettingsCapability({ openSettings() {} })).toEqual({
      kind: 'already-registered',
    });
  });

  it('surfaces registration failures that did not create a capability', () => {
    const failure = new Error('storage unavailable');
    const publisher = createWorkbenchSettingsCapabilityPublisher({
      has: () => false,
      register: () => {
        throw failure;
      },
    });

    expect(() => publisher.publishSettingsCapability({ openSettings() {} })).toThrow(failure);
  });
});
