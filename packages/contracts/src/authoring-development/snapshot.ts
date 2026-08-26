import {
  snapshotStrictPortableData,
  StrictPortableDataError,
} from '../internal/strict-portable-data';

export class UnsupportedAuthoringDevelopmentSnapshotValueError extends TypeError {
  readonly path: string;

  constructor(path: string) {
    super('Authoring development data must contain only supported acyclic own plain data.');
    this.name = 'UnsupportedAuthoringDevelopmentSnapshotValueError';
    this.path = path;
  }
}

export function snapshotAuthoringDevelopmentValue<T>(value: T): T {
  try {
    return snapshotStrictPortableData(value);
  } catch (error) {
    if (error instanceof StrictPortableDataError) {
      throw new UnsupportedAuthoringDevelopmentSnapshotValueError(error.path);
    }
    throw error;
  }
}
