import type { UiValueSource } from '@workbench-kit/contracts';

import { createWidgetDocument, formatWidgetDocumentJson } from '../document/document.js';
import { parseJsonWidgetData, type JsonWidgetNode } from '../jdw/node.js';
import { isObjectRecord } from '../is-object-record.js';
import { isGenericWidget } from '../widget/type-guards.js';
import { collectWidgetNodes, type GenericWidget } from '../widget/tree.js';
import {
  readUiDocumentNodeAuthoring,
  isStructurallyValidUiValueSource,
  validateUiDocumentRoot,
  validateUiDocumentWrapperIdentity,
} from './document.js';
import { deepFreezeUiAuthoringValue } from './immutability.js';
import {
  canonicalizeUiResponsiveVariantCatalog,
  validateUiResponsiveVariantCatalog,
} from './responsive.js';
import {
  UI_DOCUMENT_AUTHORING_ARG,
  type CreateUiDocumentV3Result,
  type UiDocument,
  type UiDocumentIssue,
  type UiDocumentNode,
  type UiDocumentNodeAuthoringV3,
  type UiDocumentNodeV3,
  type UiDocumentV3,
  type UiDocumentV3Issue,
  type UiResponsiveNodeOverride,
  type UiResponsiveVariantDescriptor,
} from './types.js';

function isCanonicalText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim();
}

function readOwnDataValue(
  value: object,
  key: PropertyKey,
): { readonly present: boolean; readonly value?: unknown; readonly valid: boolean } {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (descriptor === undefined) return { present: false, valid: true };
  if (
    descriptor.enumerable !== true ||
    !Object.prototype.hasOwnProperty.call(descriptor, 'value')
  ) {
    return { present: true, valid: false };
  }
  return { present: true, valid: true, value: descriptor.value };
}

function issue(
  code: UiDocumentV3Issue['code'],
  message: string,
  path: string,
  context: Partial<UiDocumentV3Issue> = {},
): UiDocumentV3Issue {
  return Object.freeze({ code, message, path, ...context });
}

function validateResponsiveValueMap(
  value: unknown,
  path: string,
  nodeId: string | undefined,
  variantId: string,
): readonly UiDocumentV3Issue[] {
  if (!isObjectRecord(value)) {
    return Object.freeze([
      issue(
        'invalid-responsive-overrides',
        'Responsive property/layout overrides must be canonical UiValueSource maps.',
        path,
        { ...(nodeId === undefined ? {} : { nodeId }), variantId },
      ),
    ]);
  }
  const issues: UiDocumentV3Issue[] = [];
  for (const [propertyId, source] of Object.entries(value)) {
    const validSource = isStructurallyValidUiValueSource(source);
    if (!isCanonicalText(propertyId) || !validSource) {
      issues.push(
        issue(
          'invalid-responsive-overrides',
          'Responsive override ids and values must be canonical and structurally valid.',
          `${path}.${propertyId}`,
          { ...(nodeId === undefined ? {} : { nodeId }), propertyId, variantId },
        ),
      );
    }
  }
  return Object.freeze(issues);
}

function compatibilityRoot(root: GenericWidget): GenericWidget {
  const ownAuthoring = readOwnDataValue(root, UI_DOCUMENT_AUTHORING_ARG);
  if (!ownAuthoring.valid || !isObjectRecord(ownAuthoring.value)) return root;
  if (ownAuthoring.value.documentSchemaVersion !== 2) return root;
  return {
    ...root,
    [UI_DOCUMENT_AUTHORING_ARG]: {
      ...ownAuthoring.value,
      documentSchemaVersion: 1,
    },
  };
}

