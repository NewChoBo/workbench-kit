import {
  createCommandRegistryFromContributions,
  type CommandRegistry,
} from '@workbench-kit/platform';
import {
  WorkbenchCommandPalette,
  WorkbenchShortcutCommandBridge,
  createWorkbenchShellCommands,
  type WorkbenchCommandDescriptor,
  type WorkbenchCommandRunContext,
  type WorkbenchShellCommandContext,
} from '@workbench-kit/react/workbench';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useWorkbench } from './provider.js';
import { registerWorkbenchShellCommandHandlers } from './workbench-shell-command-registration.js';
import {
  buildWorkbenchPaletteCommands,
  matchesWorkbenchCommandPaletteShortcut,
  matchesWorkbenchQuickAccessShortcut,
  resolveShellCommandActivities,
  WORKBENCH_COMMAND_PALETTE_SHORTCUT,
  WORKBENCH_QUICK_ACCESS_SHORTCUT,
} from './workbench-command-palette.js';
import { resolveExtensionKeybindingCommand } from './workbench-keybinding-bridge.js';

export interface WorkbenchCommandHostProps {
  additionalCommands?: readonly WorkbenchCommandDescriptor[];
  enableCommandPalette?: boolean;
  enableExtensionKeybindings?: boolean;
  enableShortcutBridge?: boolean;
  onOpenSettings: () => void;
  onRunCommand?: (
    command: WorkbenchCommandDescriptor,
    context: WorkbenchCommandRunContext,
  ) => boolean | void;
}

export function WorkbenchCommandHost({
  additionalCommands = [],
  enableCommandPalette = true,
  enableExtensionKeybindings = true,
  enableShortcutBridge = true,
  onOpenSettings,
  onRunCommand,
}: WorkbenchCommandHostProps) {
  const { executeCommand, extensionRegistry, keybindingOverrides, layoutService } = useWorkbench();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [layout, setLayout] = useState(() => layoutService.getState());
  const shellContextRef = useRef<WorkbenchShellCommandContext | undefined>(undefined);

  useEffect(() => {
    const disposable = layoutService.onDidChangeLayout(({ state }) => {
      setLayout(state);
    });

    return () => {
      disposable.dispose();
    };
  }, [layoutService]);

  const shellActivities = useMemo(
    () => resolveShellCommandActivities(extensionRegistry),
    [extensionRegistry],
  );

  const shellCommandDefinitions = useMemo(
    () =>
      createWorkbenchShellCommands({
        activities: shellActivities,
        includeSettings: true,
        includeSidebarToggle: true,
      }),
    [shellActivities],
  );

  const shellCommandRegistry = useMemo(
    () =>
      createCommandRegistryFromContributions<WorkbenchShellCommandContext>([
        { commands: shellCommandDefinitions },
      ]),
    [shellCommandDefinitions],
  );

  const shellContext = useMemo<WorkbenchShellCommandContext>(
    () => ({
      isPrimarySidebarVisible: layout.sideBar.visible,
      openSettings: onOpenSettings,
      showActivity: (activityId) => {
        layoutService.setActiveViewContainer(activityId);
        layoutService.setSideBarVisible(true);
      },
      togglePrimarySidebar: () => {
        layoutService.setSideBarVisible(!layout.sideBar.visible);
      },
    }),
    [layout.sideBar.visible, layoutService, onOpenSettings],
  );

  shellContextRef.current = shellContext;

  useEffect(() => {
    const registration = registerWorkbenchShellCommandHandlers(
      extensionRegistry.commands,
      shellCommandDefinitions,
      () => {
        const context = shellContextRef.current;
        if (!context) {
          throw new Error('Workbench shell command context is not available.');
        }

        return context;
      },
    );

    return () => {
      registration.dispose();
    };
  }, [extensionRegistry.commands, shellCommandDefinitions]);

  const paletteCommands = useMemo(
    () =>
      buildWorkbenchPaletteCommands({
        additionalCommands,
        extensionCommands: extensionRegistry.commands.getCommands(),
        shellCommands: shellCommandDefinitions,
        shellContext,
      }),
    [additionalCommands, extensionRegistry, shellContext],
  );

  const closePalette = useCallback(() => {
    setPaletteOpen(false);
  }, []);

  const openPalette = useCallback((query = '') => {
    setPaletteQuery(query);
    setPaletteOpen(true);
  }, []);

  const runPaletteCommand = useCallback(
    (command: WorkbenchCommandDescriptor, context: WorkbenchCommandRunContext) => {
      const finish = () => {
        closePalette();
      };

      if (onRunCommand?.(command, context)) {
        finish();
        return;
      }

      void executeCommand(command.id).finally(finish);
    },
    [closePalette, executeCommand, onRunCommand],
  );

  useEffect(() => {
    if (!enableCommandPalette) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (matchesWorkbenchCommandPaletteShortcut(event)) {
        event.preventDefault();
        openPalette('>');
        return;
      }

      if (matchesWorkbenchQuickAccessShortcut(event)) {
        event.preventDefault();
        openPalette();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [enableCommandPalette, openPalette]);

  useEffect(() => {
    if (!enableExtensionKeybindings) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (
        matchesWorkbenchCommandPaletteShortcut(event) ||
        matchesWorkbenchQuickAccessShortcut(event)
      ) {
        return;
      }

      const match = resolveExtensionKeybindingCommand(
        extensionRegistry.keybindings,
        event,
        {},
        keybindingOverrides,
      );
      if (!match) {
        return;
      }

      event.preventDefault();
      void executeCommand(match.command, ...(match.args ?? []));
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [
    enableExtensionKeybindings,
    executeCommand,
    extensionRegistry.keybindings,
    keybindingOverrides,
  ]);

  return (
    <>
      {enableShortcutBridge ? (
        <WorkbenchShortcutCommandBridge
          context={shellContext}
          preventDefault
          registry={shellCommandRegistry as CommandRegistry<WorkbenchShellCommandContext>}
        />
      ) : null}
      {enableCommandPalette ? (
        <WorkbenchCommandPalette
          commands={paletteCommands}
          open={paletteOpen}
          placeholder="Search commands"
          query={paletteQuery}
          title="Command Palette"
          onClose={closePalette}
          onQueryChange={setPaletteQuery}
          onRunCommand={runPaletteCommand}
        />
      ) : null}
    </>
  );
}

export function getWorkbenchCommandPaletteShortcutLabel() {
  return WORKBENCH_COMMAND_PALETTE_SHORTCUT;
}

export function getWorkbenchQuickAccessShortcutLabel() {
  return WORKBENCH_QUICK_ACCESS_SHORTCUT;
}
