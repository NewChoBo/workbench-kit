import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  WorkbenchCommandPalette,
  type WorkbenchCommandDescriptor,
  type WorkbenchCommandRunContext,
} from '@workbench-kit/react/workbench';
import { useWorkbench } from '@workbench-kit/workbench-react';

import {
  SAMPLE_APP_PATH,
  SAMPLE_BUTTON_PATH,
  SAMPLE_EXAMPLE_JDW_PATH,
  SAMPLE_README_PATH,
} from './bootstrap.js';

const SAMPLE_COMMAND_PALETTE_SHORTCUT = 'Ctrl+Shift+P';
const OPEN_SETTINGS_COMMAND_ID = 'workbench-kit.builtin.settings.open';

type WorkbenchContextCommands = ReturnType<typeof useWorkbench>['extensionRegistry']['commands'];
type PaletteExtensionCommand = ReturnType<WorkbenchContextCommands['getCommands']>[number];

const SAMPLE_ACTIVITY_COMMANDS = [
  { icon: 'codicon-files', id: 'explorer', label: 'Show Explorer' },
  { icon: 'codicon-search', id: 'search', label: 'Show Search' },
  { icon: 'codicon-comment-discussion', id: 'chatting', label: 'Show Chat' },
  { icon: 'codicon-sparkle', id: 'aiChat', label: 'Show AI Chat' },
] as const;

const SAMPLE_QUICK_OPEN_COMMANDS = [
  {
    icon: 'codicon-markdown',
    id: 'sample.openReadme',
    label: 'Open README',
    path: SAMPLE_README_PATH,
  },
  {
    icon: 'codicon-file-code',
    id: 'sample.openApp',
    label: 'Open App.tsx',
    path: SAMPLE_APP_PATH,
  },
  {
    icon: 'codicon-symbol-method',
    id: 'sample.openButton',
    label: 'Open Button.tsx',
    path: SAMPLE_BUTTON_PATH,
  },
  {
    icon: 'codicon-preview',
    id: 'sample.openExampleJdw',
    label: 'Open example JDW',
    path: SAMPLE_EXAMPLE_JDW_PATH,
  },
] as const;

export function SampleCommandPalette() {
  const { executeCommand, extensionRegistry, layoutService } = useWorkbench();
  const [open, setOpen] = useState(false);
  const [layout, setLayout] = useState(() => layoutService.getState());

  useEffect(() => {
    const disposable = layoutService.onDidChangeLayout(({ state }) => {
      setLayout(state);
    });

    return () => {
      disposable.dispose();
    };
  }, [layoutService]);

  const commands = useMemo(
    () =>
      buildSamplePaletteCommands({
        extensionCommands: extensionRegistry.commands.getCommands(),
        sideBarVisible: layout.sideBar.visible,
      }),
    [extensionRegistry, layout.sideBar.visible],
  );

  const runCommand = useCallback(
    (command: WorkbenchCommandDescriptor, _context: WorkbenchCommandRunContext) => {
      const closePalette = () => {
        setOpen(false);
      };

      if (command.id === 'sample.togglePrimarySidebar') {
        layoutService.setSideBarVisible(!layout.sideBar.visible);
        closePalette();
        return;
      }

      if (command.id === 'sample.openSettings') {
        void executeCommand(OPEN_SETTINGS_COMMAND_ID).finally(closePalette);
        return;
      }

      const activityMatch = command.id.match(/^sample\.showActivity\.(.+)$/);
      if (activityMatch) {
        layoutService.setActiveViewContainer(activityMatch[1] ?? 'explorer');
        layoutService.setSideBarVisible(true);
        closePalette();
        return;
      }

      const quickOpen = SAMPLE_QUICK_OPEN_COMMANDS.find((entry) => entry.id === command.id);
      if (quickOpen) {
        void executeCommand('workspace.open', { path: quickOpen.path }).finally(closePalette);
        return;
      }

      void executeCommand(command.id).finally(closePalette);
    },
    [executeCommand, layout.sideBar.visible, layoutService],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!matchesSampleCommandPaletteShortcut(event)) {
        return;
      }

      event.preventDefault();
      setOpen(true);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <WorkbenchCommandPalette
      commands={commands}
      open={open}
      placeholder="Type a command name"
      title="Command Palette"
      onClose={() => setOpen(false)}
      onRunCommand={runCommand}
    />
  );
}

export function getSampleCommandPaletteShortcutLabel() {
  return SAMPLE_COMMAND_PALETTE_SHORTCUT;
}

function buildSamplePaletteCommands({
  extensionCommands,
  sideBarVisible,
}: {
  extensionCommands: ReturnType<WorkbenchContextCommands['getCommands']>;
  sideBarVisible: boolean;
}): WorkbenchCommandDescriptor[] {
  const sampleCommands: WorkbenchCommandDescriptor[] = [
    {
      category: 'View',
      icon: 'codicon-layout-sidebar-left',
      id: 'sample.togglePrimarySidebar',
      label: sideBarVisible ? 'Hide primary sidebar' : 'Show primary sidebar',
    },
    {
      category: 'View',
      icon: 'codicon-settings-gear',
      id: 'sample.openSettings',
      label: 'Open Settings',
    },
    ...SAMPLE_ACTIVITY_COMMANDS.map((activity) => ({
      category: 'View',
      icon: activity.icon,
      id: `sample.showActivity.${activity.id}`,
      label: activity.label,
    })),
    ...SAMPLE_QUICK_OPEN_COMMANDS.map((command) => ({
      category: 'File',
      icon: command.icon,
      id: command.id,
      label: command.label,
    })),
  ];

  const contributedCommands = extensionCommands
    .filter((command) => command.handler)
    .map((command) => ({
      category: command.category,
      icon: formatCommandIcon(resolveCommandIcon(command.icon)),
      id: command.id,
      label: command.title ?? command.id,
    }));

  const seen = new Set<string>();

  return [...sampleCommands, ...contributedCommands].filter((command) => {
    if (seen.has(command.id)) {
      return false;
    }

    seen.add(command.id);
    return true;
  });
}

function resolveCommandIcon(icon: PaletteExtensionCommand['icon']): string | undefined {
  if (typeof icon === 'function') {
    return icon(undefined as void);
  }

  return icon;
}

function formatCommandIcon(icon: string | undefined): string | undefined {
  if (!icon) {
    return undefined;
  }

  return icon.startsWith('codicon-') ? icon : `codicon-${icon}`;
}

function matchesSampleCommandPaletteShortcut(event: KeyboardEvent) {
  const key = event.key.toLowerCase();

  if (key !== 'p') {
    return false;
  }

  if (!(event.ctrlKey || event.metaKey) || !event.shiftKey || event.altKey) {
    return false;
  }

  return true;
}
