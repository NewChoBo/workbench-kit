import type { ScreenNode, ScreenTextStyle } from '@workbench-kit/json-widget';

import { Field } from '../primitives/Field.js';
import { TextInput } from '../primitives/TextInput.js';

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

function NumberField({
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
    <Field label={label} htmlFor={testId}>
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
    </Field>
  );
}

export function ScreenNodeInspector({ node, parentKind, onChange }: ScreenNodeInspectorProps) {
  if (node.kind === 'text' || node.kind === 'panel') {
    const style = readStyle(node);

    return (
      <div className="screen-spec-node-inspector" data-testid="screen-spec-node-inspector">
        <Field label="Content" htmlFor="screen-spec-field-content">
          <TextInput
            id="screen-spec-field-content"
            data-testid="screen-spec-field-content"
            controlWidth="full"
            value={node.content}
            onChange={(event) =>
              onChange(
                node.kind === 'panel'
                  ? { ...node, content: event.currentTarget.value }
                  : { ...node, content: event.currentTarget.value },
              )
            }
          />
        </Field>
        {node.kind === 'panel' ? (
          <Field label="Panel background" htmlFor="screen-spec-field-panel-background">
            <TextInput
              id="screen-spec-field-panel-background"
              data-testid="screen-spec-field-panel-background"
              controlWidth="full"
              value={node.background ?? ''}
              onChange={(event) => onChange({ ...node, background: event.currentTarget.value })}
            />
          </Field>
        ) : null}
        <Field label="Text color" htmlFor="screen-spec-field-color">
          <TextInput
            id="screen-spec-field-color"
            data-testid="screen-spec-field-color"
            controlWidth="full"
            value={style.color ?? ''}
            onChange={(event) => onChange(patchStyle(node, { color: event.currentTarget.value }))}
          />
        </Field>
        <NumberField
          label="Font size"
          testId="screen-spec-field-font-size"
          value={style.fontSize}
          onChange={(fontSize) => onChange(patchStyle(node, { fontSize }))}
        />
        <Field label="Background" htmlFor="screen-spec-field-background">
          <TextInput
            id="screen-spec-field-background"
            data-testid="screen-spec-field-background"
            controlWidth="full"
            value={style.background ?? ''}
            onChange={(event) =>
              onChange(patchStyle(node, { background: event.currentTarget.value }))
            }
          />
        </Field>
        {parentKind === 'grid' ? (
          <>
            <NumberField
              label="Column"
              testId="screen-spec-field-col"
              value={node.col}
              onChange={(col) => onChange({ ...node, col })}
            />
            <NumberField
              label="Row"
              testId="screen-spec-field-row"
              value={node.row}
              onChange={(row) => onChange({ ...node, row })}
            />
            <NumberField
              label="Column span"
              testId="screen-spec-field-col-span"
              value={node.colSpan}
              onChange={(colSpan) => onChange({ ...node, colSpan })}
            />
            <NumberField
              label="Row span"
              testId="screen-spec-field-row-span"
              value={node.rowSpan}
              onChange={(rowSpan) => onChange({ ...node, rowSpan })}
            />
          </>
        ) : null}
      </div>
    );
  }

  if (node.kind === 'expanded') {
    return (
      <div className="screen-spec-node-inspector" data-testid="screen-spec-node-inspector">
        <NumberField
          label="Flex"
          testId="screen-spec-field-flex"
          value={node.flex}
          onChange={(flex) => onChange({ ...node, flex })}
        />
        <p style={{ margin: 0, fontSize: 12, color: '#9aa0a6' }}>
          Edit the wrapped child from the outline.
        </p>
      </div>
    );
  }

  if (
    node.kind === 'row' ||
    node.kind === 'column' ||
    node.kind === 'grid' ||
    node.kind === 'stack'
  ) {
    return (
      <div className="screen-spec-node-inspector" data-testid="screen-spec-node-inspector">
        {node.kind === 'grid' ? (
          <NumberField
            label="Columns"
            testId="screen-spec-field-columns"
            value={node.columns}
            onChange={(columns) =>
              onChange({
                ...node,
                columns: Math.max(1, columns ?? 1),
              })
            }
          />
        ) : null}
        <NumberField
          label="Gap"
          testId="screen-spec-field-gap"
          value={node.gap}
          onChange={(gap) => onChange({ ...node, gap })}
        />
        <NumberField
          label="Padding"
          testId="screen-spec-field-padding"
          value={node.padding}
          onChange={(padding) => onChange({ ...node, padding })}
        />
        <Field label="Background" htmlFor="screen-spec-field-container-background">
          <TextInput
            id="screen-spec-field-container-background"
            data-testid="screen-spec-field-container-background"
            controlWidth="full"
            value={node.background ?? ''}
            onChange={(event) => onChange({ ...node, background: event.currentTarget.value })}
          />
        </Field>
      </div>
    );
  }

  return null;
}
