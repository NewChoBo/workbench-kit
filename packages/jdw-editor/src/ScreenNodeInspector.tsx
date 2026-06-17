import type { ScreenNode, ScreenTextStyle } from '@workbench-kit/jdw';

import {
  TextInput,
  WorkbenchPropertyHint,
  WorkbenchPropertyNumberRow,
  WorkbenchPropertyPanel,
  WorkbenchPropertyRow,
  WorkbenchPropertyStack,
  WorkbenchPropertyTextRow,
} from '@workbench-kit/react/primitives';

export interface ScreenNodeInspectorProps {
  readonly node: ScreenNode;
  readonly parentKind?: ScreenNode['kind'] | undefined;
  readonly onChange: (node: ScreenNode) => void;
}

function readStyle(node: ScreenNode): ScreenTextStyle {
  if (node.kind === 'text' || node.kind === 'panel') {
    return node.style ?? {};
  }
  return {};
}

function patchStyle(node: ScreenNode, patch: ScreenTextStyle): ScreenNode {
  if (node.kind === 'text' || node.kind === 'panel') {
    return { ...node, style: { ...node.style, ...patch } };
  }
  return node;
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
      <TextInput
        id={testId}
        data-testid={testId}
        controlWidth="full"
        type="number"
        value={value ?? ''}
        onChange={(event) => {
          const raw = event.currentTarget.value;
          onChange(raw === '' ? undefined : Number(raw));
        }}
      />
    </WorkbenchPropertyRow>
  );
}

export function ScreenNodeInspector({ node, parentKind, onChange }: ScreenNodeInspectorProps) {
  if (node.kind === 'text' || node.kind === 'panel') {
    const style = readStyle(node);

    return (
      <WorkbenchPropertyPanel
        className="jdw-screen-node-inspector"
        data-testid="screen-spec-node-inspector"
      >
        <WorkbenchPropertyStack>
          <WorkbenchPropertyRow label="Content" htmlFor="screen-spec-field-content">
            <TextInput
              id="screen-spec-field-content"
              data-testid="screen-spec-field-content"
              controlWidth="full"
              value={node.content}
              onValueChange={(content) => onChange({ ...node, content })}
            />
          </WorkbenchPropertyRow>
          {node.kind === 'panel' ? (
            <WorkbenchPropertyTextRow
              htmlFor="screen-spec-field-panel-background"
              label="Panel background"
              value={node.background ?? ''}
              onValueChange={(background) => onChange({ ...node, background })}
            />
          ) : null}
          <WorkbenchPropertyTextRow
            htmlFor="screen-spec-field-color"
            label="Text color"
            value={style.color ?? ''}
            onValueChange={(color) => onChange(patchStyle(node, { color }))}
          />
          <OptionalNumberRow
            label="Font size"
            testId="screen-spec-field-font-size"
            value={style.fontSize}
            onChange={(fontSize) => onChange(patchStyle(node, { fontSize }))}
          />
          <WorkbenchPropertyTextRow
            htmlFor="screen-spec-field-background"
            label="Background"
            value={style.background ?? ''}
            onValueChange={(background) => onChange(patchStyle(node, { background }))}
          />
          {parentKind === 'grid' ? (
            <>
              <OptionalNumberRow
                label="Column"
                testId="screen-spec-field-col"
                value={node.col}
                onChange={(col) => onChange({ ...node, col })}
              />
              <OptionalNumberRow
                label="Row"
                testId="screen-spec-field-row"
                value={node.row}
                onChange={(row) => onChange({ ...node, row })}
              />
              <OptionalNumberRow
                label="Column span"
                testId="screen-spec-field-col-span"
                value={node.colSpan}
                onChange={(colSpan) => onChange({ ...node, colSpan })}
              />
              <OptionalNumberRow
                label="Row span"
                testId="screen-spec-field-row-span"
                value={node.rowSpan}
                onChange={(rowSpan) => onChange({ ...node, rowSpan })}
              />
            </>
          ) : null}
        </WorkbenchPropertyStack>
      </WorkbenchPropertyPanel>
    );
  }

  if (node.kind === 'expanded') {
    return (
      <WorkbenchPropertyPanel
        className="jdw-screen-node-inspector"
        data-testid="screen-spec-node-inspector"
      >
        <WorkbenchPropertyStack>
          <OptionalNumberRow
            label="Flex"
            testId="screen-spec-field-flex"
            value={node.flex}
            onChange={(flex) => onChange({ ...node, flex })}
          />
          <WorkbenchPropertyHint>Edit the wrapped child from the outline.</WorkbenchPropertyHint>
        </WorkbenchPropertyStack>
      </WorkbenchPropertyPanel>
    );
  }

  if (
    node.kind === 'row' ||
    node.kind === 'column' ||
    node.kind === 'grid' ||
    node.kind === 'stack'
  ) {
    return (
      <WorkbenchPropertyPanel
        className="jdw-screen-node-inspector"
        data-testid="screen-spec-node-inspector"
      >
        <WorkbenchPropertyStack>
          {node.kind === 'grid' ? (
            <WorkbenchPropertyNumberRow
              htmlFor="screen-spec-field-columns"
              label="Columns"
              min={1}
              value={node.columns}
              onValueChange={(columns) => onChange({ ...node, columns: Math.max(1, columns) })}
            />
          ) : null}
          <OptionalNumberRow
            label="Gap"
            testId="screen-spec-field-gap"
            value={node.gap}
            onChange={(gap) => onChange({ ...node, gap })}
          />
          <OptionalNumberRow
            label="Padding"
            testId="screen-spec-field-padding"
            value={node.padding}
            onChange={(padding) => onChange({ ...node, padding })}
          />
          <WorkbenchPropertyTextRow
            htmlFor="screen-spec-field-container-background"
            label="Background"
            value={node.background ?? ''}
            onValueChange={(background) => onChange({ ...node, background })}
          />
        </WorkbenchPropertyStack>
      </WorkbenchPropertyPanel>
    );
  }

  return null;
}
