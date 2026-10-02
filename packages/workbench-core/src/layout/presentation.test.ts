import { describe, expect, it, vi } from 'vitest';
import { LayoutService } from './service.js';
import {
  resolveWorkbenchFrameVisibility,
  type WorkbenchFramePresentation,
} from './presentation.js';

describe('resolveWorkbenchFrameVisibility', () => {
  for (const activityBar of [false, true]) {
    for (const sideBar of [false, true]) {
      for (const auxiliaryBar of [false, true]) {
        for (const panel of [false, true]) {
          it(`masks ${[activityBar, sideBar, auxiliaryBar, panel]} without modifying layout`, () => {
            const layout = Object.freeze({
              activityBar: Object.freeze({
                visible: activityBar,
                itemOrder: Object.freeze(['search', 'explorer']),
                hiddenItemIds: Object.freeze(['search']),
              }),
              sideBar: Object.freeze({
                visible: sideBar,
                sizePercent: 28,
                activeViewContainer: 'explorer',
              }),
              auxiliaryBar: Object.freeze({ visible: auxiliaryBar }),
              panel: Object.freeze({
                visible: panel,
                sizePercent: 37,
                activeViewContainer: 'output',
              }),
            });
            const snapshot = JSON.stringify(layout);
            expect(resolveWorkbenchFrameVisibility(layout)).toEqual({
              activityBar,
              sideBar,
              auxiliaryBar,
              panel,
              statusBar: true,
            });
            expect(resolveWorkbenchFrameVisibility(layout, 'canvas')).toEqual({
              activityBar: false,
              sideBar: false,
              auxiliaryBar: false,
              panel: false,
              statusBar: false,
            });
            expect(JSON.stringify(layout)).toBe(snapshot);
          });
        }
      }
    }
  }

  it('does not emit changes or replace a focus-mode snapshot', () => {
    const layout = new LayoutService({ panel: { visible: true, sizePercent: 41 } });
    const before = layout.getState();
    layout.setFocusModeActive(true);
    const changed = vi.fn();
    const subscription = layout.onDidChangeLayout(changed);
    for (const presentation of ['canvas', 'docked', 'canvas'] as const) {
      expect(resolveWorkbenchFrameVisibility(layout.getState(), presentation)).toEqual({
        activityBar: false,
        sideBar: false,
        auxiliaryBar: false,
        panel: false,
        statusBar: presentation === 'docked',
      });
    }
    expect(layout.isFocusModeActive()).toBe(true);
    expect(changed).not.toHaveBeenCalled();
    layout.setFocusModeActive(false);
    expect(layout.getState()).toEqual(before);
    subscription.dispose();
    layout.dispose();
  });

  it('rejects unknown runtime modes explicitly', () => {
    expect(() =>
      resolveWorkbenchFrameVisibility(
        new LayoutService().getState(),
        'unknown' as WorkbenchFramePresentation,
      ),
    ).toThrow('Unknown workbench frame presentation');
  });
});
