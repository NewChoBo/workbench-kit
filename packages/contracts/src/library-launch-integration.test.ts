import { describe, expect, it } from 'vitest';

import { resolveLaunchpadLibraryItemMapping } from './library-launchpad-mapping';
import { providerActionToLaunchAction } from './provider-library-mapping';

describe('library launch integration', () => {
  it('maps provider exec actions into launchpad library execution payloads', () => {
    const launchAction = providerActionToLaunchAction({
      type: 'exec',
      path: 'C:/Games/tf2.exe',
      args: ['--safe'],
      workingDir: 'C:/Games',
    });

    expect(launchAction).toEqual({
      args: ['--safe'],
      target: 'C:/Games/tf2.exe',
      type: 'app',
      workingDir: 'C:/Games',
    });

    const mapped = resolveLaunchpadLibraryItemMapping({
      title: 'Team Fortress 2',
      providerId: 'steam',
      launchTarget: launchAction!.target,
    });

    expect(mapped.canLaunch).toBe(true);
    expect(mapped.execution).toEqual({
      arguments: [],
      launchType: 'app',
      target: 'C:/Games/tf2.exe',
      workingDirectory: 'C:/Games',
    });
  });

  it('maps provider folder and steam actions into launchpad launch types', () => {
    const folderAction = providerActionToLaunchAction({
      type: 'folder',
      path: 'D:/Games/Sandbox',
    });
    expect(folderAction).toEqual({ type: 'folder', target: 'D:/Games/Sandbox' });

    const folderMapping = resolveLaunchpadLibraryItemMapping({
      title: 'Sandbox',
      launchTarget: folderAction!.target,
    });
    expect(folderMapping.execution.launchType).toBe('folder');
    expect(folderMapping.canLaunch).toBe(false);

    const steamAction = providerActionToLaunchAction({ type: 'steam', appId: '480' });
    expect(steamAction).toEqual({ type: 'url', target: 'steam://run/480' });

    const steamMapping = resolveLaunchpadLibraryItemMapping({
      title: 'Spore',
      launchTarget: steamAction!.target,
    });
    expect(steamMapping.execution).toMatchObject({
      launchType: 'url',
      target: 'steam://run/480',
    });
  });

  it('treats unsupported provider actions as non-launchable library items', () => {
    const launchAction = providerActionToLaunchAction({
      type: 'script',
      shell: 'powershell',
      command: 'Start-Game',
    });
    expect(launchAction).toBeNull();

    const mapped = resolveLaunchpadLibraryItemMapping({
      title: 'Script-only item',
      launchTarget: null,
    });
    expect(mapped.canLaunch).toBe(false);
    expect(mapped.execution.launchType).toBeNull();
  });
});
