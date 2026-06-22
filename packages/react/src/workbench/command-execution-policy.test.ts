import { describe, expect, it } from 'vitest';

import {
  getWorkbenchCommandExecutionPolicyLabel,
  isWorkbenchCommandExecutionPolicy,
  resolveWorkbenchCommandExecutionPolicy,
  type ResolveWorkbenchCommandExecutionPolicyInput,
} from './command-execution-policy';
import type { WorkbenchCommandDescriptor } from './command-model';

function descriptor(
  overrides: Partial<WorkbenchCommandDescriptor> & Pick<WorkbenchCommandDescriptor, 'id' | 'label'>,
): WorkbenchCommandDescriptor {
  const { id, label, ...rest } = overrides;
  return {
    id,
    label,
    ...rest,
  };
}

describe('resolveWorkbenchCommandExecutionPolicy', () => {
  it('prefers descriptor executionPolicy override', () => {
    expect(
      resolveWorkbenchCommandExecutionPolicy(
        descriptor({
          id: 'demo.read',
          label: 'Read',
          executionPolicy: 'auto-deny',
          danger: true,
        }),
      ),
    ).toBe('auto-deny');
  });

  it('uses host policy map before safe defaults', () => {
    const input: ResolveWorkbenchCommandExecutionPolicyInput = {
      policyByCommandId: {
        'demo.read': 'auto-deny',
      },
    };

    expect(
      resolveWorkbenchCommandExecutionPolicy(
        descriptor({ id: 'demo.read', label: 'Read' }),
        input,
      ),
    ).toBe('auto-deny');
  });

  it('defaults mutating commands to approval-required', () => {
    expect(
      resolveWorkbenchCommandExecutionPolicy(
        descriptor({ id: 'demo.write', label: 'Write', sideEffect: 'workspace-write' }),
      ),
    ).toBe('approval-required');

    expect(
      resolveWorkbenchCommandExecutionPolicy(
        descriptor({ id: 'demo.danger', label: 'Danger', danger: true }),
      ),
    ).toBe('approval-required');

    expect(
      resolveWorkbenchCommandExecutionPolicy(
        descriptor({
          id: 'demo.approval',
          label: 'Approval',
          metadata: { requiresApproval: true },
        }),
      ),
    ).toBe('approval-required');
  });

  it('defaults non-mutating commands to auto-allow', () => {
    expect(
      resolveWorkbenchCommandExecutionPolicy(
        descriptor({ id: 'demo.read', label: 'Read', output: 'message' }),
      ),
    ).toBe('auto-allow');
  });

  it('honors host default policy for non-mutating commands', () => {
    expect(
      resolveWorkbenchCommandExecutionPolicy(descriptor({ id: 'demo.read', label: 'Read' }), {
        defaultPolicy: 'approval-required',
      }),
    ).toBe('approval-required');
  });
});

describe('command execution policy helpers', () => {
  it('labels policies for UI copy', () => {
    expect(getWorkbenchCommandExecutionPolicyLabel('auto-allow')).toBe('Auto allow');
    expect(getWorkbenchCommandExecutionPolicyLabel('approval-required')).toBe('Approval required');
    expect(getWorkbenchCommandExecutionPolicyLabel('auto-deny')).toBe('Auto deny');
  });

  it('validates policy values', () => {
    expect(isWorkbenchCommandExecutionPolicy('auto-allow')).toBe(true);
    expect(isWorkbenchCommandExecutionPolicy('invalid')).toBe(false);
  });
});
