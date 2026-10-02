import { describe, expect, it } from 'vitest';

import * as composition from './composition.js';
import * as authoringV3 from './v3.js';
import * as admission from './semantic-admission-v3.js';

const compositionFunctions = [
  'uiCompositionComponentRef',
  'describeUiCompositionDefinition',
  'resolveUiCompositionInstances',
] as const;

describe('focused V3 composition public entry', () => {
  it.each(compositionFunctions)('exports the canonical %s implementation', (name) => {
    expect(authoringV3[name]).toBe(composition[name]);
    expect(typeof authoringV3[name]).toBe('function');
  });

  it('constructs an exact document and interface reference through the public entry', () => {
    expect(authoringV3.uiCompositionComponentRef('saved-definition', '1')).toEqual({
      id: 'ui-document:saved-definition',
      version: '1',
    });
    expect(authoringV3.uiCompositionComponentRef('saved:한글/card', '2')).toEqual({
      id: `ui-document:${encodeURIComponent('saved:한글/card')}`,
      version: '2',
    });
  });

  it.each(['', ' definition', 'definition '])(
    'rejects a noncanonical document identity: %j',
    (documentId) => {
      expect(() => authoringV3.uiCompositionComponentRef(documentId, '1')).toThrow(TypeError);
    },
  );
});

it('keeps the shared literal validator out of public entry exports', () => {
  expect('validateUiDocumentPropertySource' in authoringV3).toBe(false);
  expect('validateUiDocumentPropertySource' in admission).toBe(false);
});
