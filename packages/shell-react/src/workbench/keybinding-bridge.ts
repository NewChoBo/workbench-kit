import {
  evaluateWhenClause,
  normalizeWorkbenchShortcutCandidates,
  normalizeWorkbenchShortcutFromEvent,
  resolveWorkbenchShortcutPlatform,
  workbenchShortcutsOverlap,
  type ContextKeyValue,
  type KeybindingDefinition,
  type KeybindingMatch,
  type KeybindingRegistry,
  type WorkbenchShortcutPlatform,
} from '@workbench-kit/platform';

export function normalizeKeybindingKeyFromEvent(
  event: Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'key' | 'metaKey' | 'shiftKey'>,
  platform: WorkbenchShortcutPlatform = resolveWorkbenchShortcutPlatform(),
): string {
  return normalizeWorkbenchShortcutFromEvent(event, platform) ?? '';
}

export function resolveExtensionKeybindingCommand(
  registry: KeybindingRegistry,
  event: Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'key' | 'metaKey' | 'shiftKey'>,
  contextKeys: Readonly<Record<string, ContextKeyValue>> = {},
  overrides: readonly KeybindingDefinition[] = [],
  platform: WorkbenchShortcutPlatform = resolveWorkbenchShortcutPlatform(),
  excludedCommandIds: ReadonlySet<string> = new Set(),
): KeybindingMatch | undefined {
  const key = normalizeKeybindingKeyFromEvent(event, platform);
  if (!key) return undefined;

  const defaults = registry
    .getKeybindings()
    .filter(
      (binding) =>
        !excludedCommandIds.has(binding.command) &&
        normalizeExtensionKeybindingCandidates(binding.key, platform, true).length > 0,
    );
  const ownedCommandIds = new Set(defaults.map((binding) => binding.command));
  const ownedOverrides = overrides.filter((binding) => ownedCommandIds.has(binding.command));
  const overriddenCommands = new Set(ownedOverrides.map((binding) => binding.command));
  const userMatches = ownedOverrides.filter((binding) =>
    bindingMatchesEvent(
      binding,
      key,
      contextKeys,
      platform,
      binding.when !== undefined || (binding.args?.length ?? 0) > 0,
    ),
  );
  const defaultMatches = defaults.filter(
    (binding) =>
      !overriddenCommands.has(binding.command) &&
      bindingMatchesEvent(binding, key, contextKeys, platform, true),
  );

  return [...userMatches, ...defaultMatches]
    .map((binding) => ({
      ...binding,
      specificity: binding.when ? binding.when.length : 0,
    }))
    .sort((left, right) => right.specificity - left.specificity)[0];
}

function bindingMatchesEvent(
  binding: KeybindingDefinition,
  eventKey: string,
  contextKeys: Readonly<Record<string, ContextKeyValue>>,
  platform: WorkbenchShortcutPlatform,
  preserveLegacyMacPrimaryCompatibility: boolean,
): boolean {
  return (
    (workbenchShortcutsOverlap(binding.key, eventKey, platform) ||
      normalizeExtensionKeybindingCandidates(
        binding.key,
        platform,
        preserveLegacyMacPrimaryCompatibility,
      ).some((candidate) => workbenchShortcutsOverlap(candidate, eventKey, platform))) &&
    evaluateWhenClause(binding.when, contextKeys)
  );
}

export function normalizeExtensionKeybindingCandidates(
  shortcut: string,
  platform: WorkbenchShortcutPlatform,
  preserveLegacyMacPrimaryCompatibility = false,
): readonly string[] {
  return normalizeWorkbenchShortcutCandidates(shortcut, platform).flatMap((candidate) => {
    const tokens = candidate.split('+');
    if (
      !preserveLegacyMacPrimaryCompatibility ||
      platform !== 'mac' ||
      !tokens.includes('ctrl') ||
      tokens.includes('meta')
    ) {
      return [candidate];
    }
    return [candidate, tokens.map((token) => (token === 'ctrl' ? 'meta' : token)).join('+')];
  });
}
