import { describe, expect, it } from 'vitest';
import {
  getWorkbenchStatusDescriptor,
  getWorkbenchStatusLabel,
  getWorkbenchStatusVariant,
  isWorkbenchStatus,
  isWorkbenchStatusBusy,
  isWorkbenchStatusDisabled,
  isWorkbenchStatusUnavailable,
  workbenchStatusFromLifecycleStatus,
} from './status';

describe('workbench status model', () => {
  it('maps statuses to stable labels and variants', () => {
    expect(getWorkbenchStatusLabel('idle')).toBe('Idle');
    expect(getWorkbenchStatusLabel('running')).toBe('Running');
    expect(getWorkbenchStatusLabel('completed')).toBe('Completed');
    expect(getWorkbenchStatusLabel('failed')).toBe('Failed');
    expect(getWorkbenchStatusLabel('waiting')).toBe('Waiting');
    expect(getWorkbenchStatusLabel('cancelled')).toBe('Cancelled');
    expect(getWorkbenchStatusLabel('disabled')).toBe('Disabled');
    expect(getWorkbenchStatusLabel('unavailable')).toBe('Unavailable');

    expect(getWorkbenchStatusVariant('running')).toBe('accent');
    expect(getWorkbenchStatusVariant('completed')).toBe('success');
    expect(getWorkbenchStatusVariant('failed')).toBe('danger');
    expect(getWorkbenchStatusVariant('waiting')).toBe('warning');
    expect(getWorkbenchStatusVariant('unavailable')).toBe('muted');
  });

  it('marks busy, disabled, and unavailable status semantics', () => {
    expect(isWorkbenchStatusBusy('running')).toBe(true);
    expect(isWorkbenchStatusBusy('waiting')).toBe(false);
    expect(isWorkbenchStatusDisabled('disabled')).toBe(true);
    expect(isWorkbenchStatusDisabled('unavailable')).toBe(true);
    expect(isWorkbenchStatusDisabled('failed')).toBe(false);
    expect(isWorkbenchStatusUnavailable('unavailable')).toBe(true);
  });

  it('narrows known workbench statuses', () => {
    expect(isWorkbenchStatus('running')).toBe(true);
    expect(isWorkbenchStatus('error')).toBe(false);
  });

  it('returns complete descriptors for UI surfaces', () => {
    expect(getWorkbenchStatusDescriptor('completed')).toEqual({
      busy: false,
      disabled: false,
      label: 'Completed',
      status: 'completed',
      unavailable: false,
      variant: 'success',
    });
  });

  it('maps lifecycle status strings into workbench statuses', () => {
    expect(workbenchStatusFromLifecycleStatus('idle')).toBe('idle');
    expect(workbenchStatusFromLifecycleStatus('running')).toBe('running');
    expect(workbenchStatusFromLifecycleStatus('cancelled')).toBe('cancelled');
    expect(workbenchStatusFromLifecycleStatus('pending')).toBe('waiting');
    expect(workbenchStatusFromLifecycleStatus('success')).toBe('completed');
    expect(workbenchStatusFromLifecycleStatus('done')).toBe('completed');
    expect(workbenchStatusFromLifecycleStatus('error')).toBe('failed');
    expect(workbenchStatusFromLifecycleStatus('unknown')).toBe('idle');
  });
});
