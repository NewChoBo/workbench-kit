import type {
  UiComponentDescriptor,
  UiComponentRef,
  UiCompositeComponentDescriptor,
  UiPropertyDescriptor,
} from '@workbench-kit/contracts';

import { formatWidgetDocumentJson } from '../document/document.js';
import { mergeWidgetAssetInputs } from '../widget/asset-inputs.js';
import { collectWidgetNodes, type GenericWidget } from '../widget/tree.js';
import { isGenericWidget } from '../widget/type-guards.js';
import { applyUiDocumentCommandV3 } from './commands-v3.js';
import {
  isUiCompositionScalarMap,
  readUiCompositionDocumentId,
  readUiDocumentNodeAuthoringV3,
  validateUiDocumentRootV3,
} from './document-v3.js';
import { cloneUiAuthoringJsonValue, deepFreezeUiAuthoringValue } from './immutability.js';
import {
  admitUiDocumentCommandV3,
  type UiDocumentCommandV3AdmissionContext,
} from './semantic-admission-v3.js';
import { validateUiDocumentPropertySource } from './property-source-validation-v3.js';
import type { UiCompositionParameter, UiDocumentCommandV3, UiDocumentV3 } from './types.js';

export type UiCompositionScalar = string | number | boolean;

export interface UiCompositionDefinitionSource {
  readonly document: UiDocumentV3;
  /** Host-computed SHA-256 of the canonical UTF-8 source, independent of session revision. */
  readonly sourceHash: string;
}

export interface UiCompositionDependency {
  readonly documentId: string;
  readonly interfaceVersion: string;
  readonly sourceHash: string;
}

export interface UiCompositionParameterDescriptor extends UiCompositionParameter {
  readonly component: UiComponentDescriptor;
  readonly property: UiPropertyDescriptor;
  readonly defaultValue: UiCompositionScalar;
}

export type UiCompositionDiagnosticCode =
  | 'definition-unavailable'
  | 'definition-interface-mismatch'
  | 'invalid-composition-definition'
  | 'definition-target-unavailable'
  | 'nested-composition-instance'
  | 'composition-cycle'
  | 'invalid-instance-parameters';

export interface UiCompositionDiagnostic {
  readonly code: UiCompositionDiagnosticCode;
  readonly message: string;
  readonly definitionDocumentId?: string;
  readonly nodeId?: string;
  readonly propertyId?: string;
}

export interface UiCompositionDefinitionDescription {
  readonly descriptor: UiCompositeComponentDescriptor | null;
  readonly parameters: readonly UiCompositionParameterDescriptor[];
  readonly diagnostics: readonly UiCompositionDiagnostic[];
}

export interface UiCompositionNodeProvenance extends Omit<UiCompositionDependency, 'documentId'> {
  readonly consumerDocumentId: string;
  readonly instanceNodeId: string;
  readonly definitionDocumentId: string;
  readonly definitionNodeId: string;
  readonly parameters: Readonly<Record<string, 'override' | 'template'>>;
}

export interface UiCompositionResolution {
  /** Read-only projection. Authored instance wrappers retain their placement and clip in DIP. */
  readonly root: GenericWidget;
  readonly diagnostics: readonly UiCompositionDiagnostic[];
  readonly dependencies: readonly UiCompositionDependency[];
  readonly provenance: Readonly<Record<string, UiCompositionNodeProvenance>>;
}

function canonicalText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim();
}

/** Encodes an opaque local document identity; it never resolves a URL or path. */
export function uiCompositionComponentRef(
  documentId: string,
  interfaceVersion: string,
): UiComponentRef {
  if (!canonicalText(documentId) || !canonicalText(interfaceVersion)) {
    throw new TypeError('Composition document and interface ids must be canonical nonempty text.');
  }
  return Object.freeze({
    id: `ui-document:${encodeURIComponent(documentId)}`,
    version: interfaceVersion,
  });
}

function failure(
  code: UiCompositionDiagnosticCode,
  message: string,
  definitionDocumentId?: string,
  nodeId?: string,
  propertyId?: string,
): UiCompositionDiagnostic {
  return Object.freeze({
    code,
    message,
    ...(definitionDocumentId === undefined ? {} : { definitionDocumentId }),
    ...(nodeId === undefined ? {} : { nodeId }),
    ...(propertyId === undefined ? {} : { propertyId }),
  });
}

function unavailable(issue: UiCompositionDiagnostic): UiCompositionDefinitionDescription {
  return Object.freeze({
    descriptor: null,
    parameters: Object.freeze([]),
    diagnostics: Object.freeze([issue]),
  });
}

