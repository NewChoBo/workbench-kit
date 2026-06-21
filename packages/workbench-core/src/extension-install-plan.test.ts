import { describe, expect, it } from 'vitest';

import { createExtensionInstallPlan, type WorkbenchExtensionDescription } from './index.js';

function extension(
  id: string,
  partial: Partial<WorkbenchExtensionDescription['manifest']> = {},
): WorkbenchExtensionDescription {
  return {
    manifest: {
      schemaVersion: 1,
      activationEvents: [],
      displayName: id,
      engines: {
        extensionApi: '^0.0.0',
        workbench: '^0.0.0',
      },
      id,
      name: id,
      publisher: 'workbench-kit',
      version: '0.0.0',
      ...partial,
    },
  };
}

describe('createExtensionInstallPlan', () => {
  it('orders dependencies before the target and separates install/enable actions', () => {
    const plan = createExtensionInstallPlan({
      availableExtensions: [
        extension('pack', {
          extensionDependencies: ['dependency'],
          extensionPack: ['theme'],
          permissions: ['workspace.write'],
        }),
        extension('dependency', {
          capabilities: {
            provides: ['workbench.workspace'],
          },
        }),
        extension('theme'),
      ],
      installedRecords: [
        {
          category: 'utility',
          enabled: false,
          id: 'dependency',
          installedAt: '2026-06-21T00:00:00.000Z',
          manifestUrl: 'dependency',
        },
      ],
      targetExtensionId: 'pack',
    });

    expect(plan.blocked).toBe(false);
    expect(plan.actions).toEqual([
      { extensionId: 'dependency', kind: 'enable', reason: 'dependency' },
      { extensionId: 'theme', kind: 'install', reason: 'extension-pack' },
      { extensionId: 'pack', kind: 'install', reason: 'target' },
    ]);
    expect(plan.dependencyExtensionIds).toEqual(['dependency']);
    expect(plan.extensionPackIds).toEqual(['theme']);
    expect(plan.enableExtensionIds).toEqual(['dependency']);
    expect(plan.installExtensionIds).toEqual(['theme', 'pack']);
    expect(plan.permissions).toEqual(['workspace.write']);
    expect(plan.requiresApproval).toBe(true);
    expect(plan.capabilities).toEqual({
      provides: ['workbench.workspace'],
      requires: [],
    });
  });

  it('blocks plans with missing hard dependencies', () => {
    const plan = createExtensionInstallPlan({
      availableExtensions: [
        extension('dependent', {
          extensionDependencies: ['missing'],
        }),
      ],
      targetExtensionId: 'dependent',
    });

    expect(plan.blocked).toBe(true);
    expect(plan.installExtensionIds).toEqual(['dependent']);
    expect(
      plan.diagnostics.map(({ dependencyId, kind, severity }) => ({
        dependencyId,
        kind,
        severity,
      })),
    ).toContainEqual({
      dependencyId: 'missing',
      kind: 'missing-extension-dependency',
      severity: 'error',
    });
    expect(
      plan.diagnostics.filter((diagnostic) => diagnostic.kind === 'missing-extension-dependency'),
    ).toHaveLength(1);
  });

  it('blocks missing catalog targets and extension pack members', () => {
    const missingTargetPlan = createExtensionInstallPlan({
      availableExtensions: [],
      targetExtensionId: 'missing-target',
    });

    expect(missingTargetPlan.blocked).toBe(true);
    expect(missingTargetPlan.actions).toEqual([]);
    expect(missingTargetPlan.diagnostics).toEqual([
      expect.objectContaining({
        dependencyId: 'missing-target',
        kind: 'target-extension-not-found',
        severity: 'error',
      }),
    ]);

    const missingPackMemberPlan = createExtensionInstallPlan({
      availableExtensions: [
        extension('pack', {
          extensionPack: ['missing-pack-member'],
        }),
      ],
      targetExtensionId: 'pack',
    });

    expect(missingPackMemberPlan.blocked).toBe(true);
    expect(missingPackMemberPlan.installExtensionIds).toEqual(['pack']);
    expect(missingPackMemberPlan.diagnostics).toEqual([
      expect.objectContaining({
        dependencyId: 'missing-pack-member',
        extensionId: 'pack',
        kind: 'missing-extension-pack',
        severity: 'error',
      }),
    ]);
  });

  it('keeps hard dependency reason ahead of extension-pack reason', () => {
    const plan = createExtensionInstallPlan({
      availableExtensions: [
        extension('pack', {
          extensionDependencies: ['shared'],
          extensionPack: ['shared'],
        }),
        extension('shared'),
      ],
      targetExtensionId: 'pack',
    });

    expect(plan.actions).toEqual([
      { extensionId: 'shared', kind: 'install', reason: 'dependency' },
      { extensionId: 'pack', kind: 'install', reason: 'target' },
    ]);
    expect(plan.dependencyExtensionIds).toEqual(['shared']);
    expect(plan.extensionPackIds).toEqual(['shared']);
  });

  it('reports missing capabilities against the planned enabled graph', () => {
    const missingCapabilityPlan = createExtensionInstallPlan({
      availableExtensions: [
        extension('consumer', {
          capabilities: {
            requires: ['workbench.auth'],
          },
        }),
      ],
      targetExtensionId: 'consumer',
    });
    expect(missingCapabilityPlan.blocked).toBe(true);
    expect(missingCapabilityPlan.diagnostics).toContainEqual(
      expect.objectContaining({
        capabilityId: 'workbench.auth',
        kind: 'missing-capability',
        severity: 'error',
      }),
    );

    const hostCapabilityPlan = createExtensionInstallPlan({
      availableExtensions: [
        extension('consumer', {
          capabilities: {
            requires: ['workbench.auth'],
          },
        }),
      ],
      hostCapabilityIds: ['workbench.auth'],
      targetExtensionId: 'consumer',
    });
    expect(hostCapabilityPlan.blocked).toBe(false);
  });

  it('blocks dependency cycles before install state is written', () => {
    const plan = createExtensionInstallPlan({
      availableExtensions: [
        extension('first', {
          extensionDependencies: ['second'],
        }),
        extension('second', {
          extensionDependencies: ['first'],
        }),
      ],
      targetExtensionId: 'first',
    });

    expect(plan.blocked).toBe(true);
    expect(plan.diagnostics).toContainEqual(
      expect.objectContaining({
        cycle: ['first', 'second', 'first'],
        kind: 'dependency-cycle',
        severity: 'error',
      }),
    );
  });
});
