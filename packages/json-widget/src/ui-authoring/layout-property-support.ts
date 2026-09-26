import type {
  UiLayoutPropertyDescriptor,
  UiLayoutStrategyDescriptor,
} from '@workbench-kit/contracts';

/** Call only after descriptor validation; membership cannot validate cross-scope declarations. */
export function createLayoutPropertySupport(strategy: UiLayoutStrategyDescriptor) {
  const container = new Set(strategy.supportedContainerProperties);
  const child = new Set(strategy.supportedChildProperties);
  return (property: UiLayoutPropertyDescriptor): boolean =>
    (property.scope === 'container' ? container : child).has(property.id);
}
