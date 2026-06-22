import { describe, expect, it } from 'vitest';

import {
  createWorkbenchPermissionContextKeys,
  normalizeWorkbenchPermissionRole,
  resolveWorkbenchPermissionCapabilities,
} from './permission-context-keys.js';

describe('normalizeWorkbenchPermissionRole', () => {
  it('maps deprecated aliases to canonical roles', () => {
    expect(normalizeWorkbenchPermissionRole('admin')).toBe('owner');
    expect(normalizeWorkbenchPermissionRole('basic')).toBe('viewer');
  });
});

describe('resolveWorkbenchPermissionCapabilities', () => {
  it('matches the documented tier matrix', () => {
    expect(resolveWorkbenchPermissionCapabilities('owner')).toMatchObject({
      tier: 5,
      canManageCommands: true,
      canOpenSettings: true,
      canUseChat: true,
      canUseSearch: true,
      canManageExtensions: true,
    });
    expect(resolveWorkbenchPermissionCapabilities('maintainer')).toMatchObject({
      tier: 4,
      canManageCommands: true,
      canOpenSettings: false,
      canUseChat: true,
      canUseSearch: true,
      canManageExtensions: true,
    });
    expect(resolveWorkbenchPermissionCapabilities('developer')).toMatchObject({
      tier: 3,
      canManageCommands: false,
      canOpenSettings: false,
      canUseChat: true,
      canUseSearch: true,
      canManageExtensions: false,
    });
    expect(resolveWorkbenchPermissionCapabilities('reporter')).toMatchObject({
      tier: 2,
      canManageCommands: false,
      canOpenSettings: false,
      canUseChat: true,
      canUseSearch: false,
      canManageExtensions: false,
    });
    expect(resolveWorkbenchPermissionCapabilities('viewer')).toMatchObject({
      tier: 1,
      canManageCommands: false,
      canOpenSettings: false,
      canUseChat: false,
      canUseSearch: false,
      canManageExtensions: false,
    });
  });
});

describe('createWorkbenchPermissionContextKeys', () => {
  it('writes normalized role and capability flags', () => {
    expect(createWorkbenchPermissionContextKeys({ role: 'admin' })).toEqual({
      'workbench.permissions.role': 'owner',
      'workbench.permissions.tier': 5,
      'workbench.permissions.canManageCommands': true,
      'workbench.permissions.canOpenSettings': true,
      'workbench.permissions.canUseChat': true,
      'workbench.permissions.canUseSearch': true,
      'workbench.permissions.canManageExtensions': true,
    });
    expect(createWorkbenchPermissionContextKeys({ role: 'basic' })).toEqual({
      'workbench.permissions.role': 'viewer',
      'workbench.permissions.tier': 1,
      'workbench.permissions.canManageCommands': false,
      'workbench.permissions.canOpenSettings': false,
      'workbench.permissions.canUseChat': false,
      'workbench.permissions.canUseSearch': false,
      'workbench.permissions.canManageExtensions': false,
    });
  });
});
