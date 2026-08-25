import {
  createWorkbenchShellCommands,
  createWorkspaceFilesQuickOpenProvider,
  type QuickOpenItem,
  type QuickOpenProvider,
  type QuickOpenSelectContext,
  type WorkbenchCommandDescriptor,
  type WorkbenchCommandRunContext,
  type WorkbenchShellCommandContext,
} from '@workbench-kit/react/workbench';
import {
  matchesWorkbenchCommandPaletteShortcut,
  matchesWorkbenchQuickAccessShortcut,
} from '@workbench-kit/react/workbench/command-ui';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { useContextKeyRevision } from '../commands/use-context-key-revision.js';
import { useWorkbench } from '../shell/provider.js';
import { WorkbenchCommandHostController } from './command-host-controller.js';
import { registerWorkbenchShellCommandHandlers } from './shell-command-registration.js';
import {
  buildWorkbenchPaletteCommands,
  collectExtensionCommandFeaturesById,
  resolveShellCommandActivities,
} from './command-palette.js';
import {
  normalizeExtensionKeybindingCandidates,
  resolveExtensionKeybindingCommand,
} from './keybinding-bridge.js';
import { isWorkspaceResourceService, useWorkspaceResourceState } from './workspace-view-state.js';

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
    activities,
    commands,
    contextKeyService,
    executeCommand,
    extensionCatalog,
    keybindings,
    keybindingOverrides,
    keybindingPlatform,
    keybindingProjection,
    layoutService,
    views,
    workspaceHostPort,
  } = useWorkbench();
  const [layout, setLayout] = useState(() => layoutService.getState());
  const [extensionKeybindingRevision, setExtensionKeybindingRevision] = useState(
    () => keybindings.revision,
  );
  const shellContextRef = useRef<WorkbenchShellCommandContext | undefined>(undefined);
  const contextKeyRevision = useContextKeyRevision(contextKeyService);
  const contextKeySnapshot = useMemo(
    () => contextKeyService.createSnapshot(),
    [contextKeyRevision, contextKeyService],
  );
  const genericKeybindingCommandIds = useMemo(
    () => new Set(keybindingProjection.defaults.map((binding) => binding.command)),
    [keybindingProjection.defaults],
  );
  useLayoutEffect(() => {
    const disposable = keybindings.onDidChangeKeybindings(() => {
      setExtensionKeybindingRevision(keybindings.revision);
    });
    setExtensionKeybindingRevision(keybindings.revision);
    return () => disposable.dispose();
  }, [keybindings]);
  const extensionOnlyCommandIds = useMemo(() => {
    const commandIds = new Set<string>();
    for (const binding of keybindings.getKeybindings()) {
      if (
        !genericKeybindingCommandIds.has(binding.command) &&
        normalizeExtensionKeybindingCandidates(binding.key, keybindingPlatform, true).length > 0
      ) {
        commandIds.add(binding.command);
      }
    }
    return commandIds;
  }, [extensionKeybindingRevision, genericKeybindingCommandIds, keybindingPlatform, keybindings]);
  const runtimeKeybindingProjection = useMemo(() => {
    if (!enableExtensionKeybindings) return keybindingProjection;

    return Object.freeze({
      commands: Object.freeze(
        keybindingProjection.commands.filter((command) => !extensionOnlyCommandIds.has(command.id)),
      ),
      defaults: keybindingProjection.defaults,
    });
  }, [enableExtensionKeybindings, extensionOnlyCommandIds, keybindingProjection]);

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
    () => resolveShellCommandActivities({ activities, views }),
    [activities, views],
  );
  const visibleShellActivities = useMemo(
    () => resolveShellCommandActivities({ activities, views }, contextKeySnapshot),
    [activities, contextKeySnapshot, views],
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
      commands,
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
  }, [commands, shellCommandDefinitions]);

  const paletteCommands = useMemo(
    () =>
      buildWorkbenchPaletteCommands({
        additionalCommands,
        extensionCommandFeaturesById: collectExtensionCommandFeaturesById(
          extensionCatalog.getFeatureSpecs(),
        ),
        extensionCommands: commands
          .getCommands()
          .filter((command) => !managedShellCommandIds.has(command.id)),
        shellCommands: shellCommandDefinitions,
        shellContext,
      }),
    [
      additionalCommands,
      commands,
      extensionCatalog,
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

  useEffect(() => {
    if (!enableExtensionKeybindings) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (isActiveShortcutCaptureTarget(event)) {
        return;
      }

      if (
        matchesWorkbenchCommandPaletteShortcut(event) ||
        matchesWorkbenchQuickAccessShortcut(event)
      ) {
        return;
      }

      const match = resolveExtensionKeybindingCommand(
        keybindings,
        event,
        {},
        keybindingOverrides,
        keybindingPlatform,
        genericKeybindingCommandIds,
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
    genericKeybindingCommandIds,
    keybindings,
    keybindingOverrides,
    keybindingPlatform,
  ]);

  return (
    <WorkbenchCommandHostController
      commandPaletteCloseLabel={commandPaletteCloseLabel}
      commandPaletteEmptyLabel={commandPaletteEmptyLabel}
      commandPalettePlaceholder={commandPalettePlaceholder}
      commandPaletteTitle={commandPaletteTitle}
      commands={paletteCommands}
      enableCommandPalette={enableCommandPalette}
      enableQuickOpen={enableQuickOpen}
      executeCommand={executeCommand}
      quickOpenCloseLabel={quickOpenCloseLabel}
      quickOpenEmptyLabel={quickOpenEmptyLabel}
      quickOpenPlaceholder={quickOpenPlaceholder}
      quickOpenProviders={resolvedQuickOpenProviders}
      quickOpenTitle={quickOpenTitle}
      shortcutBridge={
        enableShortcutBridge
          ? {
              context: undefined,
              keybindingOverrides,
              keybindingProjection: runtimeKeybindingProjection,
              platform: keybindingPlatform,
              preventDefault: true,
              registry: commands,
            }
          : false
      }
      {...(onOpenQuickOpenItem === undefined ? {} : { onOpenQuickOpenItem })}
      {...(onRunCommand === undefined ? {} : { onRunCommand })}
    />
  );
}

function isActiveShortcutCaptureTarget(event: Event): boolean {
  const target = event.target;
  return (
    typeof Element !== 'undefined' &&
    target instanceof Element &&
    target.closest('[data-workbench-shortcut-capture-recording="true"]') !== null
  );
}
