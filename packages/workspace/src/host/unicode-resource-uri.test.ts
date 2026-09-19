import { describe, expect, it } from 'vitest';

import { formatWorkspaceResourceUri } from '../resource/uri.js';
import { createWorkbenchWorkspaceHostPort } from './workbench-workspace-host.js';

describe('workspace host raw Unicode URI validity', () => {
  it('does not alias malformed raw URIs to a legitimate replacement-character file', () => {
    const highSurrogate = String.fromCharCode(0xd800);
    const lowSurrogate = String.fromCharCode(0xdc00);
    const port = createWorkbenchWorkspaceHostPort({
      initialState: {
        files: [
          { content: 'legitimate', path: 'src/bad�.txt' },
          { content: 'neighbor', path: 'src/other.txt' },
        ],
      },
    });
    const beforeState = port.service.getState();
    const beforeSnapshot = port.service.getSnapshot();
    const replacementUri = formatWorkspaceResourceUri({ kind: 'file', path: 'src/bad�.txt' });
    const malformedUris = [
      `workspace://file/src/${highSurrogate}start.txt`,
      `workspace://file/src/middle${highSurrogate}.txt`,
      `workspace://file/src/end${highSurrogate}`,
      `workspace://file/src/${lowSurrogate}start.txt`,
      `workspace://file/src/middle${lowSurrogate}.txt`,
      `workspace://file/src/end${lowSurrogate}`,
    ];

    expect(port.resolveResource?.(replacementUri)).toEqual({
      content: 'legitimate',
      path: 'src/bad�.txt',
    });
    for (const uri of malformedUris) {
      expect(port.resolveResource?.(uri)).toBeUndefined();
      expect(port.applySave(uri, 'must not overwrite legitimate file')).toBeUndefined();
    }
    expect(port.service.getState()).toEqual(beforeState);
    expect(port.service.getSnapshot()).toEqual(beforeSnapshot);
    expect(port.service.getTransactionJournal()).toHaveLength(0);
    port.dispose?.();
  });
});
