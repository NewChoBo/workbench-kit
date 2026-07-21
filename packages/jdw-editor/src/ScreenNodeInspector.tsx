import { useMemo, useState, type ReactNode } from 'react';
import type { ScreenNode, ScreenTextStyle } from '@workbench-kit/jdw';
import {
  NumberInput,
  TextInput,
  WorkbenchPropertyHint,
  WorkbenchPropertyNumberRow,
  WorkbenchPropertyPanel,
  WorkbenchPropertyRow,
  WorkbenchPropertySearch,
  WorkbenchPropertySection,
  WorkbenchPropertyStack,
  WorkbenchPropertyTextRow,
  filterWorkbenchPropertyFields,
  isWorkbenchPropertySearchActive,
  type WorkbenchPropertyFieldManifestEntry,
} from '@workbench-kit/react/primitives';

export interface ScreenNodeInspectorProps {
  readonly node: ScreenNode;
  readonly parentKind?: ScreenNode['kind'] | undefined;
  readonly onChange: (node: ScreenNode) => void;
}

function readStyle(node: Extract<ScreenNode, { kind: 'text' | 'panel' }>): ScreenTextStyle {
  return node.style ?? {};
}

function patchStyle(
  node: Extract<ScreenNode, { kind: 'text' | 'panel' }>,
  patch: ScreenTextStyle,
): ScreenNode {
  return { ...node, style: { ...node.style, ...patch } };
}

function OptionalNumberRow({
  label,
  testId,
  value,
  onChange,
}: {
  readonly label: string;
  readonly testId: string;
  readonly value: number | undefined;
  readonly onChange: (value: number | undefined) => void;
}) {
  return (
    <WorkbenchPropertyRow label={label} htmlFor={testId}>
      <NumberInput
        id={testId}
        data-testid={testId}
        controlWidth="full"
        nullable
        value={value}
        onEmptyValue={() => onChange(undefined)}
        onValueChange={(next) => onChange(next)}
      />
    </WorkbenchPropertyRow>
  );
}

function usePropertyVisibility(
  fields: readonly WorkbenchPropertyFieldManifestEntry[],
  query: string,
) {
  const filtered = useMemo(() => filterWorkbenchPropertyFields({ fields, query }), [fields, query]);
  const visible = useMemo(() => new Set(filtered.fieldIds), [filtered.fieldIds]);
  const sections = useMemo(() => new Set(filtered.sectionIds), [filtered.sectionIds]);
  const searching = isWorkbenchPropertySearchActive(query);
  return {
    searching,
    showField: (id: string) => !searching || visible.has(id),
    showSection: (sectionId: string) => !searching || sections.has(sectionId),
  };
}

function InspectorShell({
  query,
  onQueryChange,
  children,
}: {
  readonly query: string;
  readonly onQueryChange: (value: string) => void;
  readonly children: ReactNode;
}) {
  return (
    <WorkbenchPropertyPanel
      className="jdw-screen-node-inspector"
      data-testid="screen-spec-node-inspector"
    >
      <WorkbenchPropertySearch
        data-testid="screen-spec-props-search"
        value={query}
        onValueChange={onQueryChange}
      />
      <WorkbenchPropertyStack>{children}</WorkbenchPropertyStack>
    </WorkbenchPropertyPanel>
  );
}

