import type { UiComponentBindingDescriptor } from '@workbench-kit/contracts';

import { collectWidgetNodes } from '../widget/tree.js';
import { readUiDocumentNodeAuthoring, validateUiDocumentRoot } from './document.js';
import { cloneUiAuthoringJsonValue, deepFreezeUiAuthoringValue } from './immutability.js';
import type {
  UiAuthoringDocumentProjection,
  UiAuthoringInputBindingProjection,
  UiAuthoringSessionStateV2,
  UiDocumentCommandV2Context,
  UiDocumentCommandV2Issue,
  UiDocumentIssue,
} from './types.js';

function issue(
  code: UiDocumentCommandV2Issue['code'],
  message: string,
  nodeId: string,
  inputId?: string,
): UiDocumentCommandV2Issue {
  return Object.freeze({
    code,
    message,
    nodeId,
    ...(inputId === undefined ? {} : { inputId }),
  });
}

function bindingValue(
  bindings: Readonly<Record<string, string>> | undefined,
  inputId: string,
): string | undefined {
  if (bindings === undefined) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(bindings, inputId);
  return descriptor !== undefined &&
    Object.prototype.hasOwnProperty.call(descriptor, 'value') &&
    typeof descriptor.value === 'string'
    ? descriptor.value
    : undefined;
}

function projectInput(
  nodeId: string,
  input: UiComponentBindingDescriptor,
  bindings: Readonly<Record<string, string>> | undefined,
): UiAuthoringInputBindingProjection {
  const bindingId = bindingValue(bindings, input.id);
  const assignable = input.direction !== 'output';
  const issues = assignable
    ? Object.freeze([])
    : Object.freeze([
        issue(
          'input-output-only',
          `Component endpoint "${input.id}" is output-only.`,
          nodeId,
          input.id,
        ),
      ]);
  return deepFreezeUiAuthoringValue({
    input: cloneUiAuthoringJsonValue(input),
    ...(bindingId === undefined ? {} : { bindingId }),
    assignable,
    reason: assignable ? ('available' as const) : ('input-output-only' as const),
    provenance:
      bindingId === undefined
        ? null
        : {
            kind: 'document-input-binding' as const,
            path: `nodes.${nodeId}.$authoring.bindings.${input.id}`,
          },
    issues,
  });
}

export function projectUiAuthoringDocument(
  state: UiAuthoringSessionStateV2,
  context: UiDocumentCommandV2Context,
): UiAuthoringDocumentProjection {
  const issues: (UiDocumentIssue | UiDocumentCommandV2Issue)[] = [
    ...validateUiDocumentRoot(state.document.root),
  ];
  const selected = new Set(state.selectedNodeIds);
  const nodes = collectWidgetNodes(state.document.root).map((entry) => {
    const nodeId = entry.widget.id as string;
    const authoring = readUiDocumentNodeAuthoring(entry.widget)!;
    const descriptor = context.componentCatalog.component(authoring.component);
    if (!descriptor) {
      issues.push(
        issue(
          'component-unavailable',
          `Exact component ${authoring.component.id}@${authoring.component.version} is unavailable.`,
          nodeId,
        ),
      );
    }
    const declaredInputs = descriptor?.bindings ?? Object.freeze([]);
    const knownInputIds = new Set(declaredInputs.map((input) => input.id));
    for (const inputId of Object.keys(authoring.bindings ?? {})) {
      if (!knownInputIds.has(inputId)) {
        issues.push(
          issue(
            'input-unavailable',
            `Exact component input "${inputId}" is unavailable.`,
            nodeId,
            inputId,
          ),
        );
      }
    }
    return deepFreezeUiAuthoringValue({
      nodeId,
      component: cloneUiAuthoringJsonValue(authoring.component),
      selected: selected.has(nodeId),
      bindings: Object.freeze(
        declaredInputs.map((input) => projectInput(nodeId, input, authoring.bindings)),
      ),
    });
  });
  return deepFreezeUiAuthoringValue({
    documentId: state.document.documentId,
    documentRevision: state.document.revision,
    nodes: Object.freeze(nodes),
    issues: Object.freeze(issues),
  });
}
