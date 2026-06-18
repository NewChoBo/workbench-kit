import { describe, expect, it } from 'vitest';
import {
  createIntegratedShellBootstrapInitialState,
  integratedShellActivityOrder,
  integratedShellCommandActivities,
  isIntegratedShellActivityId,
  runtimeStatusLabel,
} from './workbench-demo-config';

describe('workbench demo config', () => {
  it('exposes stable integrated shell activity metadata', () => {
    expect(integratedShellActivityOrder).toEqual(['explorer', 'search', 'chatting', 'aiChat']);
    expect(integratedShellCommandActivities).toHaveLength(4);
    expect(isIntegratedShellActivityId('explorer')).toBe(true);
    expect(isIntegratedShellActivityId('settings')).toBe(false);
  });

  it('creates bootstrap initial state with overrides', () => {
    const state = createIntegratedShellBootstrapInitialState({
      activeActivityId: 'search',
      theme: 'light',
    });
    expect(state.activeActivityId).toBe('search');
    expect(state.primarySidebarSizePercent).toBe(20);
    expect(state.theme).toBe('light');
    expect(state.settingsCategoryId).toBe('appearance');
  });

  it('maps runtime status labels', () => {
    expect(runtimeStatusLabel('running')).toBe('Runtime running');
    expect(runtimeStatusLabel('idle')).toBe('Runtime idle');
  });
});
