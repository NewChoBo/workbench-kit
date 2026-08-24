import { useEffect, useMemo, useState } from 'react';
import {
  canExecuteCommand,
  createKeybindingManagementModel,
  executeCommand,
  matchesWorkbenchShortcut as matchesPlatformWorkbenchShortcut,
  normalizeWorkbenchShortcutFromEvent,
  projectCommandRegistryKeybindings,
  resolveWorkbenchShortcutPlatform,
  type CommandRegistry,
  type CommandRegistryKeybindingProjection,
  type KeybindingDefinition,
  type WorkbenchShortcutEventLike as PlatformWorkbenchShortcutEventLike,
  type WorkbenchShortcutPlatform as PlatformWorkbenchShortcutPlatform,
} from '@workbench-kit/platform';

export type WorkbenchShortcutPlatform = PlatformWorkbenchShortcutPlatform;
export type WorkbenchShortcutEventLike = PlatformWorkbenchShortcutEventLike;

export interface WorkbenchShortcutCommandBinding {
  commandId: string;
  preventDefault?: boolean | undefined;
  shortcut: string;
  stopPropagation?: boolean | undefined;
}

export interface WorkbenchShortcutCommandBindingInput<TContext> {
  commandIds?: readonly string[] | undefined;
  context: TContext;
  platform?: WorkbenchShortcutPlatform | undefined;
  registry: CommandRegistry<TContext>;
}

export interface WorkbenchShortcutMatchInput {
  event: WorkbenchShortcutEventLike;
  platform?: WorkbenchShortcutPlatform | undefined;
  shortcut: string;
}

export interface WorkbenchShortcutCommandRunInput<
  TContext,
> extends WorkbenchShortcutCommandBindingInput<TContext> {
  bindings?: readonly WorkbenchShortcutCommandBinding[] | undefined;
  event: WorkbenchShortcutEventLike;
  preventDefault?: boolean | undefined;
  preventDefaultForDisabledMatches?: boolean | undefined;
  stopPropagation?: boolean | undefined;
}

export type WorkbenchShortcutCommandMissReason =
  'disabled' | 'missing' | 'missing-handler' | 'no-match';

export type WorkbenchShortcutCommandRunResult =
  | {
      binding: WorkbenchShortcutCommandBinding;
      commandId: string;
      handled: true;
      reason?: undefined;
      shortcut: string;
    }
  | {
      binding?: WorkbenchShortcutCommandBinding | undefined;
      commandId?: string | undefined;
      handled: false;
      reason: WorkbenchShortcutCommandMissReason;
      shortcut?: string | undefined;
    };

interface WorkbenchShortcutCommandCommonOptions<
  TContext,
> extends WorkbenchShortcutCommandBindingInput<TContext> {
  enabled?: boolean | undefined;
  onShortcutCommand?: ((result: WorkbenchShortcutCommandRunResult) => void) | undefined;
  preventDefault?: boolean | undefined;
  preventDefaultForDisabledMatches?: boolean | undefined;
  stopPropagation?: boolean | undefined;
  target?: EventTarget | null | undefined;
  useCapture?: boolean | undefined;
}

type WorkbenchShortcutCommandBindingSource =
  | {
      readonly bindings: readonly WorkbenchShortcutCommandBinding[];
      readonly keybindingOverrides?: never;
      readonly keybindingProjection?: never;
    }
  | {
      readonly bindings?: undefined;
      readonly keybindingOverrides?: readonly KeybindingDefinition[];
      readonly keybindingProjection: CommandRegistryKeybindingProjection;
    }
  | {
      readonly bindings?: undefined;
      readonly keybindingOverrides?: readonly KeybindingDefinition[];
      readonly keybindingProjection?: undefined;
    };

export type UseWorkbenchShortcutCommandsOptions<TContext> =
  WorkbenchShortcutCommandCommonOptions<TContext> & WorkbenchShortcutCommandBindingSource;

export type WorkbenchShortcutCommandBridgeProps<TContext> =
  UseWorkbenchShortcutCommandsOptions<TContext>;

const LEGACY_EVENT_MODIFIER_LABELS: Readonly<Record<string, string>> = {
  alt: 'Alt',
  ctrl: 'Ctrl',
  meta: 'Cmd',
  shift: 'Shift',
};
const EMPTY_KEYBINDING_OVERRIDES: readonly KeybindingDefinition[] = Object.freeze([]);

