import type { ContextKeyValue, KeybindingRegistry } from '@workbench-kit/platform';
import { resolveKeybindingWithOverrides, type KeybindingDefinition } from '@workbench-kit/platform';

function normalizeKeyToken(token: string): string {
  const key = token.trim().toLowerCase();
  if (key === 'del') return 'delete';
  if (key === 'esc') return 'escape';
  if (key === 'return') return 'enter';
  if (key === 'spacebar' || key === 'space') return 'space';
  return key.length === 1 ? key : key;
}

export function normalizeKeybindingKeyFromEvent(
  event: Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'key' | 'metaKey' | 'shiftKey'>,
): string {
  const parts: string[] = [];

  if (event.ctrlKey || event.metaKey) {
    parts.push('ctrl');
  }
  if (event.altKey) {
    parts.push('alt');
  }
  if (event.shiftKey) {
    parts.push('shift');
  }

  parts.push(normalizeKeyToken(event.key));
  return parts.join('+');
}

export function resolveExtensionKeybindingCommand(
  registry: KeybindingRegistry,
  event: Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'key' | 'metaKey' | 'shiftKey'>,
  contextKeys: Readonly<Record<string, ContextKeyValue>> = {},
  overrides: readonly KeybindingDefinition[] = [],
) {
  const key = normalizeKeybindingKeyFromEvent(event);

  if (overrides.length > 0) {
    const match = resolveKeybindingWithOverrides(
      registry.getKeybindings(),
      overrides,
      key,
      contextKeys,
    );
    if (match) {
      return match;
    }
  }

  const matches = registry.resolveKeybindings(key, contextKeys);
  return matches[0];
}
