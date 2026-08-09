import {
  createCommandRegistryFromContributions,
  type CommandRegistry,
} from '@workbench-kit/platform';
import {
  WorkbenchCommandPalette,
  WorkbenchQuickOpen,
  WorkbenchShortcutCommandBridge,
  createWorkbenchShellCommands,
  createWorkspaceFilesQuickOpenProvider,
  resolveQuickOpenItemPath,
  type QuickOpenItem,
  type QuickOpenProvider,
  type QuickOpenSelectContext,
  type WorkbenchCommandDescriptor,
  type WorkbenchCommandRunContext,
  type WorkbenchShellCommandContext,
} from '@workbench-kit/react/workbench';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useContextKeyRevision } from '../commands/use-context-key-revision.js';
import { useWorkbench } from '../shell/provider.js';
import { registerWorkbenchShellCommandHandlers } from './shell-command-registration.js';
import {
  buildWorkbenchPaletteCommands,
  collectExtensionCommandFeaturesById,
  matchesWorkbenchCommandPaletteShortcut,
  matchesWorkbenchQuickAccessShortcut,
  resolveShellCommandActivities,
} from './command-palette.js';
import { resolveExtensionKeybindingCommand } from './keybinding-bridge.js';
import { isWorkspaceResourceService, useWorkspaceResourceState } from './workspace-view-state.js';

const WORKSPACE_OPEN_COMMAND_ID = 'workspace.open' as const;

export interface WorkbenchCommandHostProps {
  additionalCommands?: readonly WorkbenchCommandDescriptor[];
  /** Override command palette close control label (default English). */
  commandPaletteCloseLabel?: string | undefined;
  /** Override command palette empty-state copy (default English). */
  commandPaletteEmptyLabel?: string | undefined;
  /** Override command palette search placeholder (default English). */
  commandPalettePlaceholder?: string | undefined;
  /** Override command palette dialog title (default English). */
  commandPaletteTitle?: string | undefined;
  enableCommandPalette?: boolean;
  enableExtensionKeybindings?: boolean;
  /**
   * When true (default), Ctrl/Cmd+P opens Quick Open instead of the command palette.
   * Ctrl/Cmd+Shift+P still opens the command palette.
   */
  enableQuickOpen?: boolean;
  enableShortcutBridge?: boolean;
  onOpenSettings: () => void;
  /**
   * Called when a Quick Open item is selected. Return `true` to skip the default
   * `workspace.open` path for file items.
   */
  onOpenQuickOpenItem?: (item: QuickOpenItem, context: QuickOpenSelectContext) => boolean | void;
  onRunCommand?: (
    command: WorkbenchCommandDescriptor,
    context: WorkbenchCommandRunContext,
  ) => boolean | void;
  /** Override Quick Open close control label (default English). */
  quickOpenCloseLabel?: string | undefined;
  /** Override Quick Open empty-state copy (default English). */
  quickOpenEmptyLabel?: string | undefined;
  /** Override Quick Open search placeholder (default English). */
  quickOpenPlaceholder?: string | undefined;
  /**
   * Extra / replacement Quick Open providers. When omitted, the host wires a
   * workspace-files provider from the registered workspace host port.
   */
  quickOpenProviders?: readonly QuickOpenProvider[];
  /** Override Quick Open dialog title (default English). */
  quickOpenTitle?: string | undefined;
  /** Optional recent paths elevated when the Quick Open query is empty. */
  quickOpenRecentPaths?: readonly string[] | undefined;
}

