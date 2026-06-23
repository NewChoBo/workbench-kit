import { useMemo, type ReactNode } from 'react';
import {
  parseJsonWidgetData,
  resolveJsonWidgetValues,
  validateJsonWidgetNode,
  type JsonWidgetValueMap,
  type JsonWidgetNode,
  type ValidationIssue,
} from '@workbench-kit/jdw';

import { renderJdwWithLayout, type CssRenderBackendOptions } from './cssRenderBackend.js';

export interface RenderJdwOptions extends CssRenderBackendOptions {
  readonly strictKnownTypes?: boolean | undefined;
  readonly values?: JsonWidgetValueMap | undefined;
}

export function renderJdwNode(node: JsonWidgetNode, options: RenderJdwOptions = {}): ReactNode {
  return renderJdwWithLayout(resolveJsonWidgetValues(node, options.values), options);
}

export function renderJdw(source: string, options: RenderJdwOptions = {}): ReactNode {
  const parsed = parseJsonWidgetData(source);
  if (parsed.parseError !== null || parsed.value === null) {
    return null;
  }

  const node = resolveJsonWidgetValues(parsed.value, options.values);
  const issues: ValidationIssue[] = [];
  validateJsonWidgetNode(node, 'root', issues, {
    registeredTypes: options.registry?.types(),
    strictKnownTypes: options.strictKnownTypes,
  });
  if (issues.length > 0) {
    return null;
  }

  return renderJdwWithLayout(node, options);
}

export function useRenderJdw(source: string, options: RenderJdwOptions = {}): ReactNode {
  const {
    registry,
    emptyLabel,
    layoutConstraints,
    selectedPath,
    strictKnownTypes,
    onSelectPath,
    values,
  } = options;
  return useMemo(
    () =>
      renderJdw(source, {
        registry,
        emptyLabel,
        layoutConstraints,
        selectedPath,
        strictKnownTypes,
        onSelectPath,
        values,
      }),
    [
      emptyLabel,
      layoutConstraints,
      onSelectPath,
      registry,
      selectedPath,
      source,
      strictKnownTypes,
      values,
    ],
  );
}
