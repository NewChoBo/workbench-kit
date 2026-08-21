import {
  DisposableStore,
  Emitter,
  isDisposable,
  type Disposable,
  type Event,
} from '@workbench-kit/base';

import type { DeactivateFunction } from '@workbench-kit/workbench-extension-sdk';
import type { ExtensionApiFactory } from './api-factory.js';
import type { ExtensionInventory, RegisteredExtension } from './inventory.js';
import type { ActivatedExtension, ExtensionLifecycleEvent } from './registry.js';

interface PendingActivation {
  readonly epoch: number;
  readonly promise: Promise<ActivatedExtension>;
  readonly registration: RegisteredExtension;
  readonly subscriptions: DisposableStore;
}

interface ActiveExtension {
  readonly deactivate?: DeactivateFunction;
  readonly epoch: number;
  readonly extensionId: string;
  readonly subscriptions: DisposableStore;
}

interface DeactivatingExtension {
  readonly barrier: Promise<void>;
  readonly epoch: number;
  readonly operation: Promise<void>;
}

interface ActivationFailure {
  readonly epoch: number;
  readonly error: unknown;
  readonly registration: RegisteredExtension;
}

class ActivationSubscriptionStore extends DisposableStore {
  private readonly activationDisposables = new Set<Disposable>();
  private activationDisposed = false;

  override get isDisposed(): boolean {
    return this.activationDisposed;
  }

  override add<T extends Disposable>(disposable: T): T {
    if (this.activationDisposed) {
      disposable.dispose();
      return disposable;
    }

    this.activationDisposables.add(disposable);
    return disposable;
  }

  override clear(): void {
    if (this.activationDisposed) {
      return;
    }
    this.disposeActivationItems();
  }

  override dispose(): void {
    if (this.activationDisposed) {
      return;
    }

    this.activationDisposed = true;
    this.disposeActivationItems();
  }

  private disposeActivationItems(): void {
    let firstError: unknown;
    let hasError = false;
    const disposables = [...this.activationDisposables].reverse();
    this.activationDisposables.clear();

    for (const disposable of disposables) {
      try {
        disposable.dispose();
      } catch (error) {
        if (!hasError) {
          firstError = error;
          hasError = true;
        }
      }
    }

    if (hasError) {
      throw firstError;
    }
  }
}

export class ExtensionActivationService implements Disposable {
  private readonly activeExtensions = new Map<string, ActiveExtension>();
  private readonly activatingExtensions = new Map<string, PendingActivation>();
  private readonly activationFailures = new Map<string, ActivationFailure>();
  private readonly deactivatingExtensions = new Map<string, DeactivatingExtension>();
  private readonly lifecycleListenerFailures = new Map<'activation' | 'deactivation', unknown>();
  private readonly lifecycleEpochs = new Map<string, number>();
  private readonly onDidActivateExtensionEmitter = new Emitter<ExtensionLifecycleEvent>();
  private readonly onDidDeactivateExtensionEmitter = new Emitter<ExtensionLifecycleEvent>();
  private readonly teardownFailures = new Map<string, unknown>();
  private closed = false;

  readonly onDidActivateExtension: Event<ExtensionLifecycleEvent>;
  readonly onDidDeactivateExtension: Event<ExtensionLifecycleEvent>;

  constructor(
    private readonly inventory: ExtensionInventory,
    private readonly apiFactory: ExtensionApiFactory,
  ) {
    this.onDidActivateExtension = this.createGuardedLifecycleEvent(
      'activation',
      this.onDidActivateExtensionEmitter,
    );
    this.onDidDeactivateExtension = this.createGuardedLifecycleEvent(
      'deactivation',
      this.onDidDeactivateExtensionEmitter,
    );
  }

  getActiveExtensions(): readonly ActivatedExtension[] {
    return [...this.activeExtensions.values()].map(({ extensionId, subscriptions }) => ({
      extensionId,
      subscriptions,
    }));
  }

  isActive(extensionId: string): boolean {
    return this.activeExtensions.has(extensionId);
  }

  getActivationFailure(extensionId: string): unknown | undefined {
    return this.activationFailures.get(extensionId)?.error;
  }

  getTeardownFailure(extensionId: string): unknown | undefined {
    return this.teardownFailures.get(extensionId);
  }

