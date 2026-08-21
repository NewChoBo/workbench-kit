import {
  loadInstalledExtensionsResult,
  saveInstalledExtensionsResult,
  type ExtensionRegistry,
  type InstalledExtensionRecord,
  type WorkbenchExtensionDescription,
  type WorkbenchPersistenceDiagnosticHandler,
  type WorkbenchStorageAdapter,
} from '@workbench-kit/workbench-core';

import type { ThemeSelectionProtectionSnapshot } from './theme-selection-protection.js';

interface DisposableLike {
  dispose(): void;
}

export interface ExtensionRegistrationLifetime extends DisposableLike {
  add<T extends DisposableLike>(disposable: T): T;
  getRegistration(extensionId: string): DisposableLike | undefined;
}

export type ExtensionEnablementTransitionResult =
  | {
      readonly enabled: boolean;
      readonly extensionId: string;
      readonly kind: 'applied';
      readonly message: string;
    }
  | {
      readonly enabled: boolean;
      readonly extensionId: string;
      readonly kind: 'reloadRequired';
      readonly message: string;
    }
  | {
      readonly enabled: boolean;
      readonly extensionId: string;
      readonly kind: 'failed';
      readonly message: string;
    };

export interface ExtensionEnablementControllerOptions {
  readonly availableExtensions: readonly WorkbenchExtensionDescription[];
  readonly initialEnabledExtensions: readonly WorkbenchExtensionDescription[];
  readonly initialInstalledRecords: readonly InstalledExtensionRecord[];
  readonly installedExtensionsStorage?: WorkbenchStorageAdapter | undefined;
  readonly installedExtensionsStorageKey: string;
  readonly integrityAcceptedExtensionIds: ReadonlySet<string>;
  readonly onPersistenceDiagnostic?: WorkbenchPersistenceDiagnosticHandler | undefined;
  readonly registrationLifetime: ExtensionRegistrationLifetime;
  readonly registry: ExtensionRegistry;
}

/** Provider-owned live installed/enabled state for the narrow theme lifecycle. */
export class ExtensionEnablementController implements DisposableLike {
  private readonly availableExtensionsById: ReadonlyMap<string, WorkbenchExtensionDescription>;
  private readonly integrityAcceptedExtensionIds: ReadonlySet<string>;
  private readonly listeners = new Set<() => void>();
  private readonly onPersistenceDiagnostic: WorkbenchPersistenceDiagnosticHandler | undefined;
  private readonly registrationHandles = new Map<string, DisposableLike>();
  private readonly registrationLifetime: ExtensionRegistrationLifetime;
  private readonly registry: ExtensionRegistry;
  private readonly storage: WorkbenchStorageAdapter | undefined;
  private readonly storageKey: string;
  private installedRecords: readonly InstalledExtensionRecord[];
  private themeSelectionProtection: ThemeSelectionProtectionSnapshot | undefined;
  private disposed = false;

  constructor({
    availableExtensions,
    initialEnabledExtensions,
    initialInstalledRecords,
    installedExtensionsStorage,
    installedExtensionsStorageKey,
    integrityAcceptedExtensionIds,
    onPersistenceDiagnostic,
    registrationLifetime,
    registry,
  }: ExtensionEnablementControllerOptions) {
    this.availableExtensionsById = new Map(
      availableExtensions.map((description) => [description.manifest.id, description]),
    );
    this.installedRecords = [...initialInstalledRecords];
    this.integrityAcceptedExtensionIds = integrityAcceptedExtensionIds;
    this.onPersistenceDiagnostic = onPersistenceDiagnostic;
    this.registrationLifetime = registrationLifetime;
    this.registry = registry;
    this.storage = installedExtensionsStorage;
    this.storageKey = installedExtensionsStorageKey;

    for (const description of initialEnabledExtensions) {
      const extensionId = description.manifest.id;
      const registration = registrationLifetime.getRegistration(extensionId);
      if (registration) {
        this.registrationHandles.set(extensionId, registration);
      }
    }
  }

  getInstalledRecordsSnapshot = (): readonly InstalledExtensionRecord[] => this.installedRecords;

