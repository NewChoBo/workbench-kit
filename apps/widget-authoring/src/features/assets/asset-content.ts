import {
  COLOR_ASSET_PREFIX,
  type AuthoringAssetRecord,
  type AuthoringAssetType,
} from './asset-types.js';

const SVG_ROOT_PATTERN = /<svg[\s>]/i;

export function isValidAssetRecord(record: unknown): record is AuthoringAssetRecord {
  if (!record || typeof record !== 'object') return false;
  const candidate = record as AuthoringAssetRecord;
  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.dataUrl === 'string' &&
    candidate.dataUrl.length > 0 &&
    typeof candidate.name === 'string' &&
    typeof candidate.type === 'string' &&
    typeof candidate.mimeType === 'string' &&
    typeof candidate.createdAt === 'number'
  );
}

export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

export function toColorAssetDataUrl(color: string): string {
  const normalized = normalizeHexColor(color);
  if (!normalized) {
    throw new Error('Enter a valid hex color (for example #3b82f6).');
  }
  return `${COLOR_ASSET_PREFIX}${normalized}`;
}

export function parseColorAssetDataUrl(dataUrl: string): string | null {
  if (!dataUrl.startsWith(COLOR_ASSET_PREFIX)) return null;
  return normalizeHexColor(dataUrl.slice(COLOR_ASSET_PREFIX.length));
}

export function normalizeSvgMarkup(svg: string): string {
  const trimmed = svg.trim();
  if (!SVG_ROOT_PATTERN.test(trimmed)) {
    throw new Error('SVG must include an <svg> root element.');
  }
  return trimmed;
}

export function svgToDataUrl(svg: string): string {
  const normalized = normalizeSvgMarkup(svg);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(normalized)}`;
}

export function resolveAssetContent(record: AuthoringAssetRecord): {
  previewUrl: string | null;
  resolvedValue: string;
} {
  if (record.type === 'color') {
    const color = parseColorAssetDataUrl(record.dataUrl) ?? '#000000';
    return { previewUrl: null, resolvedValue: color };
  }

  return {
    previewUrl: record.dataUrl,
    resolvedValue: record.dataUrl,
  };
}

export function resolveRecordValue(record: AuthoringAssetRecord): string {
  if (record.type === 'color') {
    return parseColorAssetDataUrl(record.dataUrl) ?? record.dataUrl;
  }
  return record.dataUrl;
}

export function defaultMimeTypeForAsset(type: AuthoringAssetType): string {
  switch (type) {
    case 'image':
      return 'image/png';
    case 'icon':
      return 'image/svg+xml';
    case 'color':
      return 'application/x-authoring-color';
    default:
      return 'application/octet-stream';
  }
}

export function canDragAssetToCanvas(type: AuthoringAssetType): boolean {
  return type === 'image' || type === 'icon' || type === 'color';
}

export function dragAssetType(type: AuthoringAssetType): 'image' | 'icon' | null {
  if (type === 'image') return 'image';
  if (type === 'icon') return 'icon';
  return null;
}