function ContentNodeInspector({
  node,
  parentKind,
  onChange,
}: {
  readonly node: Extract<ScreenNode, { kind: 'text' | 'panel' }>;
  readonly parentKind?: ScreenNode['kind'] | undefined;
  readonly onChange: (node: ScreenNode) => void;
}) {
  const [query, setQuery] = useState('');
  const style = readStyle(node);
  const fields = useMemo((): WorkbenchPropertyFieldManifestEntry[] => {
    const next: WorkbenchPropertyFieldManifestEntry[] = [
      { id: 'content', label: 'Content', sectionId: 'content', keywords: ['text'] },
    ];
    if (node.kind === 'panel') {
      next.push({
        id: 'panel-background',
        label: 'Panel background',
        sectionId: 'content',
        keywords: ['fill'],
      });
    }
    next.push(
      { id: 'color', label: 'Text color', sectionId: 'style', keywords: ['colour'] },
      { id: 'font-size', label: 'Font size', sectionId: 'style', keywords: ['typography'] },
      { id: 'background', label: 'Background', sectionId: 'style' },
    );
    if (parentKind === 'grid') {
      next.push(
        { id: 'col', label: 'Column', sectionId: 'placement', keywords: ['grid'] },
        { id: 'row', label: 'Row', sectionId: 'placement', keywords: ['grid'] },
        { id: 'col-span', label: 'Column span', sectionId: 'placement', keywords: ['grid'] },
        { id: 'row-span', label: 'Row span', sectionId: 'placement', keywords: ['grid'] },
      );
    }
    return next;
  }, [node.kind, parentKind]);
  const { showField, showSection, searching } = usePropertyVisibility(fields, query);

  return (
    <InspectorShell query={query} onQueryChange={setQuery}>
      {showSection('content') ? (
        <WorkbenchPropertySection collapsible title="Content">
          {showField('content') ? (
            <WorkbenchPropertyRow label="Content" htmlFor="screen-spec-field-content">
              <TextInput
                id="screen-spec-field-content"
                data-testid="screen-spec-field-content"
                controlWidth="full"
                value={node.content}
                onValueChange={(content) => onChange({ ...node, content })}
              />
            </WorkbenchPropertyRow>
          ) : null}
          {node.kind === 'panel' && showField('panel-background') ? (
            <WorkbenchPropertyTextRow
              htmlFor="screen-spec-field-panel-background"
              label="Panel background"
              value={node.background ?? ''}
              onValueChange={(background) => onChange({ ...node, background })}
            />
          ) : null}
        </WorkbenchPropertySection>
      ) : null}

      {showSection('style') ? (
        <WorkbenchPropertySection collapsible title="Style">
          {showField('color') ? (
            <WorkbenchPropertyTextRow
              htmlFor="screen-spec-field-color"
              label="Text color"
              value={style.color ?? ''}
              onValueChange={(color) => onChange(patchStyle(node, { color }))}
            />
          ) : null}
          {showField('font-size') ? (
            <OptionalNumberRow
              label="Font size"
              testId="screen-spec-field-font-size"
              value={style.fontSize}
              onChange={(fontSize) => onChange(patchStyle(node, { fontSize }))}
            />
          ) : null}
          {showField('background') ? (
            <WorkbenchPropertyTextRow
              htmlFor="screen-spec-field-background"
              label="Background"
              value={style.background ?? ''}
              onValueChange={(background) => onChange(patchStyle(node, { background }))}
            />
          ) : null}
        </WorkbenchPropertySection>
      ) : null}

      {parentKind === 'grid' && showSection('placement') ? (
        <WorkbenchPropertySection collapsible title="Placement">
          {showField('col') ? (
            <OptionalNumberRow
              label="Column"
              testId="screen-spec-field-col"
              value={node.col}
              onChange={(col) => onChange({ ...node, col })}
            />
          ) : null}
          {showField('row') ? (
            <OptionalNumberRow
              label="Row"
              testId="screen-spec-field-row"
              value={node.row}
              onChange={(row) => onChange({ ...node, row })}
            />
          ) : null}
          {showField('col-span') ? (
            <OptionalNumberRow
              label="Column span"
              testId="screen-spec-field-col-span"
              value={node.colSpan}
              onChange={(colSpan) => onChange({ ...node, colSpan })}
            />
          ) : null}
          {showField('row-span') ? (
            <OptionalNumberRow
              label="Row span"
              testId="screen-spec-field-row-span"
              value={node.rowSpan}
              onChange={(rowSpan) => onChange({ ...node, rowSpan })}
            />
          ) : null}
        </WorkbenchPropertySection>
      ) : null}

      {searching &&
      !showSection('content') &&
      !showSection('style') &&
      !showSection('placement') ? (
        <WorkbenchPropertyHint>No properties match.</WorkbenchPropertyHint>
      ) : null}
    </InspectorShell>
  );
}

