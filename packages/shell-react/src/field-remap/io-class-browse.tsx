import { useMemo, type JSX } from 'react';
import {
  projectSourceFields,
  projectTargetSlots,
  type SourceField,
  type TargetSlot,
} from '@workbench-kit/field-remap';
import { SideBarRow } from '@workbench-kit/react/layout';
import { Badge } from '@workbench-kit/react/primitives';

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
  readonly labels?: {
    readonly hiddenBadge?: string;
    readonly classRefTitle?: string;
  };
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
  labels,
}: {
  readonly nodes: readonly (SourceField | TargetSlot)[];
  readonly emptyLabel: string;
  readonly labels: FieldRemapIoClassBrowseProps['labels'];
}): JSX.Element {
  if (nodes.length === 0) {
    return <p className="workbench-field-remap-io-browse__empty">{emptyLabel}</p>;
  }
  return (
    <ul className="workbench-field-remap-io-browse__fields">
      {nodes.map((node) => (
        <li key={node.id}>
          <SideBarRow className="workbench-field-remap-io-browse__row" data-static="true">
            <code className="workbench-field-remap-io-browse__path">{node.path ?? node.label}</code>
            <span className="workbench-field-remap-io-browse__meta">
              {node.dataType ? <span>{node.dataType}</span> : null}
              {node.classRef ? (
                <Badge
                  className="workbench-field-remap-io-browse__badge"
                  title={labels?.classRefTitle ?? 'classRef'}
                  variant="muted"
                >
                  {formatClassRef(node.classRef)}
                </Badge>
              ) : null}
              {node.hidden === true ? (
                <Badge
                  className="workbench-field-remap-io-browse__badge"
                  title="hidden"
                  variant="muted"
                >
                  {labels?.hiddenBadge ?? 'Hidden'}
                </Badge>
              ) : null}
            </span>
          </SideBarRow>
          {node.children?.length ? (
            <FieldTree emptyLabel={emptyLabel} labels={labels} nodes={node.children} />
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
  labels,
}: {
  readonly title: string;
  readonly nodes: readonly (SourceField | TargetSlot)[];
  readonly emptyLabel: string;
  readonly labels: FieldRemapIoClassBrowseProps['labels'];
}): JSX.Element {
  return (
    <section aria-label={title} className="workbench-field-remap-io-browse__section">
      <h3 className="workbench-field-remap-io-browse__section-title">{title}</h3>
      {nodes.length === 0 ? (
        <p className="workbench-field-remap-io-browse__empty">{emptyLabel}</p>
      ) : (
        <ul className="workbench-field-remap-io-browse__ports">
          {nodes.map((node) => (
            <li className="workbench-field-remap-io-browse__port" key={node.id}>
              <SideBarRow
                className="workbench-field-remap-io-browse__port-title"
                data-static="true"
              >
                <span className="workbench-field-remap-io-browse__port-id">{node.label}</span>
                <span className="workbench-field-remap-io-browse__port-meta">
                  {node.classRef ? formatClassRef(node.classRef) : node.id}
                  {node.hidden === true ? ` · ${labels?.hiddenBadge ?? 'Hidden'}` : ''}
                </span>
              </SideBarRow>
              <FieldTree
                emptyLabel={emptyLabel}
                labels={labels}
                nodes={node.children?.length ? node.children : [node]}
              />
            </li>
          ))}
        </ul>
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
  labels,
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
      <PortSection
        emptyLabel={emptyLabel}
        labels={labels}
        nodes={projectedSources}
        title={sourcesTitle}
      />
      <PortSection
        emptyLabel={emptyLabel}
        labels={labels}
        nodes={projectedTargets}
        title={targetsTitle}
      />
    </div>
  );
}
