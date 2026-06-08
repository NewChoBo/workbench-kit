import {
  defaultMimeTypeForAsset,
  isValidAssetRecord,
  normalizeSvgMarkup,
  svgToDataUrl,
  toColorAssetDataUrl,
} from './asset-content.js';
import type {
  AssetCreateInput,
  AssetUpdateInput,
  AuthoringAsset,
  AuthoringAssetRecord,
} from './asset-types.js';

const DB_NAME = 'widget-authoring-assets';
const DB_VERSION = 1;
const STORE_NAME = 'assets';

function openAssetDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open asset database'));
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openAssetDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = run(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(request.error ?? new Error('Asset storage operation failed'));

        transaction.oncomplete = () => db.close();
        transaction.onerror = () =>
          reject(transaction.error ?? new Error('Asset transaction failed'));
      }),
  );
}

export async function loadAllAssets(): Promise<AuthoringAssetRecord[]> {
  const records = await runTransaction('readonly', (store) => store.getAll());
  return records.filter(isValidAssetRecord).sort((left, right) => right.createdAt - left.createdAt);
}

export async function saveAssetRecord(record: AuthoringAssetRecord): Promise<void> {
  await runTransaction('readwrite', (store) => store.put(record));
}

export async function deleteAssetRecord(assetId: string): Promise<void> {
  await runTransaction('readwrite', (store) => store.delete(assetId));
}

export async function getAssetRecord(assetId: string): Promise<AuthoringAssetRecord | null> {
  const record = await runTransaction('readonly', (store) => store.get(assetId));
  return isValidAssetRecord(record) ? record : null;
}

export function createAssetId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `asset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function importImageFile(file: File): Promise<AuthoringAssetRecord> {
  const dataUrl = await readFileAsDataUrl(file);
  const record: AuthoringAssetRecord = {
    id: createAssetId(),
    name: file.name.replace(/\.[^.]+$/, '') || file.name,
    type: 'image',
    mimeType: file.type || 'image/png',
    createdAt: Date.now(),
    dataUrl,
  };
  await saveAssetRecord(record);
  return record;
}

export async function importImageFromDataUrl(
  dataUrl: string,
  name: string,
): Promise<AuthoringAssetRecord> {
  const record: AuthoringAssetRecord = {
    id: createAssetId(),
    name: name.trim() || 'Pasted image',
    type: 'image',
    mimeType: inferImageMimeType(dataUrl),
    createdAt: Date.now(),
    dataUrl,
  };
  await saveAssetRecord(record);
  return record;
}

export async function createAsset(input: AssetCreateInput): Promise<AuthoringAssetRecord> {
  switch (input.type) {
    case 'image': {
      const dataUrl = await readFileAsDataUrl(input.file);
      const record: AuthoringAssetRecord = {
        id: createAssetId(),
        name: input.name.trim() || input.file.name.replace(/\.[^.]+$/, '') || 'Image',
        type: 'image',
        mimeType: input.file.type || inferImageMimeType(dataUrl),
        createdAt: Date.now(),
        dataUrl,
      };
      await saveAssetRecord(record);
      return record;
    }
    case 'icon': {
      normalizeSvgMarkup(input.svg);
      const record: AuthoringAssetRecord = {
        id: createAssetId(),
        name: input.name.trim() || 'SVG icon',
        type: 'icon',
        mimeType: 'image/svg+xml',
        createdAt: Date.now(),
        dataUrl: svgToDataUrl(input.svg),
      };
      await saveAssetRecord(record);
      return record;
    }
    case 'color': {
      const record: AuthoringAssetRecord = {
        id: createAssetId(),
        name: input.name.trim() || 'Color',
        type: 'color',
        mimeType: defaultMimeTypeForAsset('color'),
        createdAt: Date.now(),
        dataUrl: toColorAssetDataUrl(input.color),
      };
      await saveAssetRecord(record);
      return record;
    }
    default:
      throw new Error('Unsupported asset type');
  }
}

export async function updateAsset(
  assetId: string,
  input: AssetUpdateInput,
): Promise<AuthoringAssetRecord> {
  const existing = await getAssetRecord(assetId);
  if (!existing) {
    throw new Error('Asset not found');
  }

  const next: AuthoringAssetRecord = { ...existing };

  if (typeof input.name === 'string' && input.name.trim().length > 0) {
    next.name = input.name.trim();
  }

  if (existing.type === 'image' && 'file' in input && input.file) {
    next.dataUrl = await readFileAsDataUrl(input.file);
    next.mimeType = input.file.type || inferImageMimeType(next.dataUrl);
  }

  if (existing.type === 'icon' && 'svg' in input && typeof input.svg === 'string') {
    normalizeSvgMarkup(input.svg);
    next.dataUrl = svgToDataUrl(input.svg);
  }

  if (existing.type === 'color' && 'color' in input && typeof input.color === 'string') {
    next.dataUrl = toColorAssetDataUrl(input.color);
  }

  await saveAssetRecord(next);
  return next;
}

export async function duplicateAsset(assetId: string): Promise<AuthoringAssetRecord> {
  const existing = await getAssetRecord(assetId);
  if (!existing) {
    throw new Error('Asset not found');
  }

  const copy: AuthoringAssetRecord = {
    ...existing,
    id: createAssetId(),
    name: `${existing.name} copy`,
    createdAt: Date.now(),
  };
  await saveAssetRecord(copy);
  return copy;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Failed to read image file'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

function inferImageMimeType(dataUrl: string): string {
  const match = /^data:([^;]+);/i.exec(dataUrl);
  return match?.[1] || 'image/png';
}

export function toAssetSummary(record: AuthoringAssetRecord): AuthoringAsset {
  const { dataUrl: _dataUrl, ...summary } = record;
  return summary;
}
