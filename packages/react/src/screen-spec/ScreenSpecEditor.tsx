import { useMemo, useState } from 'react';
import {
  compileScreenSpecToJson,
  listScreenSpecOutline,
  updateScreenNodeAt,
  updateScreenSpecMetadata,
  type JdwScreenSpec,
  type ScreenNode,
  type ScreenNodePath,
} from '@workbench-kit/json-widget';

import { Field } from '../primitives/Field.js';
import { TextInput } from '../primitives/TextInput.js';
import { ScreenNodeInspector } from './ScreenNodeInspector.js';

function pathKey(path: ScreenNodePath): string {
  return path.length === 0 ? 'root' : path.join('.');
}

export interface ScreenSpecEditorProps {
  readonly value: JdwScreenSpec;
  readonly onChange: (spec: JdwScreenSpec) => void;
  readonly onCompileError?: ((message: string | null) => void) | undefined;
  readonly className?: string | undefined;
}

export function ScreenSpecEditor({
  value,
  onChange,
  onCompileError,
  className,
}: ScreenSpecEditorProps) {
  const [selectedPath, setSelectedPath] = useState<ScreenNodePath>([]);
  const outline = useMemo(() => listScreenSpecOutline(value), [value]);
  const selectedEntry =
    outline.find((entry) => pathKey(entry.path) === pathKey(selectedPath)) ?? outline[0];
  const selectedNode = selectedEntry?.node ?? value.root;

  const commitSpec = (nextSpec: JdwScreenSpec) => {
    onChange(nextSpec);
    try {
      compileScreenSpecToJson(nextSpec);
      onCompileError?.(null);
    } catch (error) {
      onCompileError?.(error instanceof Error ? error.message : String(error));
    }
  };

  const updateNode = (nextNode: ScreenNode) => {
    commitSpec(updateScreenNodeAt(value, selectedEntry?.path ?? [], nextNode));
  };

  return (
    <div
      className={className}
      data-testid="screen-spec-editor"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(180px, 34%) minmax(0, 1fr)',
        gap: 12,
        minHeight: 0,
        height: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          minHeight: 0,
          overflow: 'auto',
        }}
      >
        <section
          aria-label="Screen metadata"
          data-testid="screen-spec-metadata"
          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <Field label="Title" htmlFor="screen-spec-field-title">
            <TextInput
              id="screen-spec-field-title"
              data-testid="screen-spec-field-title"
              controlWidth="full"
              value={value.title}
              onChange={(event) =>
                commitSpec(updateScreenSpecMetadata(value, { title: event.currentTarget.value }))
              }
            />
          </Field>
          <Field label="Description" htmlFor="screen-spec-field-description">
            <TextInput
              id="screen-spec-field-description"
              data-testid="screen-spec-field-description"
              controlWidth="full"
              value={value.description}
              onChange={(event) =>
                commitSpec(
                  updateScreenSpecMetadata(value, { description: event.currentTarget.value }),
                )
              }
            />
          </Field>
          <Field label="Frame width" htmlFor="screen-spec-field-frame-width">
            <TextInput
              id="screen-spec-field-frame-width"
              data-testid="screen-spec-field-frame-width"
              controlWidth="full"
              type="number"
              value={value.frameWidth}
              onChange={(event) =>
                commitSpec(
                  updateScreenSpecMetadata(value, {
                    frameWidth: Number(event.currentTarget.value),
                  }),
                )
              }
            />
          </Field>
          <Field label="Preview max width" htmlFor="screen-spec-field-max-width">
            <TextInput
              id="screen-spec-field-max-width"
              data-testid="screen-spec-field-max-width"
              controlWidth="full"
              type="number"
              value={value.layout.maxWidth}
              onChange={(event) =>
                commitSpec(
                  updateScreenSpecMetadata(value, {
                    layout: { ...value.layout, maxWidth: Number(event.currentTarget.value) },
                  }),
                )
              }
            />
          </Field>
          <Field label="Preview max height" htmlFor="screen-spec-field-max-height">
            <TextInput
              id="screen-spec-field-max-height"
              data-testid="screen-spec-field-max-height"
              controlWidth="full"
              type="number"
              value={value.layout.maxHeight}
              onChange={(event) =>
                commitSpec(
                  updateScreenSpecMetadata(value, {
                    layout: { ...value.layout, maxHeight: Number(event.currentTarget.value) },
                  }),
                )
              }
            />
          </Field>
        </section>

        <section aria-label="Screen node outline" data-testid="screen-spec-outline">
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#c4c7c5',
              marginBottom: 8,
            }}
          >
            Outline
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {outline.map((entry) => {
              const key = pathKey(entry.path);
              const selected = pathKey(selectedEntry?.path ?? []) === key;

              return (
                <button
                  key={key}
                  type="button"
                  data-testid={`screen-spec-outline-${key}`}
                  aria-current={selected ? 'true' : undefined}
                  onClick={() => setSelectedPath(entry.path)}
                  style={{
                    textAlign: 'left',
                    padding: '6px 8px',
                    paddingLeft: `${8 + entry.depth * 14}px`,
                    borderRadius: 6,
                    border: selected ? '1px solid #4aa8ff' : '1px solid transparent',
                    background: selected ? '#1a2a3a' : 'transparent',
                    color: '#e8eaed',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  {entry.label}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <section
        aria-label="Selected node properties"
        data-testid="screen-spec-inspector"
        style={{
          minHeight: 0,
          overflow: 'auto',
          borderLeft: '1px solid #2b2f36',
          paddingLeft: 12,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#c4c7c5',
            marginBottom: 10,
          }}
        >
          {selectedEntry?.label ?? 'Node'}
        </div>
        <ScreenNodeInspector
          node={selectedNode}
          parentKind={selectedEntry?.parentKind}
          onChange={updateNode}
        />
      </section>
    </div>
  );
}
