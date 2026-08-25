import type { UiValueSource } from '@workbench-kit/contracts';

import { collectWidgetNodes } from '../widget/tree.js';
import {
  readUiDocumentNodeAuthoringV3,
  toUiDocumentV2CompatibilityView,
  validateUiDocumentRootV3,
} from './document-v3.js';
import { cloneUiAuthoringJsonValue, deepFreezeUiAuthoringValue } from './immutability.js';
import { projectUiAuthoringDocument } from './projection.js';
import { resolveActiveUiResponsiveVariant } from './responsive.js';
import type {
  UiAuthoringDocumentProjectionV3,
  UiAuthoringProjectionContextV3,
  UiAuthoringResponsiveValueProjection,
  UiAuthoringSessionStateV3,
  UiDocumentCommandV3Context,
  UiResponsiveNodeOverride,
  UiResponsiveVariantDescriptor,
} from './types.js';

function projectedValues(
  base: Readonly<Record<string, UiValueSource>>,
  override: Readonly<Record<string, UiValueSource>> | undefined,
  variantId: string | undefined,
): Readonly<Record<string, UiAuthoringResponsiveValueProjection>> {
  const projected: Record<string, UiAuthoringResponsiveValueProjection> = {};
  for (const [propertyId, value] of Object.entries(base)) {
    projected[propertyId] = {
      value: cloneUiAuthoringJsonValue(value),
      provenance: { kind: 'base' },
    };
  }
  if (variantId !== undefined) {
    for (const [propertyId, value] of Object.entries(override ?? {})) {
      projected[propertyId] = {
        value: cloneUiAuthoringJsonValue(value),
        provenance: { kind: 'responsive-override', variantId },
      };
    }
  }
  return Object.freeze(projected);
}

export function projectUiAuthoringDocumentV3(
  state: UiAuthoringSessionStateV3,
  commandContext: UiDocumentCommandV3Context,
  projectionContext: UiAuthoringProjectionContextV3,
): UiAuthoringDocumentProjectionV3 {
  const compatibilityState = {
    document: toUiDocumentV2CompatibilityView(state.document),
    selectedNodeIds: state.selectedNodeIds,
    past: Object.freeze([]),
    future: Object.freeze([]),
  };
  const baseProjection = projectUiAuthoringDocument(compatibilityState, commandContext);
  const baseByNodeId = new Map(baseProjection.nodes.map((node) => [node.nodeId, node]));
  const rootAuthoring = readUiDocumentNodeAuthoringV3(state.document.root)!;
  const responsiveVariants = (rootAuthoring.responsiveVariants ??
    Object.freeze([])) as readonly UiResponsiveVariantDescriptor[];
  const activeVariant = resolveActiveUiResponsiveVariant(
    responsiveVariants,
    projectionContext.previewHostWidth,
  );
  const activeVariantId = activeVariant?.id;
  const nodes = collectWidgetNodes(state.document.root).map((entry) => {
    const nodeId = entry.widget.id as string;
    const authoring = readUiDocumentNodeAuthoringV3(entry.widget)!;
    const overrides = (authoring.responsiveOverrides ?? Object.freeze({})) as Readonly<
      Record<string, UiResponsiveNodeOverride>
    >;
    const activeOverride = activeVariantId === undefined ? undefined : overrides[activeVariantId];
    const base = baseByNodeId.get(nodeId)!;
    const layout = activeOverride?.layout ?? authoring.layout;
    const layoutProvenance =
      activeOverride?.layout === undefined || activeVariantId === undefined
        ? ({ kind: 'base' } as const)
        : ({ kind: 'responsive-override', variantId: activeVariantId } as const);
    return deepFreezeUiAuthoringValue({
      ...base,
      baseProperties: cloneUiAuthoringJsonValue(authoring.properties),
      ...(authoring.layout === undefined
        ? {}
        : {
            baseLayout: {
              strategyId: authoring.layout.strategyId,
              values: cloneUiAuthoringJsonValue(authoring.layout.values),
            },
          }),
      properties: projectedValues(
        authoring.properties,
        activeOverride?.properties,
        activeVariantId,
      ),
      ...(layout === undefined
        ? {}
        : {
            layout: {
              strategyId: layout.strategyId,
              values: Object.freeze(
                Object.fromEntries(
                  Object.entries(layout.values).map(([propertyId, value]) => [
                    propertyId,
                    { value: cloneUiAuthoringJsonValue(value), provenance: layoutProvenance },
                  ]),
                ),
              ),
              provenance: layoutProvenance,
            },
          }),
      responsiveOverrides: cloneUiAuthoringJsonValue(overrides),
    });
  });
  return deepFreezeUiAuthoringValue({
    documentId: state.document.documentId,
    documentRevision: state.document.revision,
    designSystem:
      state.document.designSystem === null
        ? null
        : cloneUiAuthoringJsonValue(state.document.designSystem),
    responsiveVariants: cloneUiAuthoringJsonValue(responsiveVariants),
    previewHostWidth: projectionContext.previewHostWidth,
    editingTarget: cloneUiAuthoringJsonValue(projectionContext.editingTarget),
    ...(activeVariantId === undefined ? {} : { activeResponsiveVariantId: activeVariantId }),
    nodes: Object.freeze(nodes),
    issues: Object.freeze([
      ...validateUiDocumentRootV3(state.document.root),
      ...baseProjection.issues,
    ]),
  });
}
