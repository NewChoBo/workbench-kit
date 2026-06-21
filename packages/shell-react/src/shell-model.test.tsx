import { isValidElement, type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import type {
  WorkbenchActivityContribution,
  WorkbenchViewContainerContribution,
  WorkbenchViewContribution,
} from '@workbench-kit/workbench-core';

import {
  createDefaultWorkbenchStatusSections,
  createWorkbenchShellActivityItems,
  getWorkbenchShellCodiconClassName,
  resolveWorkbenchShellIcon,
} from './shell-model.js';

describe('shell model', () => {
  it('uses activity contributions when they are available', () => {
    const activities = [
      {
        icon: 'search',
        id: 'activity.search',
        order: 20,
        title: 'Search',
        viewContainerId: 'workbench.search',
      },
      {
        icon: 'files',
        id: 'activity.explorer',
        order: 10,
        title: 'Explorer',
        viewContainerId: 'workbench.explorer',
      },
    ] satisfies WorkbenchActivityContribution[];

    expect(
      createWorkbenchShellActivityItems({
        activeViewContainerId: 'workbench.search',
        activities,
        viewContainers: [],
        views: [],
      }).map((item) => [item.id, item.label, item.active]),
    ).toEqual([
      ['workbench.explorer', 'Explorer', false],
      ['workbench.search', 'Search', true],
    ]);
  });

  it('falls back to view containers when activities are not contributed', () => {
    const viewContainers = [
      {
        icon: 'files',
        id: 'workbench.explorer',
        location: 'activityBar',
        title: 'Explorer',
      },
    ] satisfies WorkbenchViewContainerContribution[];
    const views = [
      {
        containerId: 'workbench.explorer',
        id: 'explorer.files',
        name: 'Files',
      },
      {
        containerId: 'workbench.search',
        id: 'search.results',
        name: 'Search',
      },
    ] satisfies WorkbenchViewContribution[];

    expect(
      createWorkbenchShellActivityItems({
        activeViewContainerId: 'workbench.search',
        activities: [],
        viewContainers,
        views,
      }).map((item) => [item.id, item.label, item.active]),
    ).toEqual([
      ['workbench.explorer', 'Explorer', false],
      ['workbench.search', 'Search', true],
    ]);
  });

  it('summarizes default shell status sections', () => {
    const sections = createDefaultWorkbenchStatusSections({
      dependencyDiagnostics: [{ severity: 'warning' }, { severity: 'error' }],
      extensionCount: 3,
      missingExtensionIds: ['missing.extension'],
      profile: { displayName: 'Tester' },
    });

    expect(sections[0]?.items.map((item) => [item.id, item.label, item.hidden])).toEqual([
      ['extensions', 'extensions: 3', undefined],
      ['missing-extensions', 'missing: 1', false],
      ['extension-dependencies', 'deps: 2', false],
    ]);
    expect(sections[0]?.items[2]?.status).toBe('failed');
    expect(sections[1]?.items).toEqual([
      {
        icon: 'account',
        id: 'workbench.account',
        label: 'Tester',
        title: 'Open profile',
      },
    ]);
  });

  it('formats shell codicon names', () => {
    expect(getWorkbenchShellCodiconClassName('files')).toBe('codicon-files');
    expect(getWorkbenchShellCodiconClassName('codicon-search')).toBe('codicon-search');
    expect(getWorkbenchShellCodiconClassName('   ')).toBeUndefined();

    const icon = resolveWorkbenchShellIcon('files');
    expect(isValidElement(icon)).toBe(true);
    expect(
      isValidElement(icon)
        ? (icon as ReactElement<{ className?: string }>).props.className
        : undefined,
    ).toBe('codicon codicon-files');
  });
});
