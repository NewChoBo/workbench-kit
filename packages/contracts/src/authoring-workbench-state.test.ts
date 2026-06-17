import { describe, expect, it } from 'vitest';

import {
  buildLaunchpadAuthoringWorkbenchSummary,
  buildLaunchpadAuthoringWorkbenchSummaryFromResource,
  buildLaunchpadAuthoringWorkbenchTileSummaryFromResource,
  buildLaunchpadAuthoringWorkbenchState,
  buildLaunchpadAuthoringWorkbenchStateFromFiles,
  buildLibraryAuthoringWorkbenchEntrySummaryFromResource,
  buildLibraryAuthoringWorkbenchFileSummary,
  buildLibraryAuthoringWorkbenchFileSummaryFromResource,
  buildLibraryAuthoringWorkbenchState,
  buildLibraryAuthoringWorkbenchStateFromFiles,
  createTilePaperAuthoringResourceUri,
  parseTilePaperAuthoringResourceUri,
  resolveTilePaperAuthoringResourceId,
} from './authoring-workbench-state';

describe('authoring-workbench-state', () => {
  it('projects host-neutral launchpad summaries into reusable authoring state', () => {
    expect(
      buildLaunchpadAuthoringWorkbenchState({
        generatedAt: '2026-05-11T00:00:00.000Z',
        launchpads: [
          {
            issueCount: 1,
            issues: ['warning: missing-target'],
            layerCount: 0,
            layoutMode: 'grid',
            name: 'Main',
            relativePath: 'main',
            tiles: createLaunchpadTileSummaries(2),
            tileCount: 2,
            uri: 'tilepaper-authoring://launchpad/main',
            valid: true,
          },
        ],
        workspaceName: 'TilePaper',
      }),
    ).toMatchObject({
      generatedAt: '2026-05-11T00:00:00.000Z',
      launchpads: [
        {
          issueCount: 1,
          layerCount: 0,
          layoutMode: 'grid',
          name: 'Main',
          relativePath: 'main',
          tiles: createLaunchpadTileSummaries(2),
          tileCount: 2,
          valid: true,
        },
      ],
      workspaceName: 'TilePaper',
    });
  });

  it('builds launchpad summaries from host-neutral resource projection input', () => {
    expect(
      buildLaunchpadAuthoringWorkbenchSummaryFromResource({
        id: 'main',
        issues: [
          {
            code: 'missing-target',
            severity: 'warning',
          },
          {
            message: 'Tile definition is required.',
            path: '$.tiles[0]',
            severity: 'error',
          },
        ],
        name: 'Main',
        tiles: createLaunchpadTileSummaries(1),
      }),
    ).toEqual({
      issueCount: 2,
      issues: ['warning: missing-target', '$.tiles[0]: Tile definition is required.'],
      name: 'Main',
      relativePath: 'main',
      tileCount: 1,
      tiles: createLaunchpadTileSummaries(1),
      uri: 'tilepaper-authoring://launchpad/main',
      valid: false,
    });
  });

  it('projects library entries into reusable authoring state', () => {
    expect(
      buildLibraryAuthoringWorkbenchState({
        entries: [
          {
            id: 'steam:10',
            label: 'Half-Life',
            sourcePath: 'Steam/Half-Life',
          },
        ],
        generatedAt: '2026-05-11T00:00:00.000Z',
      }),
    ).toEqual({
      generatedAt: '2026-05-11T00:00:00.000Z',
      libraryFiles: [
        {
          issueCount: 0,
          issues: [],
          relativePath: 'Steam/Half-Life',
          uri: 'tilepaper-authoring://library-item/steam%3A10',
          valid: true,
        },
      ],
    });
  });

  it('round-trips TilePaper authoring resource URIs', () => {
    const uri = createTilePaperAuthoringResourceUri({
      id: 'launchpad/main',
      kind: 'launchpad',
    });

    expect(parseTilePaperAuthoringResourceUri(uri)).toEqual({
      id: 'launchpad/main',
      kind: 'launchpad',
    });
    expect(parseTilePaperAuthoringResourceUri('file:///tmp/example.tilepaper.json')).toBeNull();
  });

  it('resolves authoring resource ids only for the expected kind', () => {
    const launchpadUri = createTilePaperAuthoringResourceUri({
      id: 'main',
      kind: 'launchpad',
    });

    expect(resolveTilePaperAuthoringResourceId(launchpadUri, 'launchpad')).toBe('main');
    expect(resolveTilePaperAuthoringResourceId(launchpadUri, 'library-item')).toBeNull();
  });

  it('builds library document summaries from host-neutral resource projection input', () => {
    expect(
      buildLibraryAuthoringWorkbenchFileSummaryFromResource({
        documentKind: 'tilepaper.collection',
        issues: [
          {
            code: 'missing-icon',
            severity: 'warning',
          },
        ],
        itemCount: 2,
        relativePath: '.tilepaper/collections/steam.collection.json',
        uri: 'file:///workspace/.tilepaper/collections/steam.collection.json',
      }),
    ).toEqual({
      documentKind: 'tilepaper.collection',
      issueCount: 1,
      issues: ['warning: missing-icon'],
      itemCount: 2,
      relativePath: '.tilepaper/collections/steam.collection.json',
      uri: 'file:///workspace/.tilepaper/collections/steam.collection.json',
      valid: true,
    });
  });

  it('projects launchpad file summaries into reusable authoring state', () => {
    expect(
      buildLaunchpadAuthoringWorkbenchStateFromFiles({
        generatedAt: '2026-05-12T00:00:00.000Z',
        launchpadFiles: [
          buildLaunchpadAuthoringWorkbenchSummary({
            issueCount: 0,
            issues: [],
            name: 'Main',
            relativePath: '.tilepaper/launchpads/main.launchpad.json',
            tileCount: 1,
            uri: 'file:///workspace/.tilepaper/launchpads/main.launchpad.json',
            valid: true,
          }),
        ],
      }),
    ).toMatchObject({
      generatedAt: '2026-05-12T00:00:00.000Z',
      launchpads: [
        {
          name: 'Main',
          valid: true,
        },
      ],
    });
  });

  it('projects library document summaries into reusable authoring state', () => {
    expect(
      buildLibraryAuthoringWorkbenchStateFromFiles({
        generatedAt: '2026-05-12T00:00:00.000Z',
        libraryFiles: [
          buildLibraryAuthoringWorkbenchFileSummary({
            issueCount: 0,
            issues: [],
            relativePath: '.tilepaper/mappings/default.mapping.json',
            uri: 'file:///workspace/.tilepaper/mappings/default.mapping.json',
            valid: true,
          }),
        ],
      }),
    ).toMatchObject({
      libraryFiles: [
        {
          relativePath: '.tilepaper/mappings/default.mapping.json',
          valid: true,
        },
      ],
    });
  });

  it('builds library entry summaries from host-neutral resource projection input', () => {
    expect(
      buildLibraryAuthoringWorkbenchEntrySummaryFromResource({
        id: 'steam:10',
        sourcePath: 'Steam/Half-Life',
        title: 'Half-Life',
      }),
    ).toEqual({
      id: 'steam:10',
      label: 'Half-Life',
      sourcePath: 'Steam/Half-Life',
    });
  });

  it('builds launchpad tile summaries from host-neutral resource projection input', () => {
    expect(
      buildLaunchpadAuthoringWorkbenchTileSummaryFromResource({
        launchType: 'uri',
        name: 'Open Docs',
        nodeId: 'tile-docs',
        target: 'https://example.test/docs',
      }),
    ).toEqual({
      launchType: 'uri',
      name: 'Open Docs',
      nodeId: 'tile-docs',
      target: 'https://example.test/docs',
    });
  });
});

function createLaunchpadTileSummaries(tileCount: number) {
  return Array.from({ length: tileCount }, (_, index) => ({
    launchType: null,
    name: `Tile ${index + 1}`,
    nodeId: `tile-${index + 1}`,
    target: null,
  }));
}
