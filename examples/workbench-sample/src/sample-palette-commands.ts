import type {
  WorkbenchCommandDescriptor,
  WorkbenchCommandRunContext,
} from '@workbench-kit/react/workbench';

import {
  SAMPLE_APP_PATH,
  SAMPLE_BUTTON_PATH,
  SAMPLE_EXAMPLE_JDW_PATH,
  SAMPLE_README_PATH,
} from './bootstrap.js';

const SAMPLE_QUICK_OPEN_COMMANDS = [
  {
    category: 'File',
    icon: 'codicon-markdown',
    id: 'sample.openReadme',
    label: 'Open README',
    path: SAMPLE_README_PATH,
  },
  {
    category: 'File',
    icon: 'codicon-file-code',
    id: 'sample.openApp',
    label: 'Open App.tsx',
    path: SAMPLE_APP_PATH,
  },
  {
    category: 'File',
    icon: 'codicon-symbol-method',
    id: 'sample.openButton',
    label: 'Open Button.tsx',
    path: SAMPLE_BUTTON_PATH,
  },
  {
    category: 'File',
    icon: 'codicon-preview',
    id: 'sample.openExampleJdw',
    label: 'Open example JDW',
    path: SAMPLE_EXAMPLE_JDW_PATH,
  },
] as const;

export const sampleAdditionalPaletteCommands: WorkbenchCommandDescriptor[] =
  SAMPLE_QUICK_OPEN_COMMANDS.map(({ category, icon, id, label }) => ({
    category,
    icon,
    id,
    label,
  }));

export function createSamplePaletteCommandRunner(
  executeCommand: (commandId: string, ...args: unknown[]) => Promise<unknown>,
) {
  return (command: WorkbenchCommandDescriptor, _context: WorkbenchCommandRunContext) => {
    const quickOpen = SAMPLE_QUICK_OPEN_COMMANDS.find((entry) => entry.id === command.id);
    if (!quickOpen) {
      return false;
    }

    void executeCommand('workspace.open', { path: quickOpen.path });
    return true;
  };
}