export function validateUiDocumentRootV3(
  root: GenericWidget,
): readonly (UiDocumentIssue | UiDocumentV3Issue)[] {
  const issues: (UiDocumentIssue | UiDocumentV3Issue)[] = [
    ...validateUiDocumentRoot(compatibilityRoot(root)),
  ];
  const rootAuthoringValue = readOwnDataValue(root, UI_DOCUMENT_AUTHORING_ARG);
  const rootAuthoring =
    rootAuthoringValue.valid && isObjectRecord(rootAuthoringValue.value)
      ? rootAuthoringValue.value
      : undefined;
  const rawVersion = rootAuthoring?.documentSchemaVersion;
  const supportsResponsiveState = rawVersion === 2;
  const catalogValue =
    rootAuthoring === undefined
      ? { present: false, valid: true }
      : readOwnDataValue(rootAuthoring, 'responsiveVariants');
  let catalog: readonly UiResponsiveVariantDescriptor[] = Object.freeze([]);
  if (catalogValue.present) {
    if (!supportsResponsiveState) {
      issues.push(
        issue(
          'responsive-state-requires-document-schema-version',
          'Responsive state requires UI document schema version 2.',
          `root.${UI_DOCUMENT_AUTHORING_ARG}.responsiveVariants`,
        ),
      );
    }
    if (!catalogValue.valid) {
      issues.push(
        issue(
          'invalid-responsive-variant-catalog',
          'The responsive variant catalog must be an enumerable data property.',
          `root.${UI_DOCUMENT_AUTHORING_ARG}.responsiveVariants`,
        ),
      );
    } else {
      const catalogIssues = validateUiResponsiveVariantCatalog(
        catalogValue.value,
        `root.${UI_DOCUMENT_AUTHORING_ARG}.responsiveVariants`,
      );
      issues.push(...catalogIssues);
      if (catalogIssues.length === 0 && Array.isArray(catalogValue.value)) {
        catalog = canonicalizeUiResponsiveVariantCatalog(
          catalogValue.value as readonly UiResponsiveVariantDescriptor[],
        );
      }
    }
  }
  const variantIds = new Set(catalog.map((variant) => variant.id));

  for (const entry of collectWidgetNodes(root)) {
    const path =
      entry.path.length === 0
        ? 'root'
        : `root.${entry.path.map((segment) => (segment.kind === 'child' ? 'child' : `children[${segment.index}]`)).join('.')}`;
    const nodeIdValue = readOwnDataValue(entry.widget, 'id');
    const nodeId =
      nodeIdValue.valid && isCanonicalText(nodeIdValue.value) ? nodeIdValue.value : undefined;
    const authoringValue = readOwnDataValue(entry.widget, UI_DOCUMENT_AUTHORING_ARG);
    if (!authoringValue.valid || !isObjectRecord(authoringValue.value)) continue;
    const authoring = authoringValue.value;
    const nodeCatalog = readOwnDataValue(authoring, 'responsiveVariants');
    if (entry.path.length > 0 && nodeCatalog.present) {
      issues.push(
        issue(
          'nonroot-responsive-variant-catalog',
          'Only the semantic root may own the responsive variant catalog.',
          `${path}.${UI_DOCUMENT_AUTHORING_ARG}.responsiveVariants`,
          nodeId === undefined ? {} : { nodeId },
        ),
      );
    }

    const overridesValue = readOwnDataValue(authoring, 'responsiveOverrides');
    if (!overridesValue.present) continue;
    if (!supportsResponsiveState) {
      issues.push(
        issue(
          'responsive-state-requires-document-schema-version',
          'Responsive state requires UI document schema version 2.',
          `${path}.${UI_DOCUMENT_AUTHORING_ARG}.responsiveOverrides`,
          nodeId === undefined ? {} : { nodeId },
        ),
      );
    }
    if (!overridesValue.valid || !isObjectRecord(overridesValue.value)) {
      issues.push(
        issue(
          'invalid-responsive-overrides',
          'Responsive overrides must be an exact variant-to-override map.',
          `${path}.${UI_DOCUMENT_AUTHORING_ARG}.responsiveOverrides`,
          nodeId === undefined ? {} : { nodeId },
        ),
      );
      continue;
    }

    for (const [variantId, override] of Object.entries(overridesValue.value)) {
      const overridePath = `${path}.${UI_DOCUMENT_AUTHORING_ARG}.responsiveOverrides.${variantId}`;
      if (!isCanonicalText(variantId) || !variantIds.has(variantId)) {
        issues.push(
          issue(
            'responsive-variant-not-found',
            `Responsive variant "${variantId}" is not present in the root catalog.`,
            overridePath,
            { ...(nodeId === undefined ? {} : { nodeId }), variantId },
          ),
        );
      }
      if (!isObjectRecord(override)) {
        issues.push(
          issue(
            'invalid-responsive-overrides',
            'Each responsive override must be a plain declarative object.',
            overridePath,
            { ...(nodeId === undefined ? {} : { nodeId }), variantId },
          ),
        );
        continue;
      }
      if (override.properties !== undefined) {
        issues.push(
          ...validateResponsiveValueMap(
            override.properties,
            `${overridePath}.properties`,
            nodeId,
            variantId,
          ),
        );
      }
      if (override.layout !== undefined) {
        if (!isObjectRecord(override.layout) || !isCanonicalText(override.layout.strategyId)) {
          issues.push(
            issue(
              'invalid-responsive-overrides',
              'Responsive layout overrides require one canonical strategy id.',
              `${overridePath}.layout`,
              { ...(nodeId === undefined ? {} : { nodeId }), variantId },
            ),
          );
        }
        issues.push(
          ...validateResponsiveValueMap(
            isObjectRecord(override.layout) ? override.layout.values : undefined,
            `${overridePath}.layout.values`,
            nodeId,
            variantId,
          ),
        );
      }
    }
  }

  return Object.freeze(issues);
}

