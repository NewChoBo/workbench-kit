import { describe, expect, it, vi } from 'vitest';

import {
  createWorkbenchShellNavigate,
  resolveWorkbenchSidebarSlotDisplayedViewId,
} from './workbench-shell-navigate.js';
import type { WorkbenchSidebarSlotId } from './workbench-sidebar-slot.js';

type SampleViewId = 'explorer' | 'launchpad' | 'settings' | 'social';
type SampleDockableViewId = 'explorer' | 'launchpad' | 'social';
type SampleActivityViewId = 'explorer' | 'launchpad';

const registeredViewIds = [
  'explorer',
  'launchpad',
  'social',
] as const satisfies readonly SampleDockableViewId[];

const defaultPlacements = {
  explorer: 'primary',
  launchpad: 'primary',
  social: 'secondary',
} as const satisfies Record<SampleDockableViewId, WorkbenchSidebarSlotId>;

function isDockableSidebarViewId(viewId: string): viewId is SampleDockableViewId {
  return viewId === 'explorer' || viewId === 'launchpad' || viewId === 'social';
}

function isActivityViewId(viewId: SampleViewId): viewId is SampleActivityViewId {
  return viewId === 'explorer' || viewId === 'launchpad';
}

function createNavigateHarness(
  overrides: Partial<
    Parameters<typeof createWorkbenchShellNavigate<SampleViewId, SampleDockableViewId>>[0]
  > = {},
) {
  return createWorkbenchShellNavigate<SampleViewId, SampleDockableViewId>({
    currentView: 'explorer',
    ensureSlotVisible: vi.fn(),
    isDockableSidebarViewId,
    isSidebarOnlyViewId: (viewId) => viewId === 'social',
    isViewId: (viewId): viewId is SampleViewId =>
      viewId === 'explorer' || viewId === 'launchpad' || viewId === 'settings',
    modalTargets: [{ viewId: 'settings', openModalView: vi.fn() }],
    placements: defaultPlacements,
    slotRouter: {
      primaryViewId: 'explorer',
      secondaryViewId: 'social',
      selectPrimaryView: vi.fn(),
      selectSecondaryView: vi.fn(),
    },
    switchView: vi.fn(),
    toggleSlot: vi.fn(),
    ...overrides,
  });
}

describe('createWorkbenchShellNavigate', () => {
  it('toggles the primary slot when the active activity view is selected again', () => {
    const switchView = vi.fn();
    const toggleSlot = vi.fn();
    const navigate = createNavigateHarness({ currentView: 'explorer', switchView, toggleSlot });

    navigate('explorer');

    expect(toggleSlot).toHaveBeenCalledWith('primary');
    expect(switchView).not.toHaveBeenCalled();
  });

  it('opens modal targets without changing sidebar view', () => {
    const settingsOpen = vi.fn();
    const switchView = vi.fn();
    const navigate = createNavigateHarness({
      modalTargets: [{ viewId: 'settings', openModalView: settingsOpen }],
      switchView,
    });

    navigate('settings');

    expect(settingsOpen).toHaveBeenCalledTimes(1);
    expect(switchView).not.toHaveBeenCalled();
  });

  it('focuses sidebar-only views without switching the editor view', () => {
    const switchView = vi.fn();
    const selectSecondaryView = vi.fn();
    const ensureSlotVisible = vi.fn();
    const navigate = createNavigateHarness({
      ensureSlotVisible,
      slotRouter: {
        primaryViewId: 'explorer',
        secondaryViewId: 'explorer',
        selectPrimaryView: vi.fn(),
        selectSecondaryView,
      },
      switchView,
    });

    navigate('social');

    expect(selectSecondaryView).toHaveBeenCalledWith('social');
    expect(ensureSlotVisible).toHaveBeenCalledWith('secondary');
    expect(switchView).not.toHaveBeenCalled();
  });

  it('switches slot focus when editor view matches but sidebar focus does not', () => {
    const toggleSlot = vi.fn();
    const selectPrimaryView = vi.fn();
    const navigate = createNavigateHarness({
      currentView: 'launchpad',
      slotRouter: {
        primaryViewId: 'explorer',
        secondaryViewId: 'social',
        selectPrimaryView,
        selectSecondaryView: vi.fn(),
      },
      toggleSlot,
    });

    navigate('launchpad');

    expect(toggleSlot).not.toHaveBeenCalled();
    expect(selectPrimaryView).toHaveBeenCalledWith('launchpad');
  });
});

describe('resolveWorkbenchSidebarSlotDisplayedViewId', () => {
  it('returns null when the slot has no assigned views', () => {
    expect(
      resolveWorkbenchSidebarSlotDisplayedViewId<
        SampleViewId,
        SampleDockableViewId,
        SampleActivityViewId
      >({
        currentActivityViewId: 'launchpad',
        defaultActivityViewId: 'explorer',
        isActivityViewId,
        isAuxiliarySidebarVisible: true,
        placements: {
          explorer: 'secondary',
          launchpad: 'secondary',
          social: 'secondary',
        },
        primarySlotFocusedViewId: 'explorer',
        registeredViewIds,
        secondarySlotFocusedViewId: 'social',
        slot: 'primary',
      }),
    ).toBeNull();
  });

  it('returns the active view when assigned to the slot', () => {
    expect(
      resolveWorkbenchSidebarSlotDisplayedViewId<
        SampleViewId,
        SampleDockableViewId,
        SampleActivityViewId
      >({
        currentActivityViewId: 'explorer',
        defaultActivityViewId: 'explorer',
        isActivityViewId,
        isAuxiliarySidebarVisible: true,
        placements: defaultPlacements,
        primarySlotFocusedViewId: 'explorer',
        registeredViewIds,
        secondarySlotFocusedViewId: 'social',
        slot: 'secondary',
      }),
    ).toBe('social');
  });
});
