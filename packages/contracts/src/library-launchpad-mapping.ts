export type LaunchTarget = 'url' | 'app' | 'file' | 'folder' | null;
export type LaunchpadDataBindingSyncMode = 'snapshot' | 'live';

export interface LaunchpadLibraryItemSummary {
  accountLabel?: string | null;
  category?: string | null;
  connectionId?: string | null;
  connectionLabel?: string | null;
  favorite?: boolean | null;
  iconAssetId?: string | null;
  installState?: string | null;
  isOwned?: boolean | null;
  itemId?: string | null;
  id?: string | null;
  kind?: string | null;
  lastPlayedAt?: string | null;
  library?: string | null;
  launchTarget?: string | null;
  metadataSummary?: string | null;
  platform?: string | null;
  playCount?: number | null;
  playtimeMinutes?: number | null;
  providerId?: string | null;
  providerLabel?: string | null;
  provenanceSummary?: string | null;
  releaseYear?: number | null;
  source?: string | null;
  sourcePath?: string | null;
  tags?: readonly string[] | null;
  thumbnailUrl?: string | null;
  title?: string;
  displayName?: string;
  updatedAt?: string | null;
}

export interface LaunchpadLibraryReferencePayload {
  accountLabel: string | null;
  category: string | null;
  connectionId: string | null;
  connectionLabel: string | null;
  favorite: boolean | null;
  iconAssetId: string | null;
  installState: string | null;
  isOwned: boolean | null;
  itemId: string;
  kind: string;
  lastPlayedAt: string | null;
  library: string | null;
  metadataSummary: string;
  platform: string | null;
  playCount: number | null;
  playtimeMinutes: number | null;
  providerId: string;
  providerLabel: string;
  provenanceSummary: string;
  releaseYear: number | null;
  source: string | null;
  sourcePath: string | null;
  tags: readonly string[];
  thumbnailUrl: string | null;
  updatedAt: string;
}

export interface LaunchpadLibraryExecution {
  arguments: readonly string[];
  launchType: LaunchTarget;
  target: string | null;
  workingDirectory: string | null;
}

export interface LaunchpadLibraryItemMapping {
  canLaunch: boolean;
  execution: LaunchpadLibraryExecution;
  reference: LaunchpadLibraryReferencePayload;
  subtitle: string | null;
}

export interface LaunchpadLibraryArtworkBinding {
  materialization: 'managed-asset' | 'external-reference' | 'none';
  preferredAssetId: string | null;
  remoteUrl: string | null;
}

export interface LaunchpadLibraryItemBinding {
  version: 1;
  projection: 'launch-tile';
  source: {
    kind: 'library-item';
    itemId: string;
    providerId: string;
    connectionId: string | null;
    syncMode: LaunchpadDataBindingSyncMode;
    snapshotUpdatedAt: string | null;
  };
  artwork: LaunchpadLibraryArtworkBinding;
}

export function normalizeLaunchTarget(target: string | null | undefined): string | null {
  if (target === null || target === undefined) {
    return null;
  }
  const normalizedTarget = target.trim();
  return normalizedTarget.length > 0 ? normalizedTarget : null;
}

export function inferLaunchTypeFromTarget(target: string | null | undefined): LaunchTarget {
  const normalizedTarget = normalizeLaunchTarget(target);
  if (normalizedTarget === null) {
    return null;
  }
  if (isSchemeUrlTarget(normalizedTarget)) {
    return 'url';
  }
  if (/\.(exe|bat|cmd|com|lnk|msi|ps1|sh|appimage)$/i.test(normalizedTarget)) {
    return 'app';
  }
  if (/^[a-zA-Z]:[\\/]/.test(normalizedTarget) || normalizedTarget.startsWith('/')) {
    return looksLikeFilePath(normalizedTarget) ? 'file' : 'folder';
  }
  return 'app';
}

export function deriveLaunchWorkingDirectory(
  target: string | null | undefined,
  launchType: LaunchTarget,
): string | null {
  const normalizedTarget = normalizeLaunchTarget(target);
  if (normalizedTarget === null || launchType !== 'app') {
    return null;
  }
  const normalizedPath = normalizedTarget.replace(/\\/g, '/');
  const separatorIndex = normalizedPath.lastIndexOf('/');
  if (separatorIndex <= 0) {
    return null;
  }
  return normalizedPath.slice(0, separatorIndex);
}