  async activateByEvent(activationEvent: string): Promise<readonly ActivatedExtension[]> {
    const activated: ActivatedExtension[] = [];
    for (const description of this.inventory.list()) {
      if (!description.manifest.activationEvents.includes(activationEvent)) {
        continue;
      }

      activated.push(await this.activate(description.manifest.id));
    }

    return activated;
  }

  async activate(extensionId: string): Promise<ActivatedExtension> {
    this.assertOpen(extensionId);
    const teardown = this.deactivatingExtensions.get(extensionId);
    if (teardown) {
      await teardown.barrier;
    }
    this.assertOpen(extensionId);

    const active = this.activeExtensions.get(extensionId);
    if (active) {
      return {
        extensionId,
        subscriptions: active.subscriptions,
      };
    }

    const registration = this.inventory.getRegistration(extensionId);
    if (!registration) {
      throw new Error(`Extension "${extensionId}" is not registered.`);
    }

    const pending = this.activatingExtensions.get(extensionId);
    if (pending?.registration === registration) {
      return pending.promise;
    }

    const epoch = (this.lifecycleEpochs.get(extensionId) ?? 0) + 1;
    this.lifecycleEpochs.set(extensionId, epoch);

    let resolveActivation: (extension: ActivatedExtension) => void = () => undefined;
    let rejectActivation: (error: unknown) => void = () => undefined;
    const activation = new Promise<ActivatedExtension>((resolve, reject) => {
      resolveActivation = resolve;
      rejectActivation = reject;
    });
    const pendingActivation: PendingActivation = {
      epoch,
      promise: activation,
      registration,
      subscriptions: new ActivationSubscriptionStore(),
    };
    this.activatingExtensions.set(extensionId, pendingActivation);

    void this.doActivate(extensionId, pendingActivation).then(
      (activatedExtension) => {
        if (this.activatingExtensions.get(extensionId) === pendingActivation) {
          this.activatingExtensions.delete(extensionId);
        }
        resolveActivation(activatedExtension);
      },
      (error: unknown) => {
        if (this.activatingExtensions.get(extensionId) === pendingActivation) {
          this.activatingExtensions.delete(extensionId);
        }
        rejectActivation(error);
      },
    );

    return activation;
  }

  async deactivate(extensionId: string): Promise<void> {
    const deactivating = this.deactivatingExtensions.get(extensionId);
    if (deactivating) {
      return deactivating.operation;
    }

    const pending = this.activatingExtensions.get(extensionId);
    if (pending) {
      try {
        await pending.promise;
      } catch {
        return;
      }

      const deactivatingAfterActivation = this.deactivatingExtensions.get(extensionId);
      if (deactivatingAfterActivation) {
        return deactivatingAfterActivation.operation;
      }

      const activeAfterActivation = this.activeExtensions.get(extensionId);
      if (!activeAfterActivation) {
        return;
      }
      return this.startTeardown(activeAfterActivation);
    }

    const active = this.activeExtensions.get(extensionId);
    if (!active) {
      return;
    }

    return this.startTeardown(active);
  }

  async deactivateAll(): Promise<void> {
    const extensionIds = [
      ...new Set([
        ...this.activeExtensions.keys(),
        ...this.activatingExtensions.keys(),
        ...this.deactivatingExtensions.keys(),
      ]),
    ].reverse();
    let firstError: unknown;
    for (const extensionId of extensionIds) {
      try {
        await this.deactivate(extensionId);
      } catch (error) {
        firstError ??= error;
      }
    }

    if (firstError !== undefined) {
      throw firstError;
    }
  }

  invalidateRegistration(extensionId: string, registration: RegisteredExtension): void {
    registration.invalidated = true;
    const pendingActivation = this.activatingExtensions.get(extensionId);
    if (pendingActivation?.registration === registration) {
      try {
        pendingActivation.subscriptions.dispose();
      } catch (error) {
        this.activationFailures.set(extensionId, {
          epoch: pendingActivation.epoch,
          error,
          registration,
        });
      } finally {
        this.activatingExtensions.delete(extensionId);
      }
    }
  }

  dispose(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;
    for (const registration of this.inventory.listRegistrations()) {
      this.invalidateRegistration(registration.description.manifest.id, registration);
    }

    this.onDidActivateExtensionEmitter.dispose();
    this.onDidDeactivateExtensionEmitter.dispose();

    void this.deactivateAll().catch(() => undefined);
  }

