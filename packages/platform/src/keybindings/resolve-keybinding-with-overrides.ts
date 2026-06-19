import type { ContextKeyValue } from '../context/context-key-value.js';
import { evaluateWhenClause } from '../context/evaluate-when.js';
import type { KeybindingDefinition, KeybindingMatch } from './types.js';

function bindingMatchesKey(
  binding: KeybindingDefinition,
  key: string,
  context: Readonly<Record<string, ContextKeyValue>>,
): boolean {
  return (
    binding.key === key &&
    (binding.when === undefined || evaluateWhenClause(binding.when, context))
  );
}

function toMatch(binding: KeybindingDefinition): KeybindingMatch {
  return {
    ...binding,
    specificity: binding.when ? binding.when.length : 0,
  };
}

export function resolveKeybindingWithOverrides(
  defaults: readonly KeybindingDefinition[],
  overrides: readonly KeybindingDefinition[],
  key: string,
  context: Readonly<Record<string, ContextKeyValue>> = {},
): KeybindingMatch | undefined {
  const overriddenCommands = new Set(overrides.map((binding) => binding.command));

  const userMatches = overrides
    .filter((binding) => bindingMatchesKey(binding, key, context))
    .map(toMatch);

  const defaultMatches = defaults
    .filter(
      (binding) =>
        !overriddenCommands.has(binding.command) && bindingMatchesKey(binding, key, context),
    )
    .map(toMatch);

  return [...userMatches, ...defaultMatches].sort(
    (left, right) => right.specificity - left.specificity,
  )[0];
}

export function getEffectiveKeybindingForCommand(
  commandId: string,
  defaults: readonly KeybindingDefinition[],
  overrides: readonly KeybindingDefinition[],
): KeybindingDefinition | undefined {
  const userBinding = overrides.find((binding) => binding.command === commandId);
  if (userBinding) {
    return userBinding;
  }

  return defaults.find((binding) => binding.command === commandId);
}
