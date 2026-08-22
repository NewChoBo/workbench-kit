import type { WidgetAssetCatalogContract } from '../widget/placement-asset-contract';
import type { WidgetRegistryContract } from '../widget/registry-contract';
import type { UiComponentCatalogContribution, UiComponentDescriptor } from './component-types';

function contribution(
  contributorId: string,
  components: readonly UiComponentDescriptor[],
): UiComponentCatalogContribution {
  return Object.freeze({
    contributorId,
    components: Object.freeze([...components]),
  });
}

export function uiComponentContributionFromWidgetRegistry(
  contributorId: string,
  registry: WidgetRegistryContract,
): UiComponentCatalogContribution {
  return contribution(
    contributorId,
    registry
      .definitions()
      .flatMap((definition) =>
        definition.componentDescriptor === undefined ? [] : [definition.componentDescriptor],
      ),
  );
}

export function uiComponentContributionFromWidgetAssetCatalog(
  contributorId: string,
  catalog: WidgetAssetCatalogContract,
): UiComponentCatalogContribution {
  return contribution(
    contributorId,
    catalog
      .assets()
      .flatMap((asset) =>
        asset.componentDescriptor === undefined ? [] : [asset.componentDescriptor],
      ),
  );
}
