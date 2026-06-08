import { resolveRecordValue } from './asset-content.js';
import type { AuthoringAssetRecord } from './asset-types.js';

const ASSET_SRC_PREFIX = 'asset:';

export function toAssetSrc(assetId: string): string {
  return `${ASSET_SRC_PREFIX}${assetId}`;
}

export function parseAssetSrc(src: string): string | null {
  if (!src.startsWith(ASSET_SRC_PREFIX)) return null;
  const assetId = src.slice(ASSET_SRC_PREFIX.length).trim();
  return assetId.length > 0 ? assetId : null;
}

export function createAssetResolver(
  resolveRecord: (assetId: string) => AuthoringAssetRecord | null,
): (src: string) => string {
  return (src) => {
    const assetId = parseAssetSrc(src);
    if (!assetId) return src;
    const record = resolveRecord(assetId);
    if (!record) return src;
    return resolveRecordValue(record);
  };
}
