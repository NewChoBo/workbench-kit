import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  isWorkbenchProjectionDescriptor,
  type WorkbenchEditableProjectionPort,
  type WorkbenchProjectionAuthority,
  type WorkbenchProjectionKind,
  type WorkbenchProjectionPort,
  type WorkbenchReadOnlyProjectionPort,
} from './projection';

const kinds: readonly WorkbenchProjectionKind[] = [
  'FULL_GRAPH',
  'GUI_BUILDER',
  'FORM_OR_INSPECTOR',
  'CODE_OR_SCHEMA',
  'PREVIEW',
  'END_USER_PRESENTATION',
];

const authorities: readonly WorkbenchProjectionAuthority[] = [
  'AUTHORITATIVE_EDITABLE',
  'ROUND_TRIP_EDITABLE',
  'DERIVED_READ_ONLY',
  'RUNTIME_ONLY',
];

function expectedValidity(
  kind: WorkbenchProjectionKind,
  authority: WorkbenchProjectionAuthority,
): boolean {
  if (authority === 'DERIVED_READ_ONLY') {
    return true;
  }
  const runtime = kind === 'PREVIEW' || kind === 'END_USER_PRESENTATION';
  return authority === 'RUNTIME_ONLY' ? runtime : !runtime;
}

describe('projection contracts', () => {
  it('accepts exactly the six-kind by four-authority matrix', () => {
    for (const kind of kinds) {
      for (const authority of authorities) {
        expect(
          isWorkbenchProjectionDescriptor({
            id: 'projection-a',
            documentKind: 'sample-document',
            projectionVersion: 1,
            kind,
            authority,
          }),
          `${kind}/${authority}`,
        ).toBe(expectedValidity(kind, authority));
      }
    }
  });

  it.each([
    null,
    [],
    {},
    {
      id: '',
      documentKind: 'sample',
      projectionVersion: 1,
      kind: 'FULL_GRAPH',
      authority: 'DERIVED_READ_ONLY',
    },
    {
      id: 'projection',
      documentKind: ' ',
      projectionVersion: 1,
      kind: 'FULL_GRAPH',
      authority: 'DERIVED_READ_ONLY',
    },
    {
      id: 'projection',
      documentKind: 'sample',
      projectionVersion: 0,
      kind: 'FULL_GRAPH',
      authority: 'DERIVED_READ_ONLY',
    },
    {
      id: 'projection',
      documentKind: 'sample',
      projectionVersion: 1.5,
      kind: 'FULL_GRAPH',
      authority: 'DERIVED_READ_ONLY',
    },
    {
      id: 'projection',
      documentKind: 'sample',
      projectionVersion: 1,
      kind: 'UNKNOWN',
      authority: 'DERIVED_READ_ONLY',
    },
    {
      id: 'projection',
      documentKind: 'sample',
      projectionVersion: 1,
      kind: 'FULL_GRAPH',
      authority: 'UNKNOWN',
    },
  ])('rejects malformed descriptor %#', (value) => {
    expect(isWorkbenchProjectionDescriptor(value)).toBe(false);
  });

  it('keeps read-only ports free of mutation methods', () => {
    type Editable = WorkbenchEditableProjectionPort<
      { readonly value: string },
      { readonly type: 'set' }
    >;
    type ReadOnly = WorkbenchReadOnlyProjectionPort<{ readonly value: string }>;
    type Either = WorkbenchProjectionPort<{ readonly value: string }, { readonly type: 'set' }>;

    expectTypeOf<Editable>().toHaveProperty('applyTransaction');
    expectTypeOf<ReadOnly>().not.toHaveProperty('applyTransaction');
    expectTypeOf<Either>().toMatchTypeOf<Editable | ReadOnly>();
  });
});
