import { createContext, useContext, type ReactNode } from 'react';

export interface QuickOpenFocusTarget {
  readonly groupId: string;
  readonly tabId: string;
  readonly resourceUri: string;
}

export interface QuickOpenFocusSnapshot {
  readonly identity: object;
  readonly origin: HTMLElement | null;
}

interface Registration {
  readonly owner: object;
  readonly target: QuickOpenFocusTarget;
  readonly element: HTMLElement;
  readonly identity: object;
}

interface Operation {
  readonly token: object;
  readonly snapshot: QuickOpenFocusSnapshot | undefined;
  target?: QuickOpenFocusTarget;
  dialog?: HTMLElement;
  acknowledged?: boolean;
}

export interface QuickOpenFocusCoordinator {
  resolveSuccessfulTarget(path: string, result: unknown): QuickOpenFocusTarget | undefined;
  beginSession(owner: object): object;
  beginSelection(session: object, snapshot: QuickOpenFocusSnapshot | undefined): object;
  recordSuccessfulExecution(operation: object, target: QuickOpenFocusTarget | undefined): boolean;
  acknowledgeClosed(operation: object, dialog: HTMLElement | undefined): void;
  registerCommittedTarget(
    owner: object,
    target: QuickOpenFocusTarget,
    element: HTMLElement,
  ): () => void;
  invalidate(ownerOrToken?: object): void;
  reset(): void;
}

export function createQuickOpenFocusCoordinator(options: {
  resolveSuccessfulTarget: (path: string, result: unknown) => QuickOpenFocusTarget | undefined;
  readActiveTarget: () => QuickOpenFocusTarget | undefined;
  subscribeActiveTargetChange: (listener: () => void) => () => void;
}): QuickOpenFocusCoordinator {
  let session: { owner: object; token: object } | undefined;
  let operation: Operation | undefined;
  const registrations = new Map<object, Registration>();
  let unsubscribe: (() => void) | undefined;
  let unsubscribeActive: (() => void) | undefined;
  const teardown = () => {
    unsubscribe?.();
    unsubscribe = undefined;
  };
  const isCurrent = (token: object) => operation?.token === token;
  const cancel = () => {
    operation = undefined;
    teardown();
  };
  const settle = () => {
    const current = operation;
    if (!current?.acknowledged || !current.target || !current.snapshot || !current.dialog) return;
    if (
      options.readActiveTarget()?.groupId !== current.target.groupId ||
      options.readActiveTarget()?.tabId !== current.target.tabId ||
      options.readActiveTarget()?.resourceUri !== current.target.resourceUri
    ) {
      cancel();
      return;
    }
    const origin = current.snapshot.origin;
    const active = document.activeElement;
    if (origin?.isConnected ? active !== origin : active !== document.body && active !== null) {
      cancel();
      return;
    }
    const matches = [...registrations.values()].filter(
      (entry) =>
        entry.target.groupId === current.target?.groupId &&
        entry.target.tabId === current.target?.tabId &&
        entry.target.resourceUri === current.target?.resourceUri &&
        entry.element.isConnected &&
        entry.element.getAttribute('role') === 'tab' &&
        entry.element.getAttribute('aria-selected') === 'true' &&
        entry.element.getAttribute('tabindex') === '0',
    );
    if (matches.length > 1) {
      cancel();
      return;
    }
    const destination = matches[0]?.element;
    if (!destination) return;
    cancel();
    destination.focus();
  };
  return {
    resolveSuccessfulTarget: options.resolveSuccessfulTarget,
    beginSession(owner) {
      cancel();
      const token = {};
      session = { owner, token };
      return token;
    },
    beginSelection(token, snapshot) {
      if (session?.token !== token) return {};
      cancel();
      operation = { token: {}, snapshot };
      return operation.token;
    },
    recordSuccessfulExecution(token, target) {
      if (!isCurrent(token)) return false;
      if (!target) {
        cancel();
        return false;
      }
      operation!.target = Object.freeze({ ...target });
      return true;
    },
    acknowledgeClosed(token, dialog) {
      if (!isCurrent(token) || !operation?.target || !dialog || !operation.snapshot) {
        if (isCurrent(token)) cancel();
        return;
      }
      const origin = operation.snapshot.origin;
      const active = document.activeElement;
      if (origin?.isConnected ? active !== origin : active !== document.body && active !== null) {
        cancel();
        return;
      }
      operation.dialog = dialog;
      operation.acknowledged = true;
      const onInput = (event: Event) => {
        if (event.type === 'focusin' && event.target === origin) return;
        cancel();
      };
      document.addEventListener('pointerdown', onInput, true);
      document.addEventListener('keydown', onInput, true);
      document.addEventListener('focusin', onInput, true);
      unsubscribe = () => {
        document.removeEventListener('pointerdown', onInput, true);
        document.removeEventListener('keydown', onInput, true);
        document.removeEventListener('focusin', onInput, true);
      };
      unsubscribeActive = options.subscribeActiveTargetChange(() => settle());
      const old = unsubscribe;
      unsubscribe = () => {
        old?.();
        unsubscribeActive?.();
        unsubscribeActive = undefined;
      };
      queueMicrotask(settle);
    },
    registerCommittedTarget(owner, target, element) {
      const identity = {};
      registrations.set(owner, { owner, target: Object.freeze({ ...target }), element, identity });
      queueMicrotask(settle);
      return () => {
        if (registrations.get(owner)?.identity === identity) registrations.delete(owner);
      };
    },
    invalidate(ownerOrToken) {
      if (
        ownerOrToken &&
        (session?.owner === ownerOrToken ||
          session?.token === ownerOrToken ||
          operation?.token === ownerOrToken)
      ) {
        cancel();
        if (session?.owner === ownerOrToken || session?.token === ownerOrToken) session = undefined;
      }
    },
    reset() {
      cancel();
      session = undefined;
    },
  };
}

const QuickOpenFocusContext = createContext<QuickOpenFocusCoordinator | undefined>(undefined);
export function QuickOpenFocusProvider({
  value,
  children,
}: {
  value: QuickOpenFocusCoordinator;
  children: ReactNode;
}) {
  return <QuickOpenFocusContext.Provider value={value}>{children}</QuickOpenFocusContext.Provider>;
}
export function useQuickOpenFocusCoordinator() {
  return useContext(QuickOpenFocusContext);
}
