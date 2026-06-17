import { useEffect } from 'react';
import {
  canExecuteCommand,
  executeCommand,
  type CommandRegistry,
  type CommandValue,
} from '@workbench-kit/platform';

export type WorkbenchShortcutPlatform = 'linux' | 'mac' | 'unknown' | 'windows';

export interface WorkbenchShortcutCommandBinding {
  commandId: string;
  preventDefault?: boolean | undefined;
  shortcut: string;
  stopPropagation?: boolean | undefined;
}

export interface WorkbenchShortcutCommandBindingInput<TContext> {
  commandIds?: readonly string[] | undefined;
  context: TContext;
  registry: CommandRegistry<TContext>;
}

export interface WorkbenchShortcutEventLike {
  altKey?: boolean | undefined;
  ctrlKey?: boolean | undefined;
  key: string;
  metaKey?: boolean | undefined;
  preventDefault?: (() => void) | undefined;
  shiftKey?: boolean | undefined;
  stopPropagation?: (() => void) | undefined;
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
  platform?: WorkbenchShortcutPlatform | undefined;
  preventDefault?: boolean | undefined;
  preventDefaultForDisabledMatches?: boolean | undefined;
  stopPropagation?: boolean | undefined;
}

export type WorkbenchShortcutCommandMissReason =
  | 'disabled'
  | 'missing'
  | 'missing-handler'
  | 'no-match';

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

export interface UseWorkbenchShortcutCommandsOptions<TContext> extends Omit<
  WorkbenchShortcutCommandRunInput<TContext>,
  'event'
> {
  enabled?: boolean | undefined;
  onShortcutCommand?: ((result: WorkbenchShortcutCommandRunResult) => void) | undefined;
  target?: EventTarget | null | undefined;
  useCapture?: boolean | undefined;
}

export type WorkbenchShortcutCommandBridgeProps<TContext> =
  UseWorkbenchShortcutCommandsOptions<TContext>;

type ShortcutModifier = 'alt' | 'ctrl' | 'meta' | 'shift';

interface ParsedShortcut {
  ctrlOrMeta: boolean;
  key?: string | undefined;
  modifiers: Set<ShortcutModifier>;
}

function resolveCommandValue<TContext, TValue>(
  value: CommandValue<TContext, TValue> | undefined,
  context: TContext,
): TValue | undefined {
  if (typeof value !== 'function') return value;
  return (value as (context: TContext) => TValue)(context);
}

function getDefaultShortcutPlatform(): WorkbenchShortcutPlatform {
  if (typeof navigator === 'undefined') return 'unknown';
  const platform = navigator.platform.toLowerCase();
  if (platform.includes('mac')) return 'mac';
  if (platform.includes('win')) return 'windows';
  if (platform.includes('linux')) return 'linux';
  return 'unknown';
}

function normalizeKeyToken(token: string) {
  const key = token.trim().toLowerCase();
  if (key === 'del') return 'delete';
  if (key === 'esc') return 'escape';
  if (key === 'return') return 'enter';
  if (key === 'spacebar' || key === 'space') return 'space';
  if (key === 'arrowup' || key === 'up') return 'arrowup';
  if (key === 'arrowdown' || key === 'down') return 'arrowdown';
  if (key === 'arrowleft' || key === 'left') return 'arrowleft';
  if (key === 'arrowright' || key === 'right') return 'arrowright';
  return key;
}

function normalizeEventKey(key: string) {
  if (key === ' ') return 'space';
  return normalizeKeyToken(key);
}