  subscribeInstalledRecords = (listener: () => void): (() => void) => {
    if (this.disposed) {
      return () => undefined;
    }
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  setThemeSelectionProtection(snapshot: ThemeSelectionProtectionSnapshot | undefined): void {
    this.themeSelectionProtection =
      snapshot?.kind === 'known'
        ? { ...snapshot, protectedThemeIds: [...snapshot.protectedThemeIds] }
        : snapshot;
  }

  commitInstalledRecords(
    records: readonly InstalledExtensionRecord[],
    extensionId: string,
  ): ExtensionEnablementTransitionResult {
    const persistence = this.persist(records);
    if (!persistence) {
      return this.failed(extensionId, this.isRecordEnabled(extensionId));
    }

    this.publishInstalledRecords(records);
    return this.reloadRequired(extensionId, this.isRecordEnabled(extensionId));
  }

  uninstallInstalledExtension(
    extensionId: string,
  ): ExtensionEnablementTransitionResult | undefined {
    const persisted = loadInstalledExtensionsResult(this.storageKey, this.storage, {
      onDiagnostic: this.onPersistenceDiagnostic,
    });
    if (persisted.diagnostic) {
      return this.failed(extensionId, this.isRecordEnabled(extensionId));
    }
    const target = persisted.value.find((record) => record.id === extensionId);
    if (!target || extensionId.startsWith('workbench-kit.builtin.')) {
      return undefined;
    }

    const next = persisted.value.filter((record) => record.id !== extensionId);
    if (!this.persist(next)) {
      return this.failed(extensionId, target.enabled);
    }

    this.publishInstalledRecords(next);
    return this.reloadRequired(extensionId, false);
  }

  toggleInstalledExtension(
    extensionId: string,
    enabled: boolean,
  ): ExtensionEnablementTransitionResult {
    const current = this.installedRecords.find((record) => record.id === extensionId);
    if (!current || extensionId.startsWith('workbench-kit.builtin.')) {
      return this.failed(extensionId, current?.enabled ?? false);
    }
    if (current.enabled === enabled) {
      return {
        enabled,
        extensionId,
        kind: 'applied',
        message: 'The extension is already in the requested state.',
      };
    }

    const next = this.installedRecords.map((record) =>
      record.id === extensionId ? { ...record, enabled } : record,
    );
    const eligibility = this.getSoftThemeEligibility(extensionId, enabled);
    if (!eligibility.eligible) {
      if (eligibility.kind === 'failed') {
        return this.failed(extensionId, current.enabled);
      }
      if (!eligibility.commitRequestedState) {
        return this.reloadRequired(extensionId, current.enabled);
      }
      if (!this.persist(next)) {
        return this.failed(extensionId, current.enabled);
      }
      this.publishInstalledRecords(next);
      return this.reloadRequired(extensionId, enabled);
    }

    return enabled
      ? this.enableThemeExtension(eligibility.description, next)
      : this.disableThemeExtension(eligibility.description, next);
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.listeners.clear();
    this.registrationHandles.clear();
    this.registrationLifetime.dispose();
  }

  private enableThemeExtension(
    description: WorkbenchExtensionDescription,
    nextRecords: readonly InstalledExtensionRecord[],
  ): ExtensionEnablementTransitionResult {
    const extensionId = description.manifest.id;
    let registration: DisposableLike;
    try {
      registration = this.registry.registerExtension(description);
      this.registrationLifetime.add(registration);
      if (!this.areThemesVisible(description)) {
        registration.dispose();
        return this.failed(extensionId, false);
      }
    } catch {
      return this.failed(extensionId, false);
    }

    if (!this.persist(nextRecords)) {
      try {
        registration.dispose();
      } catch {
        // The failed transition below never publishes the requested enabled state.
      }
      return this.failed(extensionId, false);
    }

    this.registrationHandles.set(extensionId, registration);
    this.publishInstalledRecords(nextRecords);
    return {
      enabled: true,
      extensionId,
      kind: 'applied',
      message: 'Applied without reloading the workbench.',
    };
  }

  private disableThemeExtension(
    description: WorkbenchExtensionDescription,
    nextRecords: readonly InstalledExtensionRecord[],
  ): ExtensionEnablementTransitionResult {
    const extensionId = description.manifest.id;
    const registration = this.registrationHandles.get(extensionId);
    if (!registration) {
      return this.reloadRequired(extensionId, false);
    }

    this.registrationHandles.delete(extensionId);
    try {
      registration.dispose();
    } catch {
      this.restoreRegistration(description, registration);
      return this.failed(extensionId, true);
    }
    if (this.areThemesVisible(description)) {
      this.restoreRegistration(description, registration);
      return this.failed(extensionId, true);
    }

    if (!this.persist(nextRecords)) {
      this.restoreRegistration(description);
      return this.failed(extensionId, true);
    }

    this.publishInstalledRecords(nextRecords);
    return {
      enabled: false,
      extensionId,
      kind: 'applied',
      message: 'Applied without reloading the workbench.',
    };
  }

  private restoreRegistration(
    description: WorkbenchExtensionDescription,
    existingRegistration?: DisposableLike,
  ): void {
    const extensionId = description.manifest.id;
    if (this.registry.getExtension(extensionId) && this.areThemesVisible(description)) {
      if (existingRegistration) {
        this.registrationHandles.set(extensionId, existingRegistration);
      }
      return;
    }

    try {
      const restored = this.registry.registerExtension(description);
      this.registrationLifetime.add(restored);
      this.registrationHandles.set(extensionId, restored);
    } catch {
      // A failed compensation is still surfaced as `failed`; no success is claimed.
    }
  }

  private getSoftThemeEligibility(
    extensionId: string,
    enabled: boolean,
  ):
    | { readonly eligible: true; readonly description: WorkbenchExtensionDescription }
    | {
        readonly commitRequestedState: boolean;
        readonly eligible: false;
        readonly kind: 'failed' | 'reloadRequired';
      } {
    const description = this.availableExtensionsById.get(extensionId);
    if (!description) {
      return { commitRequestedState: true, eligible: false, kind: 'reloadRequired' };
    }
    if (!this.integrityAcceptedExtensionIds.has(extensionId)) {
      return { commitRequestedState: false, eligible: false, kind: 'failed' };
    }
    if (!isThemeOnlyDeclarativeExtension(description)) {
      return { commitRequestedState: true, eligible: false, kind: 'reloadRequired' };
    }

    const selectionProtection = this.themeSelectionProtection;
    if (
      selectionProtection?.kind !== 'known' ||
      selectionProtection.themeRegistryRevision !== this.registry.themes.getRevision()
    ) {
      return { commitRequestedState: false, eligible: false, kind: 'reloadRequired' };
    }

    const protectedThemeIds = new Set(selectionProtection.protectedThemeIds);

    const themes = description.manifest.contributes?.themes ?? [];
    if (themes.some((theme) => protectedThemeIds.has(theme.id))) {
      return { commitRequestedState: true, eligible: false, kind: 'reloadRequired' };
    }

    const registeredHardDependent = [...this.registrationHandles.keys()].some((candidateId) => {
      if (candidateId === extensionId) {
        return false;
      }
      return this.availableExtensionsById
        .get(candidateId)
        ?.manifest.extensionDependencies?.includes(extensionId);
    });
    if (registeredHardDependent) {
      return { commitRequestedState: true, eligible: false, kind: 'reloadRequired' };
    }

    const hasRegistration = this.registrationHandles.has(extensionId);
    if ((enabled && hasRegistration) || (!enabled && !hasRegistration)) {
      return { commitRequestedState: true, eligible: false, kind: 'reloadRequired' };
    }

    return { eligible: true, description };
  }

  private areThemesVisible(description: WorkbenchExtensionDescription): boolean {
    return (description.manifest.contributes?.themes ?? []).every(
      (theme) => this.registry.themes.getTheme(theme.id)?.extensionId === description.manifest.id,
    );
  }

  private persist(records: readonly InstalledExtensionRecord[]): boolean {
    return saveInstalledExtensionsResult(records, this.storageKey, this.storage, {
      onDiagnostic: this.onPersistenceDiagnostic,
    }).committed;
  }

  private publishInstalledRecords(records: readonly InstalledExtensionRecord[]): void {
    this.installedRecords = [...records];
    for (const listener of [...this.listeners]) {
      listener();
    }
  }

  private isRecordEnabled(extensionId: string): boolean {
    return this.installedRecords.find((record) => record.id === extensionId)?.enabled ?? false;
  }

  private reloadRequired(
    extensionId: string,
    enabled: boolean,
  ): ExtensionEnablementTransitionResult {
    return {
      enabled,
      extensionId,
      kind: 'reloadRequired',
      message: 'Reload required to finish applying this extension change.',
    };
  }

  private failed(extensionId: string, enabled: boolean): ExtensionEnablementTransitionResult {
    return {
      enabled,
      extensionId,
      kind: 'failed',
      message: 'The extension change failed. The previous state was retained.',
    };
  }
}

function isThemeOnlyDeclarativeExtension(description: WorkbenchExtensionDescription): boolean {
  const contributes = description.manifest.contributes;
  if (!contributes?.themes?.length || description.module !== undefined) {
    return false;
  }
  if (
    (description.manifest.capabilities?.provides?.length ?? 0) > 0 ||
    (description.manifest.capabilities?.requires?.length ?? 0) > 0 ||
    (description.manifest.extensionDependencies?.length ?? 0) > 0
  ) {
    return false;
  }

  return Object.entries(contributes).every(([key, value]) => {
    if (key === 'themes') {
      return Array.isArray(value) && value.length > 0;
    }
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    if (value && typeof value === 'object') {
      return Object.keys(value).length === 0;
    }
    return value === undefined;
  });
}
