import { useMemo, type JSX } from 'react';
import {
  projectSourceFields,
  projectTargetSlots,
  type SourceField,
  type TargetSlot,
} from '@workbench-kit/field-remap';

export type FieldRemapIoChrome = 'browse' | 'edit' | 'none';

export interface FieldRemapIoClassBrowseProps {
  readonly sources: readonly SourceField[];
  readonly targets: readonly TargetSlot[];
  /**
   * When `false` (default), omit `hidden` ports/fields.
   * When `true`, keep them and show a Hidden badge.
   */
  readonly includeHidden?: boolean;
  readonly sourcesTitle?: string;
  readonly targetsTitle?: string;
  readonly className?: string;
  readonly emptyLabel?: string;
}

export function resolveFieldRemapIoChrome(
  ioChrome: FieldRemapIoChrome | undefined,
  editableShapes: boolean,
): FieldRemapIoChrome {
  if (ioChrome) {
    return ioChrome;
  }
  return editableShapes ? 'edit' : 'none';
}

function formatClassRef(classRef: { readonly id: string; readonly version: number }): string {
  return `${classRef.id}@${classRef.version}`;
}

function FieldTree({
  nodes,
  emptyLabel,
}: {
  readonly nodes: readonly (SourceField | TargetSlot)[];
  readonly emptyLabel: string;
}): JSX.Element {
  if (nodes.length === 0) {
    return <p className="workbench-field-remap-io-browse__empty">{emptyLabel}</p>;
  }
  return (
    <ul className="workbench-field-remap-io-browse__fields">
      {nodes.map((node) => (
        <li key={node.id}>
          <div className="workbench-field-remap-io-browse__row">
            <code className="workbench-field-remap-io-browse__path">{node.path ?? node.label}</code>
            <span className="workbench-field-remap-io-browse__meta">
              {node.dataType ? <span>{node.dataType}</span> : null}
              {node.classRef ? (
                <span className="workbench-field-remap-io-browse__badge" title="classRef">
                  {formatClassRef(node.classRef)}
                </span>
              ) : null}
              {node.hidden === true ? (
                <span className="workbench-field-remap-io-browse__badge" title="hidden">
                  Hidden
                </span>
              ) : null}
            </span>
          </div>
          {node.children?.length ? (
            <FieldTree emptyLabel={emptyLabel} nodes={node.children} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function PortSection({
  title,
  nodes,
  emptyLabel,
}: {
  readonly title: string;
  readonly nodes: readonly (SourceField | TargetSlot)[];
  readonly emptyLabel: string;
}): JSX.Element {
  return (
    <section aria-label={title} className="workbench-field-remap-io-browse__section">
      <h3 className="workbench-field-remap-io-browse__section-title">{title}</h3>
      {nodes.length === 0 ? (
        <p className="workbench-field-remap-io-browse__empty">{emptyLabel}</p>
      ) : (
        nodes.map((node) => (
          <div className="workbench-field-remap-io-browse__port" key={node.id}>
            <p className="workbench-field-remap-io-browse__port-title">
              <span className="workbench-field-remap-io-browse__port-id">{node.label}</span>
              <span className="workbench-field-remap-io-browse__port-meta">
                {node.classRef ? formatClassRef(node.classRef) : node.id}
                {node.hidden === true ? ' · Hidden' : ''}
              </span>
            </p>
            <FieldTree
              emptyLabel={emptyLabel}
              nodes={node.children?.length ? node.children : [node]}
            />
          </div>
        ))
      )}
    </section>
  );
}

/**
 * Read-only I/O chrome: browse source/target trees with optional `classRef` and `hidden`.
 * Prefer this over {@link FieldRemapShapeIoEditor} when hosts author topology on Flow and
 * only need to inspect declared shapes.
 */
export function FieldRemapIoClassBrowse({
  sources,
  targets,
  includeHidden = false,
  sourcesTitle = 'Inputs',
  targetsTitle = 'Outputs',
  className,
  emptyLabel = 'No fields',
}: FieldRemapIoClassBrowseProps): JSX.Element {
  const projectedSources = useMemo(
    () => projectSourceFields(sources, { includeHidden }),
    [includeHidden, sources],
  );
  const projectedTargets = useMemo(
    () => projectTargetSlots(targets, { includeHidden }),
    [includeHidden, targets],
  );

  return (
    <div
      className={['workbench-field-remap-io-browse', className].filter(Boolean).join(' ')}
      data-testid="field-remap-io-browse"
    >
      <PortSection emptyLabel={emptyLabel} nodes={projectedSources} title={sourcesTitle} />
      <PortSection emptyLabel={emptyLabel} nodes={projectedTargets} title={targetsTitle} />
    </div>
  );
}
