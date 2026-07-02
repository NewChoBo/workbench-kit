import { describe, expect, it } from 'vitest';

import {
  createEpicStoreUrl,
  providerActionIcon,
  providerActionToLaunchAction,
  providerActionTypeLabel,
} from './provider-library-mapping';

describe('provider-library-mapping', () => {
  it('labels provider action kinds for display', () => {
    expect(providerActionTypeLabel({ type: 'steam' })).toBe('Steam');
    expect(providerActionTypeLabel({ type: 'epic' })).toBe('Epic Games');
    expect(providerActionTypeLabel({ type: 'url' })).toBe('URL');
    expect(providerActionTypeLabel({ type: 'exec' })).toBe('App');
    expect(providerActionTypeLabel({ type: 'folder' })).toBe('Folder');
    expect(providerActionTypeLabel({ type: 'script' })).toBe('Script');
    expect(providerActionTypeLabel({ type: 'command' })).toBe('Command');
  });

  it('maps provider action kinds to icon names', () => {
    expect(providerActionIcon({ type: 'steam' })).toBe('play');
    expect(providerActionIcon({ type: 'epic' })).toBe('play');
    expect(providerActionIcon({ type: 'url' })).toBe('link');
    expect(providerActionIcon({ type: 'exec' })).toBe('window');
    expect(providerActionIcon({ type: 'folder' })).toBe('folder');
    expect(providerActionIcon({ type: 'script' })).toBe('terminal');
    expect(providerActionIcon({ type: 'command' })).toBe('terminal');
  });

  it('maps compatible provider actions to launch actions', () => {
    const args = ['--safe'];
    const mapped = providerActionToLaunchAction({ type: 'exec', path: 'C:/Game/game.exe', args });
    expect(mapped).toEqual({
      args: ['--safe'],
      target: 'C:/Game/game.exe',
      type: 'app',
    });
    expect(mapped?.args).not.toBe(args);

    expect(providerActionToLaunchAction({ type: 'folder', path: 'C:/Games' })).toEqual({
      target: 'C:/Games',
      type: 'folder',
    });
    expect(
      providerActionToLaunchAction({ type: 'script', shell: 'powershell', command: 'Start-Game' }),
    ).toBeNull();
    expect(providerActionToLaunchAction({ type: 'steam', appId: '480' })).toEqual({
      target: 'steam://run/480',
      type: 'url',
    });
    expect(
      providerActionToLaunchAction({
        type: 'epic',
        appName: 'Fortnite',
        catalogItemId: '4fe75bbc5a674f4f9b356b5c90567da5',
        catalogNamespace: 'fn',
      }),
    ).toEqual({
      target:
        'com.epicgames.launcher://apps/fn%3A4fe75bbc5a674f4f9b356b5c90567da5%3AFortnite?action=launch&silent=true',
      type: 'url',
    });
    expect(providerActionToLaunchAction({ type: 'epic', appName: 'Stellula' })).toEqual({
      target: 'com.epicgames.launcher://apps/Stellula?action=launch&silent=true',
      type: 'url',
    });
  });

  it('builds Epic store URLs from app names', () => {
    expect(createEpicStoreUrl({ appName: 'Fortnite' })).toBe(
      'https://store.epicgames.com/en-US/p/fortnite',
    );
    expect(createEpicStoreUrl({ appName: '  ' })).toBeNull();
  });

  it('copies exec action fields without sharing mutable references', () => {
    const execAction = {
      type: 'exec' as const,
      path: 'C:/Game/game.exe',
      args: ['--fullscreen'],
      workingDir: 'C:/Games',
      env: { MODE: 'test' },
    };
    const mapped = providerActionToLaunchAction(execAction);
    expect(mapped).toEqual({
      args: ['--fullscreen'],
      env: { MODE: 'test' },
      target: 'C:/Game/game.exe',
      type: 'app',
      workingDir: 'C:/Games',
    });
    expect(mapped?.args).not.toBe(execAction.args);
    expect(mapped?.env).not.toBe(execAction.env);
  });
});
