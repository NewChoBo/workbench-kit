import { describe, expect, it } from 'vitest';
import {
  createMappingEdge,
  edgeItemTransformIds,
  edgeTransformIds,
  normalizeMappingEdge,
  normalizeMappingEdges,
} from './mappingEdge.js';

describe('mappingEdge normalization', () => {
  it('normalizes transformIds', () => {
    expect(
      edgeTransformIds({
        id: 'e1',
        sourceFieldId: 'a',
        targetSlotId: 'b',
        transformIds: [' time:12h ', 'string:truncate'],
      }),
    ).toEqual(['time:12h', 'string:truncate']);
  });

  it('treats identity / empty as pass-through', () => {
    expect(
      edgeTransformIds({
        id: 'e1',
        sourceFieldId: 'a',
        targetSlotId: 'b',
        transformIds: ['identity'],
      }),
    ).toEqual([]);
  });

  it('normalizes edges for current writers', () => {
    expect(
      normalizeMappingEdge({
        id: 'e1',
        sourceFieldId: 'a',
        targetSlotId: 'b',
        transformIds: ['time:24h'],
      }),
    ).toEqual({
      id: 'e1',
      sourceFieldId: 'a',
      targetSlotId: 'b',
      transformIds: ['time:24h'],
    });

    expect(
      normalizeMappingEdges([
        {
          id: 'e2',
          sourceFieldId: 'a',
          targetSlotId: 'b',
          transformIds: ['time:24h', 'string:truncate'],
        },
      ]),
    ).toEqual([
      {
        id: 'e2',
        sourceFieldId: 'a',
        targetSlotId: 'b',
        transformIds: ['time:24h', 'string:truncate'],
      },
    ]);
  });

  it('createMappingEdge writes the transform chain', () => {
    expect(
      createMappingEdge({
        id: 'e3',
        sourceFieldId: 's',
        targetSlotId: 't',
        transformIds: ['string:truncate'],
      }),
    ).toEqual({
      id: 'e3',
      sourceFieldId: 's',
      targetSlotId: 't',
      transformIds: ['string:truncate'],
    });
  });

  it('preserves itemEdges and drops nested list contexts on children', () => {
    expect(
      normalizeMappingEdge({
        id: 'e-list',
        sourceFieldId: 'a.tags',
        targetSlotId: 'b.labels',
        itemSourcePath: 'name',
        itemEdges: [
          {
            id: 'ie1',
            sourceFieldId: 'a.tags.item.name',
            targetSlotId: 'b.labels.item.title',
            itemEdges: [
              {
                id: 'nested',
                sourceFieldId: 'x',
                targetSlotId: 'y',
              },
            ],
          },
        ],
      }),
    ).toEqual({
      id: 'e-list',
      sourceFieldId: 'a.tags',
      targetSlotId: 'b.labels',
      transformIds: undefined,
      itemEdges: [
        {
          id: 'ie1',
          sourceFieldId: 'a.tags.item.name',
          targetSlotId: 'b.labels.item.title',
          transformIds: undefined,
        },
      ],
    });
  });

  it('preserves itemSourcePath and itemTransformIds on normalize', () => {
    expect(
      normalizeMappingEdge({
        id: 'e4',
        sourceFieldId: 'tags',
        targetSlotId: 'names',
        itemSourcePath: ' name ',
        itemTransformIds: ['string:truncate', 'identity'],
      }),
    ).toEqual({
      id: 'e4',
      sourceFieldId: 'tags',
      targetSlotId: 'names',
      transformIds: undefined,
      itemSourcePath: 'name',
      itemTransformIds: ['string:truncate'],
    });

    expect(
      edgeItemTransformIds({
        id: 'e5',
        sourceFieldId: 'tags',
        targetSlotId: 'names',
        itemTransformIds: ['string:truncate'],
      }),
    ).toEqual(['string:truncate']);
  });

  it('preserves per-edge transform options on normalize / create', () => {
    expect(
      normalizeMappingEdge({
        id: 'e6',
        sourceFieldId: 'loc',
        targetSlotId: 'meta',
        transformIds: ['string:template'],
        transformOptions: { template: '{city}' },
        itemTransformIds: ['string:truncate'],
        itemTransformOptions: { maxLength: 8 },
      }),
    ).toEqual({
      id: 'e6',
      sourceFieldId: 'loc',
      targetSlotId: 'meta',
      transformIds: ['string:template'],
      transformOptions: { template: '{city}' },
      itemTransformIds: ['string:truncate'],
      itemTransformOptions: { maxLength: 8 },
    });

    expect(
      createMappingEdge({
        id: 'e7',
        sourceFieldId: 'a',
        targetSlotId: 'b',
        transformIds: ['array:join'],
        transformOptions: { separator: ' | ' },
      }).transformOptions,
    ).toEqual({ separator: ' | ' });
  });

  it('normalizes per-step option bags and keeps a shared summary', () => {
    expect(
      normalizeMappingEdge({
        id: 'e8',
        sourceFieldId: 'now',
        targetSlotId: 'time',
        transformIds: ['time:24h', 'string:truncate'],
        transformOptionSteps: [{ showSeconds: true }, { maxLength: 4 }],
      }),
    ).toEqual({
      id: 'e8',
      sourceFieldId: 'now',
      targetSlotId: 'time',
      transformIds: ['time:24h', 'string:truncate'],
      transformOptionSteps: [{ showSeconds: true }, { maxLength: 4 }],
      transformOptions: { showSeconds: true },
    });
  });
});
