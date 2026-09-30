import { expect, it } from 'vitest';
import { createWorkbenchLayoutActions, LayoutService } from '@workbench-kit/workbench-core/layout';
import { createWorkbenchShellLayoutActions } from './layout-actions.js';

it('retains the shell action name as the identical neutral function', () => {
  expect(createWorkbenchShellLayoutActions).toBe(createWorkbenchLayoutActions);
  const service = new LayoutService();
  const actions = createWorkbenchShellLayoutActions(service);
  actions.togglePrimarySidebar();
  expect(service.getState().sideBar.visible).toBe(false);
  actions.togglePrimarySidebar();
  expect(service.getState().sideBar.visible).toBe(true);
});
