import { cloneAndFreezeDeclarativeSnapshot } from '../declarative-snapshot';
import type { DesignSystemPackContribution, UiDesignSystemState } from './types';

export class UnsupportedDesignSystemSnapshotValueError extends TypeError {
  readonly path: string;

  constructor(path: string, reason: string) {
    super(`Design System declarative value at ${path} ${reason}.`);
    this.name = 'UnsupportedDesignSystemSnapshotValueError';
    this.path = path;
  }
}

function cloneDesignSystemSnapshot<T>(value: T): T {
  return cloneAndFreezeDeclarativeSnapshot(
    value,
    (path, reason) => new UnsupportedDesignSystemSnapshotValueError(path, reason),
  );
}

export function snapshotDesignSystemPackContribution(
  contribution: DesignSystemPackContribution,
): DesignSystemPackContribution {
  return cloneDesignSystemSnapshot(contribution);
}

export function snapshotUiDesignSystemState(state: UiDesignSystemState): UiDesignSystemState {
  return cloneDesignSystemSnapshot(state);
}
