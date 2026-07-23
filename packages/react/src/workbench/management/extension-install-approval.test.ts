import { describe, expect, it, vi } from 'vitest';

import {
  extensionInstallRequiresApproval,
  formatExtensionInstallApprovalMessage,
  resolveExtensionInstallOptions,
} from './extension-install-approval.js';
import type { ExtensionCatalogBrowseEntry } from './types.js';

function entry(
  partial: Partial<ExtensionCatalogBrowseEntry> &
    Pick<ExtensionCatalogBrowseEntry, 'displayName' | 'id'>,
): ExtensionCatalogBrowseEntry {
  return {
    category: 'utility',
    description: 'Sample',
    installed: false,
    manifestUrl: partial.id,
    ...partial,
  };
}

describe('extension install approval helpers', () => {
  it('detects plans that require approval', () => {
    expect(
      extensionInstallRequiresApproval(
        entry({
          displayName: 'Privileged Pack',
          id: 'pack',
          installPlan: {
            blocked: false,
            permissions: ['workspace.write'],
            requiresApproval: true,
          },
        }),
      ),
    ).toBe(true);

    expect(
      extensionInstallRequiresApproval(
        entry({
          displayName: 'Simple Pack',
          id: 'simple',
          installPlan: {
            blocked: false,
            requiresApproval: false,
          },
        }),
      ),
    ).toBe(false);
  });

  it('returns approved options only after confirm accepts', () => {
    const privileged = entry({
      displayName: 'Privileged Pack',
      id: 'pack',
      installPlan: {
        blocked: false,
        permissions: ['workspace.write'],
        requiresApproval: true,
      },
    });

    expect(resolveExtensionInstallOptions(privileged, () => false)).toBeUndefined();
    expect(resolveExtensionInstallOptions(privileged, () => true)).toEqual({ approved: true });
    expect(formatExtensionInstallApprovalMessage(privileged)).toContain('workspace.write');

    const confirm = vi.fn(() => true);
    expect(
      resolveExtensionInstallOptions(
        entry({
          displayName: 'Simple Pack',
          id: 'simple',
          installPlan: { blocked: false, requiresApproval: false },
        }),
        confirm,
      ),
    ).toEqual({});
    expect(confirm).not.toHaveBeenCalled();
  });

  it('skips confirm when isTrusted is true', () => {
    const privileged = entry({
      displayName: 'Privileged Pack',
      id: 'pack',
      installPlan: {
        blocked: false,
        permissions: ['workspace.write'],
        requiresApproval: true,
      },
    });
    const confirm = vi.fn(() => false);
    const rememberTrust = vi.fn();

    expect(
      resolveExtensionInstallOptions(privileged, {
        confirm,
        isTrusted: true,
        rememberTrust,
      }),
    ).toEqual({ approved: true });
    expect(confirm).not.toHaveBeenCalled();
    expect(rememberTrust).not.toHaveBeenCalled();
  });

  it('persists trust after an explicit confirm', () => {
    const privileged = entry({
      displayName: 'Privileged Pack',
      id: 'pack',
      installPlan: {
        blocked: false,
        permissions: ['workspace.write'],
        requiresApproval: true,
      },
    });
    const rememberTrust = vi.fn();

    expect(
      resolveExtensionInstallOptions(privileged, {
        confirm: () => true,
        rememberTrust,
      }),
    ).toEqual({ approved: true });
    expect(rememberTrust).toHaveBeenCalledWith(privileged);
  });
});
