import { describe, expect, it } from 'vitest';

import {
  WorkspaceResourceService,
  createWorkbenchWorkspaceHostPort,
} from './workbench-workspace-host.js';

describe('workbench workspace host port', () => {
  it('applies save transactions and records journal entries', () => {
    const port = createWorkbenchWorkspaceHostPort({
      initialState: {
        files: [{ content: 'original', path: 'src/App.tsx' }],
        folders: ['src'],
      },
    });

    const result = port.applySave('workspace://file/src/App.tsx', 'updated');

    expect(result?.transactionId).toEqual(expect.any(String));
    expect(port.service.getFile('src/App.tsx')?.content).toBe('updated');
    expect(port.service.getTransactionJournal()).toHaveLength(1);
    expect(port.service.getSnapshot().version).toBe(2);
  });

  it('creates files that do not yet exist in the workspace', () => {
    const port = createWorkbenchWorkspaceHostPort();

    port.applySave('workspace://file/src/New.tsx', 'new file body');

    expect(port.service.getFile('src/New.tsx')?.content).toBe('new file body');
  });

  it('resolves workspace file resources for editor hosts', () => {
    const service = new WorkspaceResourceService({
      initialState: {
        files: [{ content: 'readme', path: 'README.md' }],
      },
    });

    expect(service.getFileByResourceUri('workspace://file/README.md')).toEqual({
      content: 'readme',
      path: 'README.md',
    });
  });
});