export function WorkbenchCommandHost({
  additionalCommands = [],
  commandPaletteCloseLabel = 'Close command palette',
  commandPaletteEmptyLabel = 'No commands match your search',
  commandPalettePlaceholder = 'Search commands',
  commandPaletteTitle = 'Command Palette',
  enableCommandPalette = true,
  enableExtensionKeybindings = true,
  enableQuickOpen = true,
  enableShortcutBridge = true,
  onOpenSettings,
  onOpenQuickOpenItem,
  onRunCommand,
  quickOpenCloseLabel = 'Close Quick Open',
  quickOpenEmptyLabel = 'No matching files',
  quickOpenPlaceholder = 'Search files by name',
  quickOpenProviders,
  quickOpenRecentPaths,
  quickOpenTitle = 'Quick Open',
}: WorkbenchCommandHostProps) {
  const {
    contextKeyService,
    executeCommand,
    extensionRegistry,
    keybindingOverrides,
    layoutService,
    workspaceHostPort,
  } = useWorkbench();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [quickOpenOpen, setQuickOpenOpen] = useState(false);
  const [quickOpenQuery, setQuickOpenQuery] = useState('');
  const [layout, setLayout] = useState(() => layoutService.getState());
  const shellContextRef = useRef<WorkbenchShellCommandContext | undefined>(undefined);
  const contextKeyRevision = useContextKeyRevision(contextKeyService);
  const contextKeySnapshot = useMemo(
    () => contextKeyService.createSnapshot(),
    [contextKeyRevision, contextKeyService],
  );

  const workspaceService = isWorkspaceResourceService(workspaceHostPort?.service)
    ? workspaceHostPort.service
    : undefined;
  const workspaceState = useWorkspaceResourceState(workspaceService);

  useEffect(() => {
    const disposable = layoutService.onDidChangeLayout(({ state }) => {
      setLayout(state);
    });

    return () => {
      disposable.dispose();
    };
  }, [layoutService]);

  const managedShellActivities = useMemo(
    () => resolveShellCommandActivities(extensionRegistry),
    [extensionRegistry],
  );
  const visibleShellActivities = useMemo(
    () => resolveShellCommandActivities(extensionRegistry, contextKeySnapshot),
    [contextKeySnapshot, extensionRegistry],
  );
  const visibleShellActivityIdSet = new Set(visibleShellActivities.map((activity) => activity.id));
  const visibleShellActivitySignature = managedShellActivities
    .map((activity) => (visibleShellActivityIdSet.has(activity.id) ? '1' : '0'))
    .join('');

  const shellCommandDefinitions = useMemo(
    () =>
      createWorkbenchShellCommands({
        activities: managedShellActivities.filter(
          (_activity, index) => visibleShellActivitySignature[index] === '1',
        ),
        includeSettings: true,
        includeSidebarToggle: true,
      }),
    [managedShellActivities, visibleShellActivitySignature],
  );

  const managedShellCommandIds = useMemo(
    () =>
      new Set(
        createWorkbenchShellCommands({
          activities: managedShellActivities,
          includeSettings: true,
          includeSidebarToggle: true,
        }).map((command) => command.id),
      ),
    [managedShellActivities],
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
      isFocusModeActive: layoutService.isFocusModeActive(),
      isPrimarySidebarVisible: layout.sideBar.visible,
      openSettings: onOpenSettings,
      showActivity: (activityId) => {
        layoutService.setActiveViewContainer(activityId);
        layoutService.setSideBarVisible(true);
      },
      toggleFocusMode: () => {
        layoutService.setFocusModeActive(!layoutService.isFocusModeActive());
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
        extensionCommandFeaturesById: collectExtensionCommandFeaturesById(extensionRegistry),
        extensionCommands: extensionRegistry.commands
          .getCommands()
          .filter((command) => !managedShellCommandIds.has(command.id)),
        shellCommands: shellCommandDefinitions,
        shellContext,
      }),
    [
      additionalCommands,
      extensionRegistry,
      managedShellCommandIds,
      shellContext,
      shellCommandDefinitions,
    ],
  );

  const resolvedQuickOpenProviders = useMemo(() => {
    if (quickOpenProviders) {
      return quickOpenProviders;
    }

    const files = workspaceState?.files ?? workspaceService?.getState().files ?? [];
    return [
      createWorkspaceFilesQuickOpenProvider({
        files: () => workspaceService?.getState().files ?? files,
        recentPaths: quickOpenRecentPaths,
      }),
    ];
  }, [quickOpenProviders, quickOpenRecentPaths, workspaceService, workspaceState?.files]);

  const closePalette = useCallback(() => {
    setPaletteOpen(false);
  }, []);

  const openPalette = useCallback((query = '') => {
    setQuickOpenOpen(false);
    setPaletteQuery(query);
    setPaletteOpen(true);
  }, []);

  const closeQuickOpen = useCallback(() => {
    setQuickOpenOpen(false);
  }, []);

  const openQuickOpen = useCallback((query = '') => {
    setPaletteOpen(false);
    setQuickOpenQuery(query);
    setQuickOpenOpen(true);
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

  const runQuickOpenItem = useCallback(
    (item: QuickOpenItem, context: QuickOpenSelectContext) => {
      const finish = () => {
        closeQuickOpen();
      };

      if (onOpenQuickOpenItem?.(item, context)) {
        finish();
        return;
      }

      const path = resolveQuickOpenItemPath(item);
      if (!path) {
        finish();
        return;
      }

      void executeCommand(WORKSPACE_OPEN_COMMAND_ID, { path }).finally(finish);
    },
    [closeQuickOpen, executeCommand, onOpenQuickOpenItem],
  );

  useEffect(() => {
    if (!enableCommandPalette && !enableQuickOpen) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (enableCommandPalette && matchesWorkbenchCommandPaletteShortcut(event)) {
        event.preventDefault();
        openPalette('>');
        return;
      }

      if (matchesWorkbenchQuickAccessShortcut(event)) {
        event.preventDefault();
        if (enableQuickOpen) {
          openQuickOpen();
          return;
        }

        if (enableCommandPalette) {
          openPalette();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [enableCommandPalette, enableQuickOpen, openPalette, openQuickOpen]);

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
          closeLabel={commandPaletteCloseLabel}
          commands={paletteCommands}
          emptyLabel={commandPaletteEmptyLabel}
          open={paletteOpen}
          placeholder={commandPalettePlaceholder}
          query={paletteQuery}
          title={commandPaletteTitle}
          onClose={closePalette}
          onQueryChange={setPaletteQuery}
          onRunCommand={runPaletteCommand}
        />
      ) : null}
      {enableQuickOpen ? (
        <WorkbenchQuickOpen
          closeLabel={quickOpenCloseLabel}
          emptyLabel={quickOpenEmptyLabel}
          open={quickOpenOpen}
          placeholder={quickOpenPlaceholder}
          providers={resolvedQuickOpenProviders}
          query={quickOpenQuery}
          title={quickOpenTitle}
          onClose={closeQuickOpen}
          onQueryChange={setQuickOpenQuery}
          onSelectItem={runQuickOpenItem}
        />
      ) : null}
    </>
  );
}