function sortedValueMap(
  value: Readonly<Record<string, UiValueSource>>,
): Readonly<Record<string, UiValueSource>> {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(value).sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)),
    ),
  );
}

function canonicalOverride(value: UiResponsiveNodeOverride): UiResponsiveNodeOverride | null {
  const properties = value.properties === undefined ? undefined : sortedValueMap(value.properties);
  const layout =
    value.layout === undefined
      ? undefined
      : Object.freeze({
          strategyId: value.layout.strategyId,
          values: sortedValueMap(value.layout.values),
        });
  if ((properties === undefined || Object.keys(properties).length === 0) && layout === undefined) {
    return null;
  }
  return Object.freeze({
    ...(properties === undefined || Object.keys(properties).length === 0 ? {} : { properties }),
    ...(layout === undefined ? {} : { layout }),
  });
}

export function canonicalizeUiDocumentRootV3(root: GenericWidget): GenericWidget {
  const visit = (widget: GenericWidget, semanticRoot: boolean): GenericWidget => {
    const rawAuthoring = widget[UI_DOCUMENT_AUTHORING_ARG] as Readonly<Record<string, unknown>>;
    const nextAuthoring = { ...rawAuthoring } as Record<string, unknown>;
    if (semanticRoot && Array.isArray(rawAuthoring.responsiveVariants)) {
      const variants = canonicalizeUiResponsiveVariantCatalog(
        rawAuthoring.responsiveVariants as readonly UiResponsiveVariantDescriptor[],
      );
      if (variants.length === 0) delete nextAuthoring.responsiveVariants;
      else nextAuthoring.responsiveVariants = variants;
    }
    if (isObjectRecord(rawAuthoring.responsiveOverrides)) {
      const overrides = Object.create(null) as Record<string, UiResponsiveNodeOverride>;
      for (const [variantId, value] of Object.entries(rawAuthoring.responsiveOverrides).sort(
        ([left], [right]) => (left < right ? -1 : left > right ? 1 : 0),
      )) {
        const canonical = canonicalOverride(value as UiResponsiveNodeOverride);
        if (canonical !== null) {
          Object.defineProperty(overrides, variantId, {
            configurable: true,
            enumerable: true,
            writable: true,
            value: canonical,
          });
        }
      }
      if (Object.keys(overrides).length === 0) delete nextAuthoring.responsiveOverrides;
      else nextAuthoring.responsiveOverrides = overrides;
    }

    const next: GenericWidget = { ...widget, [UI_DOCUMENT_AUTHORING_ARG]: nextAuthoring };
    if (Array.isArray(widget.children)) {
      next.children = widget.children.map((child) =>
        isGenericWidget(child) ? visit(child, false) : child,
      );
    }
    if (isGenericWidget(widget.child)) next.child = visit(widget.child, false);
    return next;
  };
  return visit(root, true);
}

