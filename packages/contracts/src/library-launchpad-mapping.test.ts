import { describe, expect, it } from 'vitest';

import {
  canMapLibraryItemToLaunchpadTile,
  createLaunchpadLibraryItemTileBinding,
  inferLaunchTypeFromTarget,
  isPlayableLaunchTarget,
  resolveLaunchpadLibraryItemMapping,
  resolveLibraryItemPlayExecution,
  normalizeLaunchTarget,
  type LaunchpadLibraryItemSummary,
  type LaunchpadLibraryItemBinding,
} from './library-launchpad-mapping';

describe('library-launchpad-mapping', () => {
  it('normalizes launch targets by trimming whitespace and nulling empty values', () => {
    expect(normalizeLaunchTarget('   ')).toBeNull();
    expect(normalizeLaunchTarget('  C:\\Program Files\\app.exe  ')).toBe(
      'C:\\Program Files\\app.exe',
    );
    expect(normalizeLaunchTarget(undefined)).toBeNull();
    expect(normalizeLaunchTarget(null)).toBeNull();
  });

  it('infers launch target types from mixed URL and path inputs', () => {
    expect(inferLaunchTypeFromTarget('https://example.com')).toBe('url');
    expect(inferLaunchTypeFromTarget('C:\\Games\\Game.exe')).toBe('app');
    expect(inferLaunchTypeFromTarget('/tmp/game.txt')).toBe('file');
    expect(inferLaunchTypeFromTarget('/tmp/folder')).toBe('folder');
    expect(inferLaunchTypeFromTarget('com.app://run')).toBe('url');
  });

  it('infers launch type and working directory from target', () => {
    const exeTarget = resolveLaunchpadLibraryItemMapping({
      title: 'Apex',
      launchTarget: 'C:/Games/Apex/apex.exe',
    });

    expect(exeTarget).toMatchObject({
      execution: {
        target: 'C:/Games/Apex/apex.exe',
        launchType: 'app',
        workingDirectory: 'C:/Games/Apex',
      },
    });

    const urlTarget = resolveLaunchpadLibraryItemMapping({
      title: 'Docs',
      launchTarget: 'https://example.com',
    });
    expect(urlTarget.execution.launchType).toBe('url');

    const folderTarget = resolveLaunchpadLibraryItemMapping({
      title: 'LocalFolder',
      launchTarget: 'D:/Games/Sandbox',
    });
    expect(folderTarget.execution).toMatchObject({
      launchType: 'folder',
      workingDirectory: null,
    });

    const fileLikeTarget = resolveLaunchpadLibraryItemMapping({
      title: 'LocalFile',
      launchTarget: 'D:/Games/Sandbox/config.ini',
    });
    expect(fileLikeTarget.execution).toMatchObject({
      launchType: 'file',
      workingDirectory: null,
    });

    const windowsPathLikeUrl = resolveLaunchpadLibraryItemMapping({
      title: 'NetworkDrive',
      launchTarget: 'C:/path/with:colon',
    });
    expect(windowsPathLikeUrl.execution.launchType).toBe('folder');
  });

  it('treats blank launch target as non-launchable and preserves reference metadata', () => {
    const item = {
      title: 'Metadata-only',
      launchTarget: '   ',
      accountLabel: 'my-account',
      kind: 'Game',
      metadataSummary: 'Store metadata only',
      tags: ['meta'],
      itemId: 'item-1',
      providerId: 'steam',
    } satisfies LaunchpadLibraryItemSummary;
    const unavailable = resolveLaunchpadLibraryItemMapping(item);

    expect(canMapLibraryItemToLaunchpadTile(item)).toBe(false);
    expect(unavailable.canLaunch).toBe(false);
    expect(unavailable.execution).toMatchObject({
      arguments: [],
      launchType: null,
      target: null,
      workingDirectory: null,
    });
    expect(unavailable.reference.itemId).toBe('item-1');
    expect(unavailable.reference.metadataSummary).toBe('Store metadata only');
  });

  it('normalizes subtitle fragments and avoids duplicate labels', () => {
    expect(
      resolveLaunchpadLibraryItemMapping({
        providerLabel: ' Steam ',
        title: 'Steam Game',
        kind: 'Game',
        platform: 'Game',
      }).subtitle,
    ).toBe('Steam · Game');
  });

  it('normalizes launch target with trim while preserving case', () => {
    const target = ' C:/Games/MyGame.APP.EXE ';
    expect(normalizeLaunchTarget(target)).toBe('C:/Games/MyGame.APP.EXE');

    const inferred = inferLaunchTypeFromTarget(target);
    expect(inferred).toBe('app');

    const resolved = resolveLaunchpadLibraryItemMapping({
      title: 'MyGame',
      launchTarget: target,
    });
    expect(resolved.execution.target).toBe('C:/Games/MyGame.APP.EXE');
    expect(resolved.execution.launchType).toBe('app');
    expect(resolved.execution.workingDirectory).toBe('C:/Games');
  });

  it('builds deterministic launch mappings with default values and stable subtitle', () => {
    const mapped = resolveLaunchpadLibraryItemMapping({
      accountLabel: 'me',
      category: 'Game',
      favorite: false,
      kind: 'steam-game',
      platform: 'Windows',
      providerId: 'steam',
      providerLabel: 'Steam',
      source: 'steam',
      itemId: 'steam:440',
      title: 'Team Fortress 2',
      launchTarget: 'C:\\Games\\tf2.exe',
      tags: ['action', 'fps'],
    });

    expect(mapped.canLaunch).toBe(true);
    expect(mapped.execution).toEqual({
      arguments: [],
      launchType: 'app',
      target: 'C:\\Games\\tf2.exe',
      workingDirectory: 'C:/Games',
    });
    expect(mapped.reference).toMatchObject({
      accountLabel: 'me',
      category: 'Game',
      favorite: false,
      itemId: 'steam:440',
      kind: 'steam-game',
      platform: 'Windows',
      providerId: 'steam',
      providerLabel: 'Steam',
      source: 'steam',
      sourcePath: null,
      tags: ['action', 'fps'],
      updatedAt: expect.any(String),
    });
    expect(mapped.subtitle).toBe('Steam · steam-game · Windows');
  });

  it('applies null-aware defaults for minimal library item payloads', () => {
    const mapped = resolveLaunchpadLibraryItemMapping({
      id: 'steam:100',
      title: 'No launch target',
      providerId: undefined,
      providerLabel: undefined,
      source: undefined,
    });

    expect(mapped.canLaunch).toBe(false);
    expect(mapped.execution).toEqual({
      arguments: [],
      launchType: null,
      target: null,
      workingDirectory: null,
    });
    expect(mapped.reference).toMatchObject({
      itemId: 'steam:100',
      kind: '',
      providerId: 'unknown',
      providerLabel: '',
      source: null,
      sourcePath: null,
      metadataSummary: '',
      thumbnailUrl: null,
      tags: [],
    });
    expect(mapped.reference.connectionId).toBeNull();
    expect(mapped.subtitle).toBeNull();
  });

  it('creates launch-tile binding payload for widget consumption', () => {
    const item = {
      itemId: 'binding-1',
      title: 'Bound Item',
      launchTarget: 'C:/Games/Bound/bound.exe',
      providerId: 'steam',
      iconAssetId: 'icon-1',
      thumbnailUrl: 'https://cdn.example/icon.png',
      connectionId: 'conn-1',
    } satisfies LaunchpadLibraryItemSummary;
    const binding: LaunchpadLibraryItemBinding = createLaunchpadLibraryItemTileBinding(item, {
      syncMode: 'snapshot',
    });

    expect(binding).toMatchObject({
      projection: 'launch-tile',
      source: {
        itemId: 'binding-1',
        providerId: 'steam',
        connectionId: 'conn-1',
        syncMode: 'snapshot',
      },
      artwork: {
        materialization: 'managed-asset',
        preferredAssetId: 'icon-1',
      },
    });
  });

  it('maps URL launchers to URL launch type directly', () => {
    const inferred = inferLaunchTypeFromTarget('custom://run/123');
    expect(inferred).toBe('url');
  });

  it('creates launchpad tile bindings with correct artwork materialization strategy', () => {
    expect(
      createLaunchpadLibraryItemTileBinding(
        {
          itemId: 'steam:10',
          providerId: 'steam',
          iconAssetId: 'asset://icon',
          thumbnailUrl: 'https://cdn/hero.png',
          launchTarget: 'https://app',
        },
        { syncMode: 'snapshot' },
      ),
    ).toEqual({
      version: 1,
      projection: 'launch-tile',
      source: {
        kind: 'library-item',
        itemId: 'steam:10',
        providerId: 'steam',
        connectionId: null,
        syncMode: 'snapshot',
        snapshotUpdatedAt: null,
      },
      artwork: {
        materialization: 'managed-asset',
        preferredAssetId: 'asset://icon',
        remoteUrl: 'https://cdn/hero.png',
      },
    });

    expect(
      createLaunchpadLibraryItemTileBinding({
        itemId: 'steam:20',
        providerId: 'steam',
        iconAssetId: null,
        thumbnailUrl: 'https://cdn/image.png',
        launchTarget: 'https://app',
      }),
    ).toEqual({
      version: 1,
      projection: 'launch-tile',
      source: {
        kind: 'library-item',
        itemId: 'steam:20',
        providerId: 'steam',
        connectionId: null,
        syncMode: 'live',
        snapshotUpdatedAt: null,
      },
      artwork: {
        materialization: 'external-reference',
        preferredAssetId: null,
        remoteUrl: 'https://cdn/image.png',
      },
    });

    expect(
      createLaunchpadLibraryItemTileBinding({
        itemId: 'steam:30',
        providerId: 'steam',
        launchTarget: 'https://app',
      }),
    ).toEqual({
      version: 1,
      projection: 'launch-tile',
      source: {
        kind: 'library-item',
        itemId: 'steam:30',
        providerId: 'steam',
        connectionId: null,
        syncMode: 'live',
        snapshotUpdatedAt: null,
      },
      artwork: {
        materialization: 'none',
        preferredAssetId: null,
        remoteUrl: null,
      },
    });
  });

  it('checks launchability by presence of a usable target', () => {
    expect(
      canMapLibraryItemToLaunchpadTile({
        itemId: 'steam:1000',
        providerId: 'steam',
        launchTarget: 'com.app://run/1000',
      }),
    ).toBe(true);

    expect(
      canMapLibraryItemToLaunchpadTile({
        itemId: 'steam:1001',
        providerId: 'steam',
      }),
    ).toBe(false);
  });

  it('prefers steam protocol fallback targets over folder-only launch targets', () => {
    const execution = resolveLibraryItemPlayExecution(
      {
        title: 'DemonHand',
        launchTarget: 'E:\\SteamLibrary\\steamapps\\common\\DemonHand\\UnityCrashHandler64.exe',
      },
      ['steam://rungameid/3264850'],
    );

    expect(execution).toMatchObject({
      launchType: 'url',
      target: 'steam://rungameid/3264850',
    });
  });

  it('treats folder launch targets as non-playable', () => {
    expect(isPlayableLaunchTarget('C:\\Games\\Folder')).toBe(false);
    expect(
      resolveLaunchpadLibraryItemMapping({
        title: 'Folder',
        launchTarget: 'C:\\Games\\Folder',
      }).canLaunch,
    ).toBe(false);
  });
});
