import { describe, expect, it } from 'vitest';
import {
  integratedShellDefaultSelectionByActivity,
  integratedShellInitialRuntimeMessages,
  integratedShellWorkspaceFiles,
  integratedShellWorkspaceFolders,
} from './workbench-demo';

describe('workbench demo fixtures', () => {
  it('exposes stable integrated shell workspace data', () => {
    expect(integratedShellWorkspaceFolders).toContain('src');
    expect(integratedShellWorkspaceFiles.some((file) => file.path === 'src/App.tsx')).toBe(true);
    expect(integratedShellDefaultSelectionByActivity.explorer).toBe('src/App.tsx');
    expect(integratedShellInitialRuntimeMessages).toHaveLength(3);
  });
});