function ExpandedNodeInspector({
  node,
  onChange,
}: {
  readonly node: Extract<ScreenNode, { kind: 'expanded' }>;
  readonly onChange: (node: ScreenNode) => void;
}) {
  const [query, setQuery] = useState('');
  const fields = useMemo(
    (): WorkbenchPropertyFieldManifestEntry[] => [
      { id: 'flex', label: 'Flex', sectionId: 'layout', keywords: ['grow'] },
    ],
    [],
  );
  const { showField, showSection, searching } = usePropertyVisibility(fields, query);

  return (
    <InspectorShell query={query} onQueryChange={setQuery}>
      {showSection('layout') ? (
        <WorkbenchPropertySection collapsible title="Layout">
          {showField('flex') ? (
            <OptionalNumberRow
              label="Flex"
              testId="screen-spec-field-flex"
              value={node.flex}
              onChange={(flex) => onChange({ ...node, flex })}
            />
          ) : null}
          <WorkbenchPropertyHint>Edit the wrapped child from the outline.</WorkbenchPropertyHint>
        </WorkbenchPropertySection>
      ) : null}
      {searching && !showSection('layout') ? (
        <WorkbenchPropertyHint>No properties match.</WorkbenchPropertyHint>
      ) : null}
    </InspectorShell>
  );
}

function ContainerNodeInspector({
  node,
  onChange,
}: {
  readonly node: Extract<ScreenNode, { kind: 'row' | 'column' | 'grid' | 'stack' }>;
  readonly onChange: (node: ScreenNode) => void;
}) {
  const [query, setQuery] = useState('');
  const fields = useMemo((): WorkbenchPropertyFieldManifestEntry[] => {
    const next: WorkbenchPropertyFieldManifestEntry[] = [];
    if (node.kind === 'grid') {
      next.push({ id: 'columns', label: 'Columns', sectionId: 'layout', keywords: ['grid'] });
    }
    next.push(
      { id: 'gap', label: 'Gap', sectionId: 'layout', keywords: ['spacing'] },
      { id: 'padding', label: 'Padding', sectionId: 'layout', keywords: ['spacing'] },
      { id: 'background', label: 'Background', sectionId: 'style' },
    );
    return next;
  }, [node.kind]);
  const { showField, showSection, searching } = usePropertyVisibility(fields, query);

  return (
    <InspectorShell query={query} onQueryChange={setQuery}>
      {showSection('layout') ? (
        <WorkbenchPropertySection collapsible title="Layout">
          {node.kind === 'grid' && showField('columns') ? (
            <WorkbenchPropertyNumberRow
              htmlFor="screen-spec-field-columns"
              label="Columns"
              min={1}
              value={node.columns}
              onValueChange={(columns) => onChange({ ...node, columns: Math.max(1, columns) })}
            />
          ) : null}
          {showField('gap') ? (
            <OptionalNumberRow
              label="Gap"
              testId="screen-spec-field-gap"
              value={node.gap}
              onChange={(gap) => onChange({ ...node, gap })}
            />
          ) : null}
          {showField('padding') ? (
            <OptionalNumberRow
              label="Padding"
              testId="screen-spec-field-padding"
              value={node.padding}
              onChange={(padding) => onChange({ ...node, padding })}
            />
          ) : null}
        </WorkbenchPropertySection>
      ) : null}
      {showSection('style') ? (
        <WorkbenchPropertySection collapsible title="Style">
          {showField('background') ? (
            <WorkbenchPropertyTextRow
              htmlFor="screen-spec-field-container-background"
              label="Background"
              value={node.background ?? ''}
              onValueChange={(background) => onChange({ ...node, background })}
            />
          ) : null}
        </WorkbenchPropertySection>
      ) : null}
      {searching && !showSection('layout') && !showSection('style') ? (
        <WorkbenchPropertyHint>No properties match.</WorkbenchPropertyHint>
      ) : null}
    </InspectorShell>
  );
}

export function ScreenNodeInspector({ node, parentKind, onChange }: ScreenNodeInspectorProps) {
  if (node.kind === 'text' || node.kind === 'panel') {
    return <ContentNodeInspector node={node} parentKind={parentKind} onChange={onChange} />;
  }
  if (node.kind === 'expanded') {
    return <ExpandedNodeInspector node={node} onChange={onChange} />;
  }
  if (
    node.kind === 'row' ||
    node.kind === 'column' ||
    node.kind === 'grid' ||
    node.kind === 'stack'
  ) {
    return <ContainerNodeInspector node={node} onChange={onChange} />;
  }
  return null;
}
