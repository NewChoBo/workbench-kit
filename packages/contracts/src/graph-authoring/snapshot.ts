import { cloneAndFreezeDeclarativeSnapshot } from '../declarative-snapshot';

export class UnsupportedNodeTypeSnapshotValueError extends TypeError {
  readonly path: string;

  constructor(path: string, reason: string) {
    super(`Node type descriptor value at ${path} ${reason}.`);
    this.name = 'UnsupportedNodeTypeSnapshotValueError';
    this.path = path;
  }
}

export function cloneAndFreezeNodeTypeSnapshot<T>(value: T): T {
  return cloneAndFreezeDeclarativeSnapshot(
    value,
    (path, reason) => new UnsupportedNodeTypeSnapshotValueError(path, reason),
  );
}
