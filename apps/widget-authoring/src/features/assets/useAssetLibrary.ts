import { useCallback, useEffect, useMemo, useState } from 'react';

import { resolveAssetContent } from './asset-content.js';
import { createAssetResolver } from './asset-reference.js';
import {
  createAsset,
  deleteAssetRecord,
  duplicateAsset,
  importImageFile,
  importImageFromDataUrl,
  loadAllAssets,
  toAssetSummary,
  updateAsset,
} from './asset-storage.js';
import type {
  AssetCreateInput,
  AssetUpdateInput,
  AuthoringAsset,
  AuthoringAssetRecord,
} from './asset-types.js';

export interface UseAssetLibraryResult {
  assets: AuthoringAsset[];
  error: string | null;
  createAssetEntry: (input: AssetCreateInput) => Promise<AuthoringAsset>;
  duplicateAssetEntry: (assetId: string) => Promise<AuthoringAsset>;
  getDataUrl: (assetId: string) => string | null;
  getRecord: (assetId: string) => AuthoringAssetRecord | null;
  importImage: (file: File) => Promise<AuthoringAsset>;
  importImageFromClipboard: (dataUrl: string, name?: string) => Promise<AuthoringAsset>;
  isLoading: boolean;
  removeAsset: (assetId: string) => Promise<void>;
  resolveAssetSrc: (src: string) => string;
  updateAssetEntry: (assetId: string, input: AssetUpdateInput) => Promise<AuthoringAsset>;
}

export function useAssetLibrary(): UseAssetLibraryResult {
  const [records, setRecords] = useState<AuthoringAssetRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const next = await loadAllAssets();
      setRecords(next);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load assets');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const recordById = useMemo(
    () => new Map(records.map((record) => [record.id, record])),
    [records],
  );

  const getRecord = useCallback((assetId: string) => recordById.get(assetId) ?? null, [recordById]);

  const getDataUrl = useCallback(
    (assetId: string) => {
      const record = recordById.get(assetId);
      if (!record) return null;
      return resolveAssetContent(record).previewUrl;
    },
    [recordById],
  );

  const resolveAssetSrc = useMemo(
    () => createAssetResolver((assetId) => getRecord(assetId)),
    [getRecord],
  );

  const upsertRecord = useCallback((record: AuthoringAssetRecord) => {
    setRecords((current) => [record, ...current.filter((item) => item.id !== record.id)]);
  }, []);

  const importImage = useCallback(
    async (file: File) => {
      const record = await importImageFile(file);
      upsertRecord(record);
      return toAssetSummary(record);
    },
    [upsertRecord],
  );

  const importImageFromClipboard = useCallback(
    async (dataUrl: string, name = 'Pasted image') => {
      const record = await importImageFromDataUrl(dataUrl, name);
      upsertRecord(record);
      return toAssetSummary(record);
    },
    [upsertRecord],
  );

  const createAssetEntry = useCallback(
    async (input: AssetCreateInput) => {
      const record = await createAsset(input);
      upsertRecord(record);
      return toAssetSummary(record);
    },
    [upsertRecord],
  );

  const updateAssetEntry = useCallback(
    async (assetId: string, input: AssetUpdateInput) => {
      const record = await updateAsset(assetId, input);
      upsertRecord(record);
      return toAssetSummary(record);
    },
    [upsertRecord],
  );

  const duplicateAssetEntry = useCallback(
    async (assetId: string) => {
      const record = await duplicateAsset(assetId);
      upsertRecord(record);
      return toAssetSummary(record);
    },
    [upsertRecord],
  );

  const removeAsset = useCallback(async (assetId: string) => {
    await deleteAssetRecord(assetId);
    setRecords((current) => current.filter((record) => record.id !== assetId));
  }, []);

  const assets = useMemo(() => records.map(toAssetSummary), [records]);

  return {
    assets,
    createAssetEntry,
    duplicateAssetEntry,
    error,
    getDataUrl,
    getRecord,
    importImage,
    importImageFromClipboard,
    isLoading,
    removeAsset,
    resolveAssetSrc,
    updateAssetEntry,
  };
}