function boundedProperty(property: UiPropertyDescriptor): boolean {
  const type = property.value.type;
  if (type !== 'string' && type !== 'number' && type !== 'boolean') return false;
  const constraints = property.value.constraints ?? {};
  const keys = Object.keys(constraints);
  const allowed =
    type === 'number'
      ? ['min', 'max', 'step']
      : type === 'string'
        ? ['minLength', 'maxLength']
        : [];
  if (keys.some((key) => !allowed.includes(key))) return false;
  if (
    keys.some((key) => typeof constraints[key] !== 'number' || !Number.isFinite(constraints[key]))
  )
    return false;
  if (type === 'number') {
    if (constraints.step !== undefined && (constraints.step as number) <= 0) return false;
    if (
      constraints.min !== undefined &&
      constraints.max !== undefined &&
      (constraints.min as number) > (constraints.max as number)
    )
      return false;
  }
  if (type === 'string') {
    if (keys.some((key) => !Number.isInteger(constraints[key]) || (constraints[key] as number) < 0))
      return false;
    if (
      constraints.minLength !== undefined &&
      constraints.maxLength !== undefined &&
      (constraints.minLength as number) > (constraints.maxLength as number)
    )
      return false;
  }
  return true;
}

/** Derives an optional override surface from exact authored scalar targets and their policy. */
export function describeUiCompositionDefinition(
  document: UiDocumentV3,
  context: UiDocumentCommandV3AdmissionContext,
): UiCompositionDefinitionDescription {
  const documentId = document.documentId;
  try {
    if (
      validateUiDocumentRootV3(document.root).length > 0 ||
      formatWidgetDocumentJson(document.root) !== document.source
    ) {
      return unavailable(
        failure(
          'invalid-composition-definition',
          'The definition is not a canonical authored document.',
          documentId,
        ),
      );
    }
    const declaration = readUiDocumentNodeAuthoringV3(document.root)?.compositionDefinition;
    if (declaration === undefined) {
      return unavailable(
        failure(
          'definition-unavailable',
          'The requested document has no composition declaration.',
          documentId,
        ),
      );
    }
    const nodes = collectWidgetNodes(document.root);
    for (const { widget } of nodes) {
      if (widget.type !== 'composition-instance') continue;
      const nestedId = readUiCompositionDocumentId(
        readUiDocumentNodeAuthoringV3(widget)?.component,
      );
      return unavailable(
        failure(
          nestedId === documentId ? 'composition-cycle' : 'nested-composition-instance',
          'A composition definition cannot contain composition instances.',
          documentId,
        ),
      );
    }
    const parameters: UiCompositionParameterDescriptor[] = [];
    for (const parameter of declaration.parameters) {
      const target = nodes.find(({ widget }) => widget.id === parameter.target.nodeId)?.widget;
      const authoring = target === undefined ? null : readUiDocumentNodeAuthoringV3(target);
      const resolved =
        authoring === null ? undefined : context.componentCatalog.component(authoring.component);
      const matches =
        resolved?.properties?.filter((property) => property.id === parameter.target.propertyId) ??
        [];
      if (
        authoring === null ||
        resolved === undefined ||
        matches.length !== 1 ||
        resolved.id !== authoring.component.id ||
        resolved.version !== authoring.component.version
      ) {
        return unavailable(
          failure(
            'definition-target-unavailable',
            'The exact declared target component or property is unavailable.',
            documentId,
            parameter.target.nodeId,
            parameter.target.propertyId,
          ),
        );
      }
      const component = deepFreezeUiAuthoringValue(cloneUiAuthoringJsonValue(resolved));
      const property = component.properties!.find(
        (candidate) => candidate.id === parameter.target.propertyId,
      )!;
      const value = authoring.properties[parameter.target.propertyId];
      if (
        !boundedProperty(property) ||
        !Object.prototype.hasOwnProperty.call(authoring.properties, parameter.target.propertyId) ||
        !isUiCompositionScalarMap({ value }) ||
        value?.kind !== 'literal'
      ) {
        return unavailable(
          failure(
            'invalid-composition-definition',
            'Declared targets must have supported scalar descriptors and authored literal defaults.',
            documentId,
            parameter.target.nodeId,
            parameter.target.propertyId,
          ),
        );
      }
      const issue = validateUiDocumentPropertySource(
        component,
        parameter.target.nodeId,
        property,
        value,
        context.validateLiteral,
        'composition-target',
      );
      if (issue !== null) {
        return unavailable(
          failure(
            'invalid-composition-definition',
            issue.message,
            documentId,
            parameter.target.nodeId,
            property.id,
          ),
        );
      }
      parameters.push({
        ...parameter,
        component,
        property,
        defaultValue: value.value as UiCompositionScalar,
      });
    }
    const descriptor: UiCompositeComponentDescriptor = {
      ...uiCompositionComponentRef(documentId, declaration.interfaceVersion),
      kind: 'composite',
      compositionRef: documentId,
      designTime: { label: documentId },
      properties: parameters.map((parameter) => ({
        id: parameter.id,
        label: parameter.label,
        required: false,
        value: {
          ...parameter.property.value,
          defaultValue: parameter.defaultValue,
          allowedSources: ['literal'],
        },
      })),
    };
    return deepFreezeUiAuthoringValue({ descriptor, parameters, diagnostics: [] });
  } catch {
    return unavailable(
      failure(
        'invalid-composition-definition',
        'The definition or its exact target catalogue could not be safely read.',
        documentId,
      ),
    );
  }
}

