import { describe, expect, it } from 'vitest';
import {
  canMapLibraryItemToLaunchpadTile,
  type LaunchpadLibraryItemSummary,
  normalizeLaunchTarget,
  resolveLaunchpadLibraryItemMapping,
  type WidgetRendererComponent,
  type WidgetRendererEventKind,
  type WidgetRendererProps,
  type WidgetRendererShape,
  isPatchSuccess,
  isSaveFailure,
  isSaveSuccess,
  isWorkspacePatchDeleteFile,
  isWorkspacePatchWriteFile,
  normalizeServiceFailureMessage,
  type ServiceFailureCode,
} from './index';

const writePatch = {
  content: 'updated',
  path: 'src/index.ts',
  type: 'write-file' as const,
};

const deletePatch = {
  path: 'src/legacy.ts',
  type: 'delete-file' as const,
};

describe('contract helpers', () => {
  it('classifies patch event variant', () => {
    expect(isWorkspacePatchDeleteFile(writePatch)).toBe(false);
    expect(isWorkspacePatchWriteFile(writePatch)).toBe(true);
    expect(isWorkspacePatchDeleteFile(deletePatch)).toBe(true);
    expect(isWorkspacePatchWriteFile(deletePatch)).toBe(false);
  });

  it('classifies patch application result', () => {
    expect(
      isPatchSuccess({
        patch: writePatch,
        type: 'patch:applied',
      }),
    ).toBe(true);

    expect(
      isPatchSuccess({
        code: 'invalid-path',
        patch: deletePatch,
        message: 'path missing',
        type: 'patch:failed',
      }),
    ).toBe(false);
  });

  it('classifies save outcomes as success/failure unions', () => {
    const success = {
      file: {
        content: 'ok',
        path: 'src/index.ts',
      },
      kind: 'save:success' as const,
      outcome: 'updated' as const,
    };
    const failure = {
      code: 'path-conflict' as const,
      kind: 'save:failure' as const,
      message: 'conflict',
      path: 'src/index.ts',
    };

    expect(isSaveSuccess(success)).toBe(true);
    expect(isSaveSuccess(failure)).toBe(false);
    expect(isSaveFailure(success)).toBe(false);
    expect(isSaveFailure(failure)).toBe(true);
  });

  it('normalizes service failures with stable fallback messages', () => {
    expect(normalizeServiceFailureMessage(new Error('boom'))).toBe('boom');
    expect(normalizeServiceFailureMessage('unknown', 'fallback')).toBe('fallback');
  });

  it('shares a single failure-code vocabulary', () => {
    const invalid: ServiceFailureCode = 'invalid-path';
    const stale: ServiceFailureCode = 'stale-update';

    expect(invalid).toBe('invalid-path');
    expect(stale).toBe('stale-update');
  });

  it('exports widget renderer contracts from public index', () => {
    const eventKind: WidgetRendererEventKind = 'press';
    const shape: WidgetRendererShape = { type: 'label' };
    const props: WidgetRendererProps<WidgetRendererShape> = {
      widget: shape,
      rect: {
        height: 100,
        width: 200,
        x: 0,
        y: 0,
      },
    };
    const widgetRenderer: WidgetRendererComponent<WidgetRendererShape> = (widgetProps) => {
      expect(widgetProps.widget.type).toBe('label');
      return null as unknown;
    };

    expect(eventKind).toBe('press');
    expect(props.rect.width).toBe(200);
    expect(widgetRenderer(props)).toBe(null);
  });

  it('exports launchpad mapping contracts from public index', () => {
    const item = {
      itemId: 'item-1',
      launchTarget: ' C:/Games/Launcher.exe ',
    } satisfies LaunchpadLibraryItemSummary;

    const normalized = normalizeLaunchTarget(item.launchTarget);
    expect(normalized).toBe('C:/Games/Launcher.exe');

    const mapping = resolveLaunchpadLibraryItemMapping(item);
    expect(mapping.canLaunch).toBe(true);
    expect(mapping.execution.target).toBe('C:/Games/Launcher.exe');
    expect(mapping.execution.launchType).toBe('app');
    expect(canMapLibraryItemToLaunchpadTile(item)).toBe(true);
  });
});