function formatLegacyShortcutEventLabel(shortcut: string): string {
  return shortcut
    .split('+')
    .map((token) => LEGACY_EVENT_MODIFIER_LABELS[token] ?? token)
    .join('+');
}

export function getWorkbenchShortcutFromEvent(
  event: WorkbenchShortcutEventLike,
  platform = resolveWorkbenchShortcutPlatform(),
): string {
  const shortcut = normalizeWorkbenchShortcutFromEvent(event, platform);
  return shortcut ? formatLegacyShortcutEventLabel(shortcut) : '';
}

export function matchesWorkbenchShortcut({
  event,
  platform,
  shortcut,
}: WorkbenchShortcutMatchInput) {
  const resolvedPlatform = platform ?? resolveWorkbenchShortcutPlatform();
  const compatibleShortcut =
    platform === undefined
      ? shortcut.replace(
          /ctrl\s*\/\s*cmd|cmd\s*\/\s*ctrl|ctrlcmd|cmdorctrl/giu,
          'legacy-primary-or-control',
        )
      : shortcut;
  return matchesPlatformWorkbenchShortcut({
    event,
    platform: resolvedPlatform,
    shortcut: compatibleShortcut,
  });
}

export function matchesWorkbenchCommandPaletteShortcut(event: WorkbenchShortcutEventLike) {
  return matchesHardPrimaryShortcut(event, 'Ctrl/Cmd+Shift+P');
}

export function matchesWorkbenchQuickAccessShortcut(event: WorkbenchShortcutEventLike) {
  return matchesHardPrimaryShortcut(event, 'Ctrl/Cmd+P');
}

function matchesHardPrimaryShortcut(event: WorkbenchShortcutEventLike, shortcut: string): boolean {
  return (
    matchesPlatformWorkbenchShortcut({ event, platform: 'windows', shortcut }) ||
    matchesPlatformWorkbenchShortcut({ event, platform: 'mac', shortcut })
  );
}

export function getWorkbenchCommandPaletteShortcutLabel() {
  return 'Ctrl+Shift+P';
}

export function getWorkbenchQuickAccessShortcutLabel() {
  return 'Ctrl+P';
}

export function getWorkbenchShortcutCommandBindings<TContext>({
  commandIds,
  context,
  platform = resolveWorkbenchShortcutPlatform(),
  registry,
}: WorkbenchShortcutCommandBindingInput<TContext>): WorkbenchShortcutCommandBinding[] {
  const projection = projectCommandRegistryKeybindings({
    commandIds,
    context,
    platform,
    registry,
  });
  return projection.defaults.map((binding) => ({
    commandId: binding.command,
    shortcut: binding.key,
  }));
}

function getEffectiveProjectionBindings(
  projection: CommandRegistryKeybindingProjection,
  overrides: readonly KeybindingDefinition[],
  platform: WorkbenchShortcutPlatform,
): WorkbenchShortcutCommandBinding[] {
  const managementModel = createKeybindingManagementModel({
    onOverridesChange: () => undefined,
    overrides,
    platform,
    projection,
  });
  const supportedOverrides = managementModel.entries.flatMap<WorkbenchShortcutCommandBinding>(
    (entry) =>
      entry.editable === true && entry.userKey
        ? [{ commandId: entry.commandId, shortcut: entry.userKey }]
        : [],
  );
  const overriddenCommands = new Set(supportedOverrides.map((binding) => binding.commandId));

  return [
    ...supportedOverrides,
    ...projection.defaults.flatMap<WorkbenchShortcutCommandBinding>((binding) =>
      overriddenCommands.has(binding.command)
        ? []
        : [{ commandId: binding.command, shortcut: binding.key }],
    ),
  ];
}

function getUnmatchedReason<TContext>(
  registry: CommandRegistry<TContext>,
  commandId: string,
  context: TContext,
): WorkbenchShortcutCommandMissReason {
  const command = registry.get(commandId);
  if (!command) return 'missing';
  if (!command.run) return 'missing-handler';
  return canExecuteCommand(registry, commandId, context) ? 'no-match' : 'disabled';
}

