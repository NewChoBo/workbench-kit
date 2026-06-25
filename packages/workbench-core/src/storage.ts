export interface WorkbenchStorageReader {
  getItem(key: string): string | null;
}

export interface WorkbenchStorageWriter {
  setItem(key: string, value: string): void;
}

export interface WorkbenchStorageRemover {
  removeItem(key: string): void;
}

export type WorkbenchStorageAdapter = WorkbenchStorageReader & WorkbenchStorageWriter;

export type WorkbenchRemovableStorageAdapter = WorkbenchStorageAdapter & WorkbenchStorageRemover;
