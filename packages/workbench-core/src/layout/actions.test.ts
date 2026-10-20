import { describe, expect, it } from 'vitest';
import {
  createWorkbenchLayoutActions,
  LayoutService,
  type WorkbenchLayoutChangeEvent,
} from './service.js';

const initial = {
  activityBar: { itemOrder: ['search', 'explorer'], hiddenItemIds: ['search'] },
  sideBar: { activeViewContainer: 'explorer', sizePercent: 32, visible: true },
  panel: { activeViewContainer: 'output', sizePercent: 28, visible: true },
  auxiliaryBar: { visible: true },
};

describe('createWorkbenchLayoutActions', () => {
  it('restores current state on immediate double toggles without losing layout metadata', () => {
    const service = new LayoutService(initial);
    const actions = createWorkbenchLayoutActions(service);
    const state = service.getState();
    const events: WorkbenchLayoutChangeEvent[] = [];
    service.onDidChangeLayout((event) => events.push(event));
    for (const toggle of [
      actions.togglePrimarySidebar,
      actions.toggleAuxiliarySidebar,
      actions.togglePanel,
    ]) {
      toggle();
      toggle();
      expect(service.getState()).toEqual(state);
    }
    expect(events).toHaveLength(6);
    expect(events.every(({ transient }) => !transient)).toBe(true);
    expect(events[1].previousState).toEqual(events[0].state);
  });

  it('reads external service changes at invocation rather than captured render state', () => {
    const service = new LayoutService();
    const actions = createWorkbenchLayoutActions(service);
    service.setSideBarVisible(false);
    service.setAuxiliaryBarVisible(true);
    service.setPanelVisible(true);
    actions.togglePrimarySidebar();
    actions.toggleAuxiliarySidebar();
    actions.togglePanel();
    expect(service.getState().sideBar.visible).toBe(true);
    expect(service.getState().auxiliaryBar.visible).toBe(false);
    expect(service.getState().panel.visible).toBe(false);
  });

  it('distinguishes activity reactivation from an idempotent explicit show', () => {
    const service = new LayoutService(initial);
    const actions = createWorkbenchLayoutActions(service);
    const events: WorkbenchLayoutChangeEvent[] = [];
    service.onDidChangeLayout((event) => events.push(event));
    actions.focusActivity('explorer');
    expect(service.getState().sideBar.visible).toBe(false);
    actions.showActivity('explorer');
    actions.showActivity('explorer');
    expect(service.getState().sideBar.visible).toBe(true);
    expect(events).toHaveLength(2);
    actions.focusActivity('search');
    expect(service.getState().sideBar).toEqual({
      activeViewContainer: 'search',
      sizePercent: 32,
      visible: true,
    });
  });

  it('preserves focus-mode snapshot restoration and transient events', () => {
    const service = new LayoutService(initial);
    const state = service.getState();
    const actions = createWorkbenchLayoutActions(service);
    const transient: boolean[] = [];
    service.onDidChangeLayout((event) => transient.push(event.transient));
    actions.toggleFocusMode();
    actions.showActivity('search');
    actions.togglePanel();
    actions.toggleAuxiliarySidebar();
    actions.toggleFocusMode();
    expect(service.isFocusModeActive()).toBe(false);
    expect(service.getState()).toEqual(state);
    expect(transient).toEqual([true, true, true, true, false]);
    actions.toggleFocusMode();
    actions.toggleFocusMode();
    expect(service.getState()).toEqual(state);
  });

  it('retains existing empty activity identifier normalization', () => {
    const service = new LayoutService(initial);
    const actions = createWorkbenchLayoutActions(service);
    service.setSideBarVisible(false);
    actions.showActivity('');
    expect(service.getState().sideBar.activeViewContainer).toBe('explorer');
    expect(service.getState().sideBar.visible).toBe(true);
  });

  it('keeps service instances independent and adds no owned subscriptions', () => {
    const first = new LayoutService();
    const second = new LayoutService();
    const secondInitial = second.getState();
    createWorkbenchLayoutActions(first).togglePrimarySidebar();
    expect(second.getState()).toEqual(secondInitial);
    const events: WorkbenchLayoutChangeEvent[] = [];
    const subscription = first.onDidChangeLayout((event) => events.push(event));
    subscription.dispose();
    createWorkbenchLayoutActions(first).togglePanel();
    expect(events).toEqual([]);
  });

  it('preserves incumbent action behavior after service disposal without emitting events', () => {
    const service = new LayoutService();
    const actions = createWorkbenchLayoutActions(service);
    const events: WorkbenchLayoutChangeEvent[] = [];
    service.onDidChangeLayout((event) => events.push(event));
    service.dispose();
    actions.togglePrimarySidebar();
    expect(service.getState().sideBar.visible).toBe(false);
    expect(events).toEqual([]);
  });
});
