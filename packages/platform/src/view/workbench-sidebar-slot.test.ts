import { describe, expect, it } from 'vitest';

import {
  coerceWorkbenchSidebarSlotViewId,
  listWorkbenchSidebarSlotViewIds,
  oppositeWorkbenchSidebarSlot,
  resolveWorkbenchSidebarSlotActiveViewId,
  resolveWorkbenchSidebarSlotContent,
  resolveWorkbenchSidebarSlotViewIdAfterMove,
  shouldShowWorkbenchSidebarSlotActionBar,
  type WorkbenchSidebarSlotId,
} from './workbench-sidebar-slot.js';

type SampleViewId = 'explorer' | 'search' | 'social';

const registeredViewIds = [
  'explorer',
  'search',
  'social',
] as const satisfies readonly SampleViewId[];

const defaultPlacements = {
  explorer: 'primary',
  search: 'primary',
  social: 'secondary',
} as const satisfies Record<SampleViewId, WorkbenchSidebarSlotId>;

describe('workbench-sidebar-slot', () => {
  it('resolves opposite slot ids', () => {
    expect(oppositeWorkbenchSidebarSlot('primary')).toBe('secondary');
    expect(oppositeWorkbenchSidebarSlot('secondary')).toBe('primary');
  });

  it('lists view ids assigned to a slot in registration order', () => {
    expect(
      listWorkbenchSidebarSlotViewIds('primary', defaultPlacements, registeredViewIds),
    ).toEqual(['explorer', 'search']);

    expect(
      listWorkbenchSidebarSlotViewIds('secondary', defaultPlacements, registeredViewIds),
    ).toEqual(['social']);
  });

  it('prefers per-slot tab focus over routed activity view', () => {
    expect(
      resolveWorkbenchSidebarSlotActiveViewId({
        currentActivityViewId: 'explorer',
        placements: defaultPlacements,
        registeredViewIds,
        slot: 'primary',
        slotFocusedViewId: 'search',
      }),
    ).toBe('search');
  });

  it('shows activity view in its assigned slot', () => {
    expect(
      resolveWorkbenchSidebarSlotContent({
        currentActivityViewId: 'explorer',
        isAuxiliarySidebarVisible: false,
        placements: defaultPlacements,
        registeredViewIds,
        slot: 'primary',
      }),
    ).toEqual({ kind: 'view', viewId: 'explorer' });
  });

  it('shows activity and companion views in both slots simultaneously', () => {
    expect(
      resolveWorkbenchSidebarSlotContent({
        companionViewIds: new Set(['social']),
        currentActivityViewId: 'explorer',
        isAuxiliarySidebarVisible: true,
        placements: defaultPlacements,
        registeredViewIds,
        slot: 'primary',
      }),
    ).toEqual({ kind: 'view', viewId: 'explorer' });

    expect(
      resolveWorkbenchSidebarSlotContent({
        companionViewIds: new Set(['social']),
        currentActivityViewId: 'explorer',
        isAuxiliarySidebarVisible: true,
        placements: defaultPlacements,
        registeredViewIds,
        slot: 'secondary',
      }),
    ).toEqual({ kind: 'view', viewId: 'social' });
  });

  it('shows focused companion in primary when moved there', () => {
    expect(
      resolveWorkbenchSidebarSlotContent({
        companionViewIds: new Set(['social']),
        currentActivityViewId: 'explorer',
        focusedCompanionViewId: 'social',
        isAuxiliarySidebarVisible: true,
        placements: { ...defaultPlacements, social: 'primary' },
        registeredViewIds,
        slot: 'primary',
      }),
    ).toEqual({ kind: 'view', viewId: 'social' });
  });

  it('returns empty for secondary when auxiliary region is hidden', () => {
    expect(
      resolveWorkbenchSidebarSlotContent({
        companionViewIds: new Set(['social']),
        currentActivityViewId: 'explorer',
        isAuxiliarySidebarVisible: false,
        placements: defaultPlacements,
        registeredViewIds,
        slot: 'secondary',
      }),
    ).toEqual({ kind: 'empty' });
  });

  it('hides primary slot tab strip and shows secondary strip when views are assigned', () => {
    expect(shouldShowWorkbenchSidebarSlotActionBar('primary', 3)).toBe(false);
    expect(shouldShowWorkbenchSidebarSlotActionBar('secondary', 1)).toBe(true);
    expect(shouldShowWorkbenchSidebarSlotActionBar('secondary', 0)).toBe(false);
  });

  it('coerces slot focus to an assigned view or slot fallback', () => {
    expect(
      coerceWorkbenchSidebarSlotViewId(
        'secondary',
        'search',
        { explorer: 'primary', search: 'secondary', social: 'secondary' },
        registeredViewIds,
        'social',
      ),
    ).toBe('search');

    expect(
      coerceWorkbenchSidebarSlotViewId(
        'secondary',
        'search',
        defaultPlacements,
        registeredViewIds,
        'social',
      ),
    ).toBe('social');
  });

  it('updates slot focus after moving a view between slots', () => {
    expect(
      resolveWorkbenchSidebarSlotViewIdAfterMove({
        activityViewId: 'search',
        isActivityViewId: (viewId): viewId is 'explorer' | 'search' =>
          viewId === 'explorer' || viewId === 'search',
        movedViewId: 'search',
        nextPlacements: {
          explorer: 'primary',
          search: 'secondary',
          social: 'secondary',
        },
        registeredViewIds,
        sourceSlot: 'primary',
        targetSlot: 'secondary',
      }),
    ).toEqual({
      nextActivityViewId: 'explorer',
      nextPrimarySlotFocusedViewId: 'explorer',
      nextSecondarySlotFocusedViewId: 'search',
    });
  });
});