function parseShortcut(
  shortcut: string,
  platform: WorkbenchShortcutPlatform,
): ParsedShortcut | undefined {
  const tokens = shortcut
    .trim()
    .split(/[+\s]+/)
    .map((token) => token.trim())
    .filter(Boolean);
  if (!tokens.length) return undefined;

  const parsed: ParsedShortcut = {
    ctrlOrMeta: false,
    modifiers: new Set(),
  };

  tokens.forEach((token) => {
    const normalized = token.toLowerCase();
    if (normalized === 'ctrl' || normalized === 'control') {
      parsed.modifiers.add('ctrl');
      return;
    }

    if (normalized === 'cmd' || normalized === 'command' || normalized === 'meta') {
      parsed.modifiers.add('meta');
      return;
    }

    if (normalized === 'alt' || normalized === 'option') {
      parsed.modifiers.add('alt');
      return;
    }

    if (normalized === 'shift') {
      parsed.modifiers.add('shift');
      return;
    }

    if (
      normalized === 'ctrl/cmd' ||
      normalized === 'cmd/ctrl' ||
      normalized === 'ctrlcmd' ||
      normalized === 'cmdorctrl'
    ) {
      parsed.ctrlOrMeta = true;
      return;
    }

    if (normalized === 'mod' || normalized === 'primary') {
      parsed.modifiers.add(platform === 'mac' ? 'meta' : 'ctrl');
      return;
    }

    parsed.key = normalizeKeyToken(token);
  });

  return parsed.key ? parsed : undefined;
}

function hasExpectedModifiers(event: WorkbenchShortcutEventLike, parsed: ParsedShortcut) {
  const ctrl = Boolean(event.ctrlKey);
  const meta = Boolean(event.metaKey);

  if (parsed.ctrlOrMeta) {
    if (!ctrl && !meta) return false;
  } else {
    if (ctrl !== parsed.modifiers.has('ctrl')) return false;
    if (meta !== parsed.modifiers.has('meta')) return false;
  }

  return (
    Boolean(event.altKey) === parsed.modifiers.has('alt') &&
    Boolean(event.shiftKey) === parsed.modifiers.has('shift')
  );
}

export function getWorkbenchShortcutFromEvent(event: WorkbenchShortcutEventLike) {
  const parts: string[] = [];
  if (event.ctrlKey) parts.push('Ctrl');
  if (event.metaKey) parts.push('Cmd');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');
  parts.push(normalizeEventKey(event.key));
  return parts.join('+');
}

export function matchesWorkbenchShortcut({
  event,
  platform = getDefaultShortcutPlatform(),
  shortcut,
}: WorkbenchShortcutMatchInput) {
  return shortcut
    .split(',')
    .map((candidate) => parseShortcut(candidate, platform))
    .some(
      (parsed) =>
        Boolean(parsed) &&
        parsed?.key === normalizeEventKey(event.key) &&
        hasExpectedModifiers(event, parsed),
    );
}

export function getWorkbenchShortcutCommandBindings<TContext>({
  commandIds,
  context,
  registry,
}: WorkbenchShortcutCommandBindingInput<TContext>): WorkbenchShortcutCommandBinding[] {
  const allowedCommandIds = commandIds ? new Set(commandIds) : undefined;

  return [...registry.values()].flatMap((command) => {
    if (allowedCommandIds && !allowedCommandIds.has(command.id)) return [];

    const shortcut = resolveCommandValue(command.shortcut, context);
    if (!shortcut) return [];

    return [
      {
        commandId: command.id,
        shortcut,
      },
    ];
  });
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
    bindings ?? getWorkbenchShortcutCommandBindings({ commandIds, context, registry });
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
  onShortcutCommand,
  platform,
  preventDefault,
  preventDefaultForDisabledMatches,
  registry,
  stopPropagation,
  target,
  useCapture = false,
}: UseWorkbenchShortcutCommandsOptions<TContext>) {
  useEffect(() => {
    if (!enabled) return undefined;

    const resolvedTarget = target ?? (typeof window === 'undefined' ? undefined : window);
    if (!resolvedTarget) return undefined;

    const listener = (event: Event) => {
      const result = runWorkbenchShortcutCommand({
        bindings,
        commandIds,
        context,
        event: event as unknown as WorkbenchShortcutEventLike,
        platform,
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
    bindings,
    commandIds,
    context,
    enabled,
    onShortcutCommand,
    platform,
    preventDefault,
    preventDefaultForDisabledMatches,
    registry,
    stopPropagation,
    target,
    useCapture,
  ]);
}

export function WorkbenchShortcutCommandBridge<TContext>(
  props: WorkbenchShortcutCommandBridgeProps<TContext>,
) {
  useWorkbenchShortcutCommands(props);
  return null;
}
