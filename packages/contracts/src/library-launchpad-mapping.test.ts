import { describe, expect, it } from 'vitest';

import {
  canMapLibraryItemToLaunchpadTile,
  createLaunchpadLibraryItemTileBinding,
  inferLaunchTypeFromTarget,
  resolveLaunchpadLibraryItemMapping,
  normalizeLaunchTarget,
  type LaunchpadLibraryItemSummary,
  type LaunchpadLibraryItemBinding,
} from './library-launchpad-mapping';

describe('library-launchpad-mapping', () => {
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
});
