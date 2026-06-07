import { describe, expect, it } from 'vitest';
import {
  canMapLibraryItemToLaunchpadTile,
  createLaunchpadLibraryItemTileBinding,
  createResourceIdentity,
  type LaunchpadLibraryItemSummary,
  type LaunchpadLibraryItemBinding,
  normalizeLaunchTarget,
  normalizeExternalUrlTarget,
  normalizeResourceUri,
  resolveLaunchpadLibraryItemMapping,
  type WidgetRendererComponent,
  type WidgetRendererEvent,
  type WidgetRendererEventKind,
  type WidgetRendererProps,
  type WidgetRendererShape,
  isWidgetRendererEvent,
  isWidgetRendererEventKind,
  normalizeWidgetRendererEvent,
  isPatchSuccess,
  isSaveFailure,
  isSaveSuccess,
  isWorkspacePatchDeleteFile,
  isWorkspacePatchWriteFile,
  applyWorkbenchDocumentPatch,
  buildWorkspaceDocumentLookup,
  createPatchFromWorkbenchDocumentAction,
  deserializeWorkbenchDocumentPatch,
  documentNodesToWorkspaceFiles,
  workspaceFilesToDocument,
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

  it('normalizes widget renderer events across legacy and standard shapes', () => {
    expect(isWidgetRendererEventKind('press')).toBe(true);
    expect(isWidgetRendererEventKind('on-press')).toBe(false);

    const canonical: WidgetRendererEvent = {
      type: 'change',
      widgetId: 'widget-a',
      value: 'v',
    };
    expect(isWidgetRendererEvent(canonical)).toBe(true);
    expect(normalizeWidgetRendererEvent(canonical)).toMatchObject(canonical);

    expect(
      normalizeWidgetRendererEvent({
        payload: 'p',
        type: 'on-change',
        widgetId: 'widget-b',
      }),
    ).toMatchObject({
      type: 'change',
      widgetId: 'widget-b',
      value: 'p',
    });
    expect(
      normalizeWidgetRendererEvent({
        kind: 'on-press',
        widgetId: 'widget-d',
      }),
    ).toMatchObject({
      type: 'press',
      widgetId: 'widget-d',
    });
    expect(
      normalizeWidgetRendererEvent({ type: 'on-press', widgetId: 'widget-c', payload: 1 }),
    ).toBe(null);
    expect(
      normalizeWidgetRendererEvent({
        payload: 'legacy-only',
        type: 'on-change',
        value: 'preferred-value',
        widgetId: 'widget-e',
      }),
    ).toMatchObject({
      type: 'change',
      widgetId: 'widget-e',
      value: 'preferred-value',
    });
    expect(normalizeWidgetRendererEvent({ type: 'unknown', widgetId: 'widget-f' })).toBe(null);
  });

  it('exports external url normalization from public index', () => {
    expect(normalizeExternalUrlTarget('https://example.com', 'web-navigation')).toBe(
      'https://example.com/',
    );
    expect(normalizeExternalUrlTarget('steam://store/valve', 'web-navigation')).toBeNull();
  });

  it('exports resource uri normalization from public index', () => {
    expect(normalizeResourceUri(' tilepaper-source:/launchpads/main.json ')).toBe(
      'tilepaper-source:/launchpads/main.json',
    );
    expect(createResourceIdentity('tilepaper-source:/launchpads/main.json')).toEqual({
      key: 'tilepaper-source:/launchpads/main.json',
      uri: 'tilepaper-source:/launchpads/main.json',
    });
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

  it('exports launchpad tile binding factory from public index', () => {
    const item = {
      itemId: 'tile-1',
      providerId: 'steam',
      iconAssetId: 'icon-1',
      thumbnailUrl: 'https://cdn.example/icon.png',
      launchTarget: 'https://example.com/launcher',
    };
    const binding: LaunchpadLibraryItemBinding = createLaunchpadLibraryItemTileBinding(item);

    expect(binding).toEqual({
      version: 1,
      projection: 'launch-tile',
      source: {
        kind: 'library-item',
        connectionId: null,
        itemId: 'tile-1',
        providerId: 'steam',
        snapshotUpdatedAt: null,
        syncMode: 'live',
      },
      artwork: {
        materialization: 'managed-asset',
        preferredAssetId: 'icon-1',
        remoteUrl: 'https://cdn.example/icon.png',
      },
    });
  });

  it('exposes workbench-document patch pipeline from public index', () => {
    const doc = workspaceFilesToDocument(
      [
        { content: 'hello', path: 'notes/readme.md' },
        { content: 'const x = 1;', path: 'src/main.ts' },
      ],
      {
        pageId: 'page-main',
        pageName: 'Main',
        version: '1.0.0',
      },
    );

    const next = applyWorkbenchDocumentPatch(doc, {
      id: 'patch-1',
      schemaVersion: 1,
      timestamp: '2026-06-07T00:00:00.000Z',
      ops: [
        {
          op: 'replace',
          path: '/pages/0/nodes/0/content',
          value: 'updated',
        },
      ],
    });

    expect(next.document.pages).toHaveLength(1);
    expect(next.document.pages[0].nodes[0]).toMatchObject({
      content: 'updated',
    });
    expect(buildWorkspaceDocumentLookup(next.document).size).toBeGreaterThan(0);
  });

  it('supports document action -> patch roundtrip from public index', () => {
    const doc = workspaceFilesToDocument([{ content: 'A', path: 'a.txt' }, { content: 'B', path: 'b.txt' }], {
      pageId: 'page-main',
      pageName: 'Main',
      version: '1.0.0',
    });
    const patchResult = createPatchFromWorkbenchDocumentAction(
      {
        action: 'replace-content',
        nodeId: 'node:a.txt',
        pageId: 'page-main',
        content: 'AA',
      },
      doc,
    );
    const next = applyWorkbenchDocumentPatch(doc, patchResult.patch);

    expect(next.document.pages[0].nodes[0]).toMatchObject({ id: 'node:a.txt', content: 'AA' });
    expect(deserializeWorkbenchDocumentPatch(patchResult.patch)).toEqual(patchResult.patch);
    expect(documentNodesToWorkspaceFiles(next.document).length).toBe(2);
  });
});
