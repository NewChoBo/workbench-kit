import { useMemo, useState } from 'react';
import {
  compileScreenSpecToJson,
  listScreenSpecOutline,
  updateScreenNodeAt,
  updateScreenSpecMetadata,
  type JdwScreenSpec,
  type ScreenNode,
  type ScreenNodePath,
} from '@workbench-kit/jdw';

import {
  Panel,
  PanelBody,
  ResizablePanels,
  TextInput,
  WorkbenchPropertyNumberRow,
  WorkbenchPropertyRow,
  WorkbenchPropertySection,
  WorkbenchPropertyStack,
  WorkbenchPropertyTextRow,
} from '@workbench-kit/react/primitives';
import { ScreenNodeInspector } from './ScreenNodeInspector.js';

function cx(...parts: Array<string | false | undefined | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

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

  const metadataPanel = (
    <WorkbenchPropertySection title="Screen" data-testid="screen-spec-metadata">
      <WorkbenchPropertyStack gap="sm">
        <WorkbenchPropertyRow label="Title" htmlFor="screen-spec-field-title">
          <TextInput
            id="screen-spec-field-title"
            data-testid="screen-spec-field-title"
            controlWidth="full"
            value={value.title}
            onValueChange={(title) => commitSpec(updateScreenSpecMetadata(value, { title }))}
          />
        </WorkbenchPropertyRow>
        <WorkbenchPropertyTextRow
          htmlFor="screen-spec-field-description"
          label="Description"
          value={value.description}
          onValueChange={(description) =>
            commitSpec(updateScreenSpecMetadata(value, { description }))
          }
        />
        <WorkbenchPropertyNumberRow
          htmlFor="screen-spec-field-frame-width"
          label="Frame width"
          min={1}
          value={value.frameWidth}
          onValueChange={(frameWidth) =>
            commitSpec(updateScreenSpecMetadata(value, { frameWidth }))
          }
        />
        <WorkbenchPropertyNumberRow
          htmlFor="screen-spec-field-max-width"
          label="Preview max width"
          min={1}
          value={value.layout.maxWidth}
          onValueChange={(maxWidth) =>
            commitSpec(
              updateScreenSpecMetadata(value, {
                layout: { ...value.layout, maxWidth },
              }),
            )
          }
        />
        <WorkbenchPropertyNumberRow
          htmlFor="screen-spec-field-max-height"
          label="Preview max height"
          min={1}
          value={value.layout.maxHeight}
          onValueChange={(maxHeight) =>
            commitSpec(
              updateScreenSpecMetadata(value, {
                layout: { ...value.layout, maxHeight },
              }),
            )
          }
        />
      </WorkbenchPropertyStack>
    </WorkbenchPropertySection>
  );

  const outlinePanel = (
    <Panel
      className="widget-tree-outline jdw-screen-spec-editor__outline"
      data-testid="screen-spec-outline"
    >
      <PanelBody className="widget-tree-outline__body">
        <ul aria-label="Screen node outline" className="widget-tree-outline__list" role="tree">
          {outline.map((entry) => {
            const key = pathKey(entry.path);
            const selected = pathKey(selectedEntry?.path ?? []) === key;
            const depth = entry.depth;

            return (
              <li
                key={key}
                aria-level={depth + 1}
                aria-selected={selected}
                className={cx(
                  'widget-tree-outline__item',
                  selected && 'widget-tree-outline__item--selected',
                )}
                role="treeitem"
                style={{ paddingLeft: `${depth * 14 + 6}px` }}
              >
                <button
                  className="widget-tree-outline__button"
                  data-testid={`screen-spec-outline-${key}`}
                  type="button"
                  onClick={() => setSelectedPath(entry.path)}
                >
                  <span className="widget-tree-outline__type">{entry.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </PanelBody>
    </Panel>
  );

  return (
    <div className={cx('jdw-screen-spec-editor', className)} data-testid="screen-spec-editor">
      <ResizablePanels
        className="jdw-screen-spec-editor__layout"
        defaultFirstSize={280}
        minFirstSize={200}
        minSecondSize={220}
        maxFirstSize={420}
        first={
          <div className="jdw-screen-spec-editor__sidebar">
            {metadataPanel}
            {outlinePanel}
          </div>
        }
        second={
          <WorkbenchPropertySection
            aria-label="Selected node properties"
            className="jdw-screen-spec-editor__inspector"
            data-testid="screen-spec-inspector"
            title={selectedEntry?.label ?? 'Node'}
          >
            <ScreenNodeInspector
              node={selectedNode}
              parentKind={selectedEntry?.parentKind}
              onChange={updateNode}
            />
          </WorkbenchPropertySection>
        }
      />
    </div>
  );
}