export function resolveLaunchpadLibraryItemMapping(
  item: LaunchpadLibraryItemSummary,
): LaunchpadLibraryItemMapping {
  const target = normalizeLaunchTarget(item.launchTarget);
  const launchType = inferLaunchTypeFromTarget(target);
  return {
    canLaunch: target !== null,
    execution: {
      arguments: [],
      launchType,
      target,
      workingDirectory: deriveLaunchWorkingDirectory(target, launchType),
    },
    reference: {
      accountLabel: item.accountLabel ?? null,
      category: item.category ?? null,
      connectionId: item.connectionId ?? null,
      connectionLabel: item.connectionLabel ?? null,
      favorite: item.favorite ?? null,
      iconAssetId: item.iconAssetId ?? null,
      installState: item.installState ?? null,
      isOwned: item.isOwned ?? null,
      itemId: item.itemId ?? item.id ?? '',
      kind: item.kind ?? '',
      lastPlayedAt: item.lastPlayedAt ?? null,
      library: item.library ?? null,
      metadataSummary: item.metadataSummary ?? '',
      platform: item.platform ?? null,
      playCount: item.playCount ?? null,
      playtimeMinutes: item.playtimeMinutes ?? null,
      providerId: item.providerId ?? 'unknown',
      providerLabel: item.providerLabel ?? item.source ?? '',
      provenanceSummary: item.provenanceSummary ?? '',
      releaseYear: item.releaseYear ?? null,
      source: item.source ?? null,
      sourcePath: item.sourcePath ?? null,
      tags: item.tags ?? [],
      thumbnailUrl: item.thumbnailUrl ?? null,
      updatedAt: item.updatedAt ?? new Date(0).toISOString(),
    },
    subtitle: resolveLibraryItemTileSubtitle(item),
  };
}

export function createLaunchpadLibraryItemTileBinding(
  item: LaunchpadLibraryItemSummary,
  options: {
    syncMode?: LaunchpadDataBindingSyncMode;
  } = {},
): LaunchpadLibraryItemBinding {
  return {
    version: 1,
    projection: 'launch-tile',
    source: {
      kind: 'library-item',
      connectionId: item.connectionId ?? null,
      itemId: item.itemId ?? item.id ?? '',
      providerId: item.providerId ?? 'unknown',
      snapshotUpdatedAt: item.updatedAt ?? null,
      syncMode: options.syncMode ?? 'live',
    },
    artwork: createLaunchpadArtworkBinding({
      iconAssetId: item.iconAssetId ?? null,
      thumbnailUrl: item.thumbnailUrl ?? null,
    }),
  };
}

export function canMapLibraryItemToLaunchpadTile(item: LaunchpadLibraryItemSummary): boolean {
  return resolveLaunchpadLibraryItemMapping(item).canLaunch;
}

function resolveLibraryItemTileSubtitle(item: LaunchpadLibraryItemSummary): string | null {
  const fragments = [
    item.providerLabel ?? item.providerId,
    item.kind ?? null,
    item.platform ?? item.category ?? item.library ?? item.source,
  ];
  const uniqueFragments = Array.from(
    new Set(
      fragments.map((fragment) => fragment?.trim() ?? '').filter((fragment) => fragment.length > 0),
    ),
  );
  return uniqueFragments.length > 0 ? uniqueFragments.join(' · ') : null;
}

function createLaunchpadArtworkBinding(item: {
  iconAssetId: string | null;
  thumbnailUrl: string | null;
}): LaunchpadLibraryArtworkBinding {
  if (item.iconAssetId !== null) {
    return {
      materialization: 'managed-asset',
      preferredAssetId: item.iconAssetId,
      remoteUrl: item.thumbnailUrl,
    };
  }
  if (item.thumbnailUrl !== null) {
    return {
      materialization: 'external-reference',
      preferredAssetId: null,
      remoteUrl: item.thumbnailUrl,
    };
  }
  return {
    materialization: 'none',
    preferredAssetId: null,
    remoteUrl: null,
  };
}

function isSchemeUrlTarget(target: string): boolean {
  if (/^[a-zA-Z]:[\\/]/.test(target)) {
    return false;
  }
  return /^[a-z][a-z0-9+.-]*:/i.test(target);
}

function looksLikeFilePath(target: string): boolean {
  const normalizedTarget = target.replace(/\\/g, '/').replace(/\/+$/, '');
  const lastSegment = normalizedTarget.slice(normalizedTarget.lastIndexOf('/') + 1);
  return lastSegment.length > 0 && lastSegment.includes('.') && !lastSegment.endsWith('.');
}