  private async doActivate(
    extensionId: string,
    pendingActivation: PendingActivation,
  ): Promise<ActivatedExtension> {
    const { epoch, registration, subscriptions } = pendingActivation;
    try {
      this.assertCurrentRegistration(extensionId, registration);

      for (const dependencyId of registration.description.manifest.extensionDependencies ?? []) {
        await this.activate(dependencyId);
        this.assertCurrentRegistration(extensionId, registration);
      }

      this.assertCurrentRegistration(extensionId, registration);
      const context = this.apiFactory.createContext(registration.description, subscriptions);
      const activationResult = await registration.description.module?.activate?.(context);
      if (isDisposable(activationResult)) {
        subscriptions.add(activationResult);
      }

      this.assertCurrentRegistration(extensionId, registration);
      if (this.lifecycleEpochs.get(extensionId) !== epoch) {
        throw new Error(`Extension "${extensionId}" activation was invalidated.`);
      }

      this.activeExtensions.set(extensionId, {
        deactivate: registration.description.module?.deactivate,
        epoch,
        extensionId,
        subscriptions,
      });
      this.activationFailures.delete(extensionId);
      this.onDidActivateExtensionEmitter.fire({ extensionId });

      return { extensionId, subscriptions };
    } catch (error) {
      if (
        this.lifecycleEpochs.get(extensionId) === epoch &&
        this.inventory.getRegistration(extensionId) === registration
      ) {
        this.activationFailures.set(extensionId, { epoch, error, registration });
      }
      try {
        subscriptions.dispose();
      } catch {
        // Preserve the activation error after exhaustively disposing the failed scope.
      }
      throw error;
    }
  }

  private startTeardown(active: ActiveExtension): Promise<void> {
    const existing = this.deactivatingExtensions.get(active.extensionId);
    if (existing?.epoch === active.epoch) {
      return existing.operation;
    }

    this.activeExtensions.delete(active.extensionId);

    let releaseBarrier: () => void = () => undefined;
    const barrier = new Promise<void>((resolve) => {
      releaseBarrier = resolve;
    });
    let resolveOperation: () => void = () => undefined;
    let rejectOperation: (error: unknown) => void = () => undefined;
    const operation = new Promise<void>((resolve, reject) => {
      resolveOperation = resolve;
      rejectOperation = reject;
    });
    const deactivating: DeactivatingExtension = {
      barrier,
      epoch: active.epoch,
      operation,
    };
    this.deactivatingExtensions.set(active.extensionId, deactivating);

    void this.runTeardown(active, deactivating)
      .then(resolveOperation, rejectOperation)
      .finally(() => {
        if (this.deactivatingExtensions.get(active.extensionId) === deactivating) {
          this.deactivatingExtensions.delete(active.extensionId);
        }
        releaseBarrier();
      });

    return operation;
  }

  private async runTeardown(
    active: ActiveExtension,
    deactivating: DeactivatingExtension,
  ): Promise<void> {
    let operationError: unknown;
    let hasOperationError = false;
    try {
      await active.deactivate?.();
    } catch (error) {
      operationError = error;
      hasOperationError = true;
    }

    try {
      active.subscriptions.dispose();
    } catch (error) {
      if (!hasOperationError) {
        operationError = error;
        hasOperationError = true;
      }
    }

    if (this.deactivatingExtensions.get(active.extensionId) === deactivating) {
      this.onDidDeactivateExtensionEmitter.fire({ extensionId: active.extensionId });
    }

    if (hasOperationError) {
      this.teardownFailures.set(active.extensionId, operationError);
      throw operationError;
    }
    this.teardownFailures.delete(active.extensionId);
  }

  private createGuardedLifecycleEvent(
    kind: 'activation' | 'deactivation',
    emitter: Emitter<ExtensionLifecycleEvent>,
  ): Event<ExtensionLifecycleEvent> {
    return (listener, thisArgs) =>
      emitter.event((event) => {
        try {
          listener.call(thisArgs, event);
        } catch (error) {
          this.lifecycleListenerFailures.set(kind, error);
        }
      });
  }

  private assertOpen(extensionId: string): void {
    if (this.closed) {
      throw new Error(`Extension "${extensionId}" activation was invalidated.`);
    }
  }

  private assertCurrentRegistration(extensionId: string, registration: RegisteredExtension): void {
    if (
      this.closed ||
      registration.invalidated ||
      this.inventory.getRegistration(extensionId) !== registration
    ) {
      throw new Error(`Extension "${extensionId}" activation was invalidated.`);
    }
  }
}