export function runWorkbenchShortcutCommand<TContext>({
  bindings,
  commandIds,
  context,
  event,
  platform,
  preventDefault = true,
  preventDefaultForDisabledMatches = false,
  registry,
  stopPropagation = false,
}: WorkbenchShortcutCommandRunInput<TContext>): WorkbenchShortcutCommandRunResult {
  const resolvedBindings =
    bindings ?? getWorkbenchShortcutCommandBindings({ commandIds, context, platform, registry });
  const binding = resolvedBindings.find((candidate) =>
    matchesWorkbenchShortcut({ event, platform, shortcut: candidate.shortcut }),
  );

  if (!binding) {
    return { handled: false, reason: 'no-match' };
  }

  if (!canExecuteCommand(registry, binding.commandId, context)) {
    if (preventDefaultForDisabledMatches) event.preventDefault?.();
    return {
      binding,
      commandId: binding.commandId,
      handled: false,
      reason: getUnmatchedReason(registry, binding.commandId, context),
      shortcut: binding.shortcut,
    };
  }

  if (binding.preventDefault ?? preventDefault) event.preventDefault?.();
  if (binding.stopPropagation ?? stopPropagation) event.stopPropagation?.();

  executeCommand(registry, binding.commandId, context);
  return {
    binding,
    commandId: binding.commandId,
    handled: true,
    shortcut: binding.shortcut,
  };
}

export function useWorkbenchShortcutCommands<TContext>({
  bindings,
  commandIds,
  context,
  enabled = true,
  keybindingOverrides = EMPTY_KEYBINDING_OVERRIDES,
  keybindingProjection,
  onShortcutCommand,
  platform,
  preventDefault,
  preventDefaultForDisabledMatches,
  registry,
  stopPropagation,
  target,
  useCapture = false,
}: UseWorkbenchShortcutCommandsOptions<TContext>) {
  const resolvedPlatform = platform ?? resolveWorkbenchShortcutPlatform();
  const usesInternalProjection = bindings === undefined && keybindingProjection === undefined;
  const [registryRevision, setRegistryRevision] = useState(0);

  useEffect(() => {
    if (!usesInternalProjection) {
      return undefined;
    }

    const disposable = registry.onDidChangeCommands(() => {
      setRegistryRevision((current) => current + 1);
    });
    return () => disposable.dispose();
  }, [registry, usesInternalProjection]);

  const internalProjection = useMemo(() => {
    if (!usesInternalProjection) {
      return undefined;
    }

    return projectCommandRegistryKeybindings({
      commandIds,
      context,
      platform: resolvedPlatform,
      registry,
    });
  }, [commandIds, context, registry, registryRevision, resolvedPlatform, usesInternalProjection]);

  const resolvedBindings = useMemo(() => {
    if (bindings !== undefined) {
      return bindings;
    }

    const projection = keybindingProjection ?? internalProjection;
    return projection
      ? getEffectiveProjectionBindings(projection, keybindingOverrides, resolvedPlatform)
      : [];
  }, [bindings, internalProjection, keybindingOverrides, keybindingProjection, resolvedPlatform]);

  useEffect(() => {
    if (!enabled) return undefined;

    const resolvedTarget = target ?? (typeof window === 'undefined' ? undefined : window);
    if (!resolvedTarget) return undefined;

    const listener = (event: Event) => {
      if (isWorkbenchShortcutCaptureEvent(event)) {
        return;
      }

      const result = runWorkbenchShortcutCommand({
        bindings: resolvedBindings,
        commandIds,
        context,
        event: event as unknown as WorkbenchShortcutEventLike,
        platform: resolvedPlatform,
        preventDefault,
        preventDefaultForDisabledMatches,
        registry,
        stopPropagation,
      });
      if (result.handled) onShortcutCommand?.(result);
    };

    resolvedTarget.addEventListener('keydown', listener, { capture: useCapture });
    return () => {
      resolvedTarget.removeEventListener('keydown', listener, { capture: useCapture });
    };
  }, [
    commandIds,
    context,
    enabled,
    onShortcutCommand,
    preventDefault,
    preventDefaultForDisabledMatches,
    registry,
    resolvedBindings,
    resolvedPlatform,
    stopPropagation,
    target,
    useCapture,
  ]);
}

function isWorkbenchShortcutCaptureEvent(event: Event): boolean {
  const target = event.target;
  return (
    typeof Element !== 'undefined' &&
    target instanceof Element &&
    target.closest('[data-workbench-shortcut-capture-recording="true"]') !== null
  );
}

export function WorkbenchShortcutCommandBridge<TContext>(
  props: WorkbenchShortcutCommandBridgeProps<TContext>,
) {
  useWorkbenchShortcutCommands(props);
  return null;
}
