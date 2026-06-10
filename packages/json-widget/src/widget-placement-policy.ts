import type { WidgetPlacementPolicy } from '@workbench-kit/contracts';

const PLACEMENT_POLICIES = new Set<WidgetPlacementPolicy>([
  'as-root',
  'strip-external-placement',
  'rematerialize-grid-slot',
  'preserve-internal-layout',
]);

export function readPlacementPolicy(value: unknown): WidgetPlacementPolicy | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  if (!PLACEMENT_POLICIES.has(normalized as WidgetPlacementPolicy)) {
    return undefined;
  }

  return normalized as WidgetPlacementPolicy;
}
