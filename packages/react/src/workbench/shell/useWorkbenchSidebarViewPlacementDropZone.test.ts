import { describe, expect, it } from 'vitest';

import {
  mergeWorkbenchSidebarViewPlacementDropZoneProps,
  useWorkbenchSidebarViewPlacementDropZone,
} from './useWorkbenchSidebarViewPlacementDropZone';

describe('useWorkbenchSidebarViewPlacementDropZone', () => {
  it('exports a hook factory', () => {
    expect(typeof useWorkbenchSidebarViewPlacementDropZone).toBe('function');
  });
});

interface DropEventMock {
  defaultPrevented: boolean;
  preventDefault: () => void;
}

describe('mergeWorkbenchSidebarViewPlacementDropZoneProps', () => {
  it('runs the drop zone handler before the host handler', () => {
    const calls: string[] = [];

    const merged = mergeWorkbenchSidebarViewPlacementDropZoneProps(
      {
        onDropCapture: (event) => {
          calls.push('drop-zone');
          event.preventDefault();
        },
      },
      {
        onDropCapture: () => {
          calls.push('host');
        },
      },
    );

    const event: DropEventMock = {
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
    };

    merged.onDropCapture?.(event as Parameters<NonNullable<typeof merged.onDropCapture>>[0]);

    expect(calls).toEqual(['drop-zone']);
  });

  it('falls through to the host handler when the drop zone does not consume the event', () => {
    const calls: string[] = [];

    const merged = mergeWorkbenchSidebarViewPlacementDropZoneProps(
      {
        onDropCapture: () => {
          calls.push('drop-zone');
        },
      },
      {
        onDropCapture: () => {
          calls.push('host');
        },
      },
    );

    const event: DropEventMock = {
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
    };

    merged.onDropCapture?.(event as Parameters<NonNullable<typeof merged.onDropCapture>>[0]);

    expect(calls).toEqual(['drop-zone', 'host']);
  });
});