interface InstanceResolution {
  readonly definition?: UiCompositionDefinitionSource;
  readonly dependency?: UiCompositionDependency;
  readonly description?: UiCompositionDefinitionDescription;
  readonly values?: Readonly<Record<string, UiCompositionScalar>>;
  readonly winners?: Readonly<Record<string, 'override' | 'template'>>;
  readonly diagnostics: readonly UiCompositionDiagnostic[];
}

/** Shared target-dependent check used by commands, saves and read projections. */
export function validateUiCompositionInstance(
  node: GenericWidget,
  context: UiDocumentCommandV3AdmissionContext,
): InstanceResolution {
  const authoring = readUiDocumentNodeAuthoringV3(node);
  const documentId = readUiCompositionDocumentId(authoring?.component);
  const nodeId = typeof node.id === 'string' ? node.id : undefined;
  const reject = (issue: UiCompositionDiagnostic): InstanceResolution => ({ diagnostics: [issue] });
  if (
    node.type !== 'composition-instance' ||
    documentId === null ||
    authoring === null ||
    !isUiCompositionScalarMap(authoring.properties)
  ) {
    return reject(
      failure(
        'invalid-instance-parameters',
        'The instance reference or scalar envelope is invalid.',
        undefined,
        nodeId,
      ),
    );
  }
  const definitions =
    context.compositionDefinitions?.filter((entry) => entry.document.documentId === documentId) ??
    [];
  const definition = definitions.length === 1 ? definitions[0] : undefined;
  if (definition === undefined || !/^[a-f0-9]{64}$/.test(definition.sourceHash)) {
    return reject(
      failure(
        'definition-unavailable',
        'The exact canonical definition source is unavailable.',
        documentId,
        nodeId,
      ),
    );
  }
  const declaration = readUiDocumentNodeAuthoringV3(
    definition.document.root,
  )?.compositionDefinition;
  if (declaration !== undefined && declaration.interfaceVersion !== authoring.component.version) {
    return reject(
      failure(
        'definition-interface-mismatch',
        'The requested definition interface is unavailable.',
        documentId,
        nodeId,
      ),
    );
  }
  const dependency = {
    documentId,
    interfaceVersion: authoring.component.version,
    sourceHash: definition.sourceHash,
  };
  const description = describeUiCompositionDefinition(definition.document, context);
  if (description.descriptor === null) {
    return {
      dependency,
      diagnostics: description.diagnostics.map((issue) => ({
        ...issue,
        ...(nodeId === undefined ? {} : { nodeId }),
      })),
    };
  }
  const ids = new Set(description.parameters.map((parameter) => parameter.id));
  if (Object.keys(authoring.properties).some((id) => !ids.has(id))) {
    return {
      dependency,
      diagnostics: [
        failure(
          'invalid-instance-parameters',
          'An instance override is not declared by the exact definition.',
          documentId,
          nodeId,
        ),
      ],
    };
  }
  const supplied = Object.fromEntries(
    Object.entries(authoring.properties).map(([id, value]) => [
      id,
      (value as { value: UiCompositionScalar }).value,
    ]),
  );
  const schema = Object.fromEntries(
    description.parameters.map((parameter) => [
      parameter.id,
      {
        type: parameter.property.value.type,
        default: parameter.defaultValue,
      },
    ]),
  );
  // Reuse only the scalar merge. Placeholder evaluation is deliberately not involved.
  const merged = mergeWidgetAssetInputs(
    {
      id: documentId,
      label: documentId,
      category: 'content',
      content: definition.document.root,
      inputsSchema: { properties: schema },
    },
    supplied,
  );
  const winners: Record<string, 'override' | 'template'> = {};
  for (const parameter of description.parameters) {
    const value = merged.inputs[parameter.id];
    const issue = validateUiDocumentPropertySource(
      parameter.component,
      parameter.target.nodeId,
      parameter.property,
      { kind: 'literal', value },
      context.validateLiteral,
      'composition-target',
    );
    if (issue !== null) {
      return {
        dependency,
        diagnostics: [
          failure('invalid-instance-parameters', issue.message, documentId, nodeId, parameter.id),
        ],
      };
    }
    winners[parameter.id] = Object.prototype.hasOwnProperty.call(authoring.properties, parameter.id)
      ? 'override'
      : 'template';
  }
  return {
    definition,
    dependency,
    description,
    values: merged.inputs as Readonly<Record<string, UiCompositionScalar>>,
    winners,
    diagnostics: [],
  };
}

