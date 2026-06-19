import {
  createCommandRegistryFromContributions,
  executeCommand as executeRegistryCommand,
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
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useWorkbench } from './provider.js';
import {
  buildWorkbenchPaletteCommands,
  matchesWorkbenchCommandPaletteShortcut,
  resolveShellCommandActivities,
  WORKBENCH_COMMAND_PALETTE_SHORTCUT,
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
  const [layout, setLayout] = useState(() => layoutService.getState());

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

  const runPaletteCommand = useCallback(
    (command: WorkbenchCommandDescriptor, context: WorkbenchCommandRunContext) => {
      const finish = () => {
        closePalette();
      };

      if (onRunCommand?.(command, context)) {
        finish();
        return;
      }

      if (executeRegistryCommand(shellCommandRegistry, command.id, shellContext)) {
        finish();
        return;
      }

      void executeCommand(command.id).finally(finish);
    },
    [closePalette, executeCommand, onRunCommand, shellCommandRegistry, shellContext],
  );

  useEffect(() => {
    if (!enableCommandPalette) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (!matchesWorkbenchCommandPaletteShortcut(event)) {
        return;
      }

      event.preventDefault();
      setPaletteOpen(true);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [enableCommandPalette]);

  useEffect(() => {
    if (!enableExtensionKeybindings) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (matchesWorkbenchCommandPaletteShortcut(event)) {
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
  }, [enableExtensionKeybindings, executeCommand, extensionRegistry.keybindings, keybindingOverrides]);

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
          placeholder="Type a command name"
          title="Command Palette"
          onClose={closePalette}
          onRunCommand={runPaletteCommand}
        />
      ) : null}
    </>
  );
}

export function getWorkbenchCommandPaletteShortcutLabel() {
  return WORKBENCH_COMMAND_PALETTE_SHORTCUT;
}