function createDocument(
  documentId: string,
  revision: number,
  root: GenericWidget,
): CreateUiDocumentV3Result {
  const issues: (UiDocumentIssue | UiDocumentV3Issue)[] = [];
  if (!isCanonicalText(documentId)) {
    issues.push({
      code: 'blank-document-id',
      message: 'UI document id must be non-blank and already trimmed.',
      path: 'documentId',
    });
  }
  issues.push(...validateUiDocumentRootV3(root));
  if (issues.length > 0) return { document: null, issues: Object.freeze(issues) };

  let canonicalRoot: GenericWidget;
  let source: string;
  try {
    canonicalRoot = canonicalizeUiDocumentRootV3(root);
    source = formatWidgetDocumentJson(canonicalRoot);
  } catch (error) {
    return {
      document: null,
      issues: Object.freeze([
        ...issues,
        {
          code: 'invalid-source',
          message: error instanceof Error ? error.message : String(error),
          path: 'source',
        },
      ]),
    };
  }
  const finalIssues = validateUiDocumentRootV3(canonicalRoot);
  if (finalIssues.length > 0) return { document: null, issues: finalIssues };
  const designSystem = readUiDocumentNodeAuthoringV3(canonicalRoot)?.designSystem ?? null;
  return {
    document: deepFreezeUiAuthoringValue({
      documentId,
      revision,
      source,
      root: canonicalRoot as UiDocumentNodeV3,
      designSystem,
    }),
    issues: Object.freeze([]),
  };
}

export function createUiDocumentV3(documentId: string, source: string): CreateUiDocumentV3Result {
  const parsed = parseJsonWidgetData(source);
  if (parsed.parseError !== null || parsed.value === null) {
    return {
      document: null,
      issues: Object.freeze([
        {
          code: 'invalid-source',
          message: parsed.parseError ?? 'UI document source could not be parsed.',
          path: 'source',
        },
      ]),
    };
  }
  const raw = JSON.parse(source) as JsonWidgetNode;
  const wrapperIssues = validateUiDocumentWrapperIdentity(raw);
  const widgetDocument = createWidgetDocument(source);
  if (widgetDocument.root === null) {
    return {
      document: null,
      issues: Object.freeze([
        ...wrapperIssues,
        {
          code: 'invalid-source',
          message: widgetDocument.parseError ?? 'UI document source could not be projected.',
          path: 'source',
        },
      ]),
    };
  }
  if (wrapperIssues.length > 0) return { document: null, issues: wrapperIssues };
  return createDocument(documentId, 0, widgetDocument.root);
}

export function createUiDocumentV3FromRoot(
  documentId: string,
  revision: number,
  root: GenericWidget,
): CreateUiDocumentV3Result {
  return createDocument(documentId, revision, root);
}

export function upgradeUiDocumentToV3(document: UiDocument): UiDocumentV3 {
  const upgraded = createUiDocumentV3FromRoot(
    document.documentId,
    document.revision,
    document.root,
  );
  if (upgraded.document === null) {
    throw new TypeError(upgraded.issues[0]?.message ?? 'UI document cannot be upgraded to V3.');
  }
  return upgraded.document;
}

export function readUiDocumentNodeAuthoringV3(
  widget: GenericWidget,
): UiDocumentNodeAuthoringV3 | null {
  const authoringValue = readOwnDataValue(widget, UI_DOCUMENT_AUTHORING_ARG);
  if (!authoringValue.valid || !isObjectRecord(authoringValue.value)) return null;
  const raw = authoringValue.value;
  const base = readUiDocumentNodeAuthoring(
    raw.documentSchemaVersion === 2
      ? ({
          ...widget,
          [UI_DOCUMENT_AUTHORING_ARG]: { ...raw, documentSchemaVersion: 1 },
        } as GenericWidget)
      : widget,
  );
  if (base === null) return null;
  return {
    ...base,
    ...(raw.documentSchemaVersion === 1 || raw.documentSchemaVersion === 2
      ? { documentSchemaVersion: raw.documentSchemaVersion }
      : {}),
    ...(Array.isArray(raw.responsiveVariants) && raw.responsiveVariants.length > 0
      ? { responsiveVariants: raw.responsiveVariants as readonly UiResponsiveVariantDescriptor[] }
      : {}),
    ...(isObjectRecord(raw.responsiveOverrides) && Object.keys(raw.responsiveOverrides).length > 0
      ? {
          responsiveOverrides: raw.responsiveOverrides as Readonly<
            Record<string, UiResponsiveNodeOverride>
          >,
        }
      : {}),
  };
}

export function formatUiDocumentV3(document: UiDocumentV3): string {
  return document.source;
}

export function toUiDocumentV2CompatibilityView(document: UiDocumentV3): UiDocument {
  const root = compatibilityRoot(document.root);
  return deepFreezeUiAuthoringValue({
    ...document,
    source: formatWidgetDocumentJson(root),
    root: root as UiDocumentNode,
  });
}