function projectedId(tuple: readonly string[]): string {
  const bytes = new TextEncoder().encode(JSON.stringify(tuple));
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let encoded = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index]!;
    const b = bytes[index + 1];
    const c = bytes[index + 2];
    encoded += alphabet[a >> 2]! + alphabet[((a & 3) << 4) | ((b ?? 0) >> 4)]!;
    if (b !== undefined) encoded += alphabet[((b & 15) << 2) | ((c ?? 0) >> 6)]!;
    if (c !== undefined) encoded += alphabet[c & 63]!;
  }
  return `ui-instance:${encoded}`;
}

/** Expands one definition level into an ephemeral fixed-DIP viewport projection. */
export function resolveUiCompositionInstances(
  document: UiDocumentV3,
  context: UiDocumentCommandV3AdmissionContext,
): UiCompositionResolution {
  const diagnostics: UiCompositionDiagnostic[] = [];
  const dependencies = new Map<string, UiCompositionDependency>();
  const provenance: Record<string, UiCompositionNodeProvenance> = {};
  const visitChildren = (
    node: GenericWidget,
    visit: (child: GenericWidget) => GenericWidget,
  ): GenericWidget => ({
    ...node,
    ...(Array.isArray(node.children)
      ? { children: node.children.map((child) => (isGenericWidget(child) ? visit(child) : child)) }
      : {}),
    ...(isGenericWidget(node.child) ? { child: visit(node.child) } : {}),
  });
  const visit = (node: GenericWidget): GenericWidget => {
    if (node.type !== 'composition-instance') return visitChildren(node, visit);
    const resolved = validateUiCompositionInstance(node, context);
    diagnostics.push(...resolved.diagnostics);
    if (resolved.dependency !== undefined)
      dependencies.set(
        JSON.stringify([resolved.dependency.documentId, resolved.dependency.interfaceVersion]),
        resolved.dependency,
      );
    if (
      resolved.diagnostics.length > 0 ||
      resolved.definition === undefined ||
      resolved.description === undefined
    )
      return node;
    const definition = resolved.definition.document;
    const commands = resolved.description.parameters.map((parameter, index) => ({
      type: 'set-property' as const,
      commandId: `composition-parameter-${index}`,
      nodeId: parameter.target.nodeId,
      propertyId: parameter.target.propertyId,
      value: { kind: 'literal' as const, value: resolved.values![parameter.id]! },
    }));
    let expanded = definition.root as GenericWidget;
    if (commands.length > 0) {
      const command: UiDocumentCommandV3 = {
        type: 'batch',
        commandId: 'composition-expansion',
        commands,
      };
      const admission = admitUiDocumentCommandV3(definition, command, context);
      const applied =
        admission.status === 'accepted'
          ? applyUiDocumentCommandV3(definition, admission.command, context)
          : undefined;
      if (applied === undefined || applied.issues.length > 0) {
        diagnostics.push(
          failure(
            'invalid-instance-parameters',
            'The declared target substitution could not be admitted.',
            definition.documentId,
            node.id as string,
          ),
        );
        return node;
      }
      expanded = applied.document.root;
    }
    const project = (target: GenericWidget): GenericWidget => {
      const id = projectedId([
        document.documentId,
        node.id as string,
        definition.documentId,
        target.id as string,
      ]);
      provenance[id] = {
        interfaceVersion: resolved.dependency!.interfaceVersion,
        sourceHash: resolved.dependency!.sourceHash,
        consumerDocumentId: document.documentId,
        instanceNodeId: node.id as string,
        definitionDocumentId: definition.documentId,
        definitionNodeId: target.id as string,
        parameters: resolved.winners!,
      };
      return visitChildren({ ...target, id }, project);
    };
    // The wrapper is the viewport: placement stays local, child coordinates remain unscaled.
    return { ...node, child: project(expanded) };
  };
  return deepFreezeUiAuthoringValue({
    root: visit(document.root),
    diagnostics,
    dependencies: [...dependencies.values()].sort(
      (left, right) =>
        left.documentId.localeCompare(right.documentId) ||
        left.interfaceVersion.localeCompare(right.interfaceVersion),
    ),
    provenance,
  });
}
