import { describe, expect, it } from 'vitest';
import {
  buildWorkbenchViewActivityBarModel,
  buildWorkbenchViewEditorTabs,
  resolveWorkbenchViewTabClosable,
  type WorkbenchViewContribution,
} from './workbench-view-model';

type TestViewId = 'first' | 'second' | 'settings';
type TestSectionId = 'main' | 'utility';
type TestLabelKey = 'label.first' | 'label.second' | 'label.settings';

const descriptors = [
  {
    activityBarSectionId: 'main',
    closePolicy: 'pinned',
    icon: 'first-icon',
    id: 'first',
    labelKey: 'label.first',
  },
  {
    activityBarSectionId: 'main',
    closePolicy: 'dirty-guard',
    icon: 'second-icon',
    id: 'second',
    labelKey: 'label.second',
  },
  {
    activityBarSectionId: 'utility',
    closePolicy: 'transient',
    icon: 'settings-icon',
    id: 'settings',
    labelKey: 'label.settings',
  },
] as const satisfies ReadonlyArray<
  WorkbenchViewContribution<TestViewId, TestSectionId, TestLabelKey, string>
>;

describe('workbench view model', () => {
  it('builds activity bar sections and footer items from descriptors', () => {
    const model = buildWorkbenchViewActivityBarModel({
      descriptors,
      footerSectionIds: ['utility'],
      resolveLabel: (labelKey) => labelKey,
      sectionIds: ['main'],
    });

    expect(model.sections.map((section) => section.map((item) => item.id))).toEqual([
      ['first', 'second'],
    ]);
    expect(model.footerItems.map((item) => item.id)).toEqual(['settings']);
  });

  it('builds editor tabs with close policy and dirty state', () => {
    const tabs = buildWorkbenchViewEditorTabs({
      descriptors,
      dirtyViewIds: new Set<TestViewId>(['second']),
      openViewIds: ['first', 'second', 'settings'],
      resolveLabel: (labelKey) => labelKey,
    });

    expect(tabs.map((tab) => ({ closable: tab.closable, dirty: tab.dirty, id: tab.id }))).toEqual([
      { closable: false, dirty: false, id: 'first' },
      { closable: false, dirty: true, id: 'second' },
      { closable: true, dirty: false, id: 'settings' },
    ]);
  });

  it('resolves close policy without depending on a concrete feature', () => {
    expect(resolveWorkbenchViewTabClosable('pinned', false)).toBe(false);
    expect(resolveWorkbenchViewTabClosable('dirty-guard', true)).toBe(false);
    expect(resolveWorkbenchViewTabClosable('dirty-guard', false)).toBe(true);
    expect(resolveWorkbenchViewTabClosable('transient', true)).toBe(true);
  });
});
