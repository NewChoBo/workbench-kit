import { useMemo, useState, type DragEvent, type KeyboardEvent } from 'react';
import {
  createDefaultScreenNode,
  getScreenNodeAt,
  insertScreenNodeAt,
  isScreenContainerNode,
  listScreenSpecOutline,
  removeScreenNodeAt,
  resolveScreenInsertParentPath,
  updateScreenNodeAt,
  updateScreenSpecMetadata,
  type JdwScreenSpec,
  type ScreenNode,
  type ScreenNodePath,
  type ScreenPaletteKind,
} from '@workbench-kit/jdw';
import {
  Badge,
  ClearableTextInput,
  SegmentedControl,
  TextInput,
  WorkbenchFill,
  WorkbenchLabeledPane,
  WorkbenchPropertyHint,
  WorkbenchPropertyRow,
  WorkbenchPropertyStack,
} from '@workbench-kit/react/primitives';
import { SplitView } from '@workbench-kit/react/workbench/shell';

import { filterScreenSpecOutline } from './filterScreenSpecOutline.js';
import { ScreenNodeInspector } from './ScreenNodeInspector.js';
import {
  readScreenPaletteDragData,
  SCREEN_PALETTE_MIME,
  ScreenSpecPalette,
} from './ScreenSpecPalette.js';

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

function pathKey(path: ScreenNodePath): string {
  return path.length === 0 ? 'root' : path.join('.');
}

function screenKindLabel(kind: string): string {
  return kind.length === 0 ? kind : `${kind[0]!.toUpperCase()}${kind.slice(1)}`;
}

export type ScreenSpecEditorPane = 'all' | 'outline' | 'inspector';
/** Local left rail inside the Form — not the host Activity Bar. */
export type ScreenSpecLeftRailView = 'outline' | 'screen';
/** Right detail tabs — matches WidgetTreeLab Props | Assets. */
export type ScreenSpecDetailTab = 'properties' | 'assets';

const DETAIL_TABS = [
  { label: 'Props', testId: 'screen-spec-detail-props', value: 'properties' as const },
  { label: 'Assets', testId: 'screen-spec-detail-assets', value: 'assets' as const },
];

const LEFT_VIEW_TABS = [
  { label: 'Outline', testId: 'screen-spec-rail-outline', value: 'outline' as const },
  { label: 'Screen', testId: 'screen-spec-rail-screen', value: 'screen' as const },
];

/** @deprecated Compatibility editor; use `WidgetTreeLab` for JDW authoring. */
export interface ScreenSpecEditorProps {
  readonly value: JdwScreenSpec;
  readonly onChange: (spec: JdwScreenSpec) => void;
  readonly onCompileError?: ((message: string | null) => void) | undefined;
  readonly className?: string | undefined;
  readonly selectedPath?: ScreenNodePath | undefined;
  readonly onSelectPath?: ((path: ScreenNodePath) => void) | undefined;
  /**
   * `outline` / `inspector` — single inner-sidebar pane for 3-column workbench.
   * `all` — combined Outline|Inspector split (standalone hosts).
   */
  readonly pane?: ScreenSpecEditorPane | undefined;
}

function useScreenSpecEditorModel({
  value,
  onChange,
  onCompileError,
  selectedPath: selectedPathProp,
  onSelectPath,
}: Pick<
  ScreenSpecEditorProps,
  'value' | 'onChange' | 'onCompileError' | 'selectedPath' | 'onSelectPath'
>) {
  const [uncontrolledPath, setUncontrolledPath] = useState<ScreenNodePath>([]);
  const selectedPath = selectedPathProp ?? uncontrolledPath;
  const setSelectedPath = onSelectPath ?? setUncontrolledPath;
  const outline = useMemo(() => listScreenSpecOutline(value), [value]);
  const selectedPathKey = pathKey(selectedPath);
  const selectedEntry =
    outline.find((entry) => pathKey(entry.path) === selectedPathKey) ?? outline[0];
  const selectedEntryKey = selectedEntry ? pathKey(selectedEntry.path) : selectedPathKey;
  const selectedNode = selectedEntry?.node ?? value.root;

  const insertParentPath = useMemo(
    () => resolveScreenInsertParentPath(value.root, selectedPath),
    [selectedPath, value.root],
  );
  const insertParent = insertParentPath ? getScreenNodeAt(value.root, insertParentPath) : null;
  const canClickPlace = Boolean(insertParent && isScreenContainerNode(insertParent));
  const insertTargetLabel = insertParent
    ? `${insertParent.kind}${insertParentPath?.length === 0 ? ' (root)' : ''}`
    : undefined;

  const commitSpec = (nextSpec: JdwScreenSpec) => {
    onChange(nextSpec);
    onCompileError?.(null);
  };

  const updateNode = (nextNode: ScreenNode) => {
    commitSpec(updateScreenNodeAt(value, selectedEntry?.path ?? [], nextNode));
  };

  const placeKind = (kind: ScreenPaletteKind, parentPath: ScreenNodePath | null) => {
    if (!parentPath) {
      return false;
    }
    const result = insertScreenNodeAt(value, parentPath, createDefaultScreenNode(kind));
    if (!result) {
      return false;
    }
    commitSpec(result.spec);
    setSelectedPath(result.insertedPath);
    return true;
  };

  const removeSelected = () => {
    const result = removeScreenNodeAt(value, selectedPath);
    if (!result) {
      return;
    }
    commitSpec(result.spec);
    setSelectedPath(result.nextSelectedPath);
  };

  return {
    canClickPlace,
    commitSpec,
    insertParentPath,
    insertTargetLabel,
    outline,
    placeKind,
    removeSelected,
    selectedEntry,
    selectedEntryKey,
    selectedNode,
    selectedPath,
    setSelectedPath,
    updateNode,
    value,
  };
}

type EditorModel = ReturnType<typeof useScreenSpecEditorModel>;

function ScreenSpecOutlineBody({ model }: { readonly model: EditorModel }) {
  const {
    commitSpec,
    outline,
    placeKind,
    removeSelected,
    selectedEntryKey,
    selectedPath,
    setSelectedPath,
    value,
  } = model;
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);
  const [leftView, setLeftView] = useState<ScreenSpecLeftRailView>('outline');
  const [outlineQuery, setOutlineQuery] = useState('');
  const visibleOutline = useMemo(
    () => filterScreenSpecOutline(outline, outlineQuery),
    [outline, outlineQuery],
  );

  const resolveDropParentPath = (entryPath: ScreenNodePath, entryNode: ScreenNode) => {
    if (isScreenContainerNode(entryNode)) {
      return entryPath;
    }
    return resolveScreenInsertParentPath(value.root, entryPath);
  };

  const handleDragOver = (event: DragEvent<HTMLLIElement>, key: string, canDrop: boolean) => {
    const types = Array.from(event.dataTransfer.types);
    if (!canDrop || (!types.includes(SCREEN_PALETTE_MIME) && !types.includes('text/plain'))) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setDropTargetKey(key);
  };

  const handleOutlineKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key !== 'Delete' && event.key !== 'Backspace') {
      return;
    }
    if (selectedPath.length === 0) {
      return;
    }
    event.preventDefault();
    removeSelected();
  };

  return (
    <WorkbenchLabeledPane
      aria-label="Screen structure and metadata"
      chrome="flat"
      data-testid="screen-spec-sidebar"
      header={
        <SegmentedControl
          ariaLabel="Screen editor panel"
          options={LEFT_VIEW_TABS}
          value={leftView}
          onChange={setLeftView}
        />
      }
    >
      {leftView === 'screen' ? (
        <WorkbenchPropertyStack gap="sm" data-testid="screen-spec-metadata">
          <WorkbenchPropertyRow label="Title" htmlFor="screen-spec-field-title">
            <TextInput
              id="screen-spec-field-title"
              data-testid="screen-spec-field-title"
              controlWidth="full"
              value={value.title}
              onValueChange={(title) => commitSpec(updateScreenSpecMetadata(value, { title }))}
            />
          </WorkbenchPropertyRow>
          <WorkbenchPropertyRow label="Description" htmlFor="screen-spec-field-description">
            <TextInput
              id="screen-spec-field-description"
              data-testid="screen-spec-field-description"
              controlWidth="full"
              value={value.description}
              onValueChange={(description) =>
                commitSpec(updateScreenSpecMetadata(value, { description }))
              }
            />
          </WorkbenchPropertyRow>
        </WorkbenchPropertyStack>
      ) : (
        <div className="widget-tree-outline" data-testid="screen-spec-outline">
          <div style={{ padding: '6px 8px 4px' }}>
            <ClearableTextInput
              aria-label="Search outline"
              clearLabel="Clear"
              controlWidth="full"
              data-testid="screen-spec-outline-search"
              placeholder="Search outline"
              value={outlineQuery}
              onValueChange={setOutlineQuery}
            />
          </div>
          {visibleOutline.length === 0 ? (
            <WorkbenchPropertyHint data-testid="screen-spec-outline-empty">
              No outline matches.
            </WorkbenchPropertyHint>
          ) : (
            <ul
              aria-label="Screen node outline"
              className="widget-tree-outline__list"
              role="tree"
              tabIndex={0}
              onKeyDown={handleOutlineKeyDown}
            >
              {visibleOutline.map((entry) => {
                const key = pathKey(entry.path);
                const selected = selectedEntryKey === key;
                const depth = entry.depth;
                const dropParentPath = resolveDropParentPath(entry.path, entry.node);
                const canDrop = dropParentPath !== null;

                return (
                  <li
                    key={key}
                    aria-level={depth + 1}
                    aria-selected={selected}
                    className={cx(
                      'widget-tree-outline__item',
                      selected && 'widget-tree-outline__item--selected',
                      dropTargetKey === key && 'widget-tree-outline__item--drop-inside',
                    )}
                    role="treeitem"
                    style={{ paddingLeft: `${depth * 14 + 6}px` }}
                    onDragLeave={() => {
                      setDropTargetKey((current) => (current === key ? null : current));
                    }}
                    onDragOver={(event) => handleDragOver(event, key, canDrop)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDropTargetKey(null);
                      const kind = readScreenPaletteDragData(event.dataTransfer);
                      if (!kind || !dropParentPath) {
                        return;
                      }
                      placeKind(kind, dropParentPath);
                    }}
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
          )}
        </div>
      )}
    </WorkbenchLabeledPane>
  );
}

function ScreenSpecInspectorBody({ model }: { readonly model: EditorModel }) {
  const {
    canClickPlace,
    insertParentPath,
    insertTargetLabel,
    placeKind,
    selectedNode,
    updateNode,
    selectedEntry,
  } = model;
  const [detailTab, setDetailTab] = useState<ScreenSpecDetailTab>('properties');

  const placeFromAssets = (kind: ScreenPaletteKind) => {
    if (placeKind(kind, insertParentPath)) {
      setDetailTab('properties');
    }
  };

  return (
    <WorkbenchLabeledPane
      aria-label="Screen node details"
      chrome="flat"
      data-testid="screen-spec-inspector"
      header={
        <SegmentedControl
          ariaLabel="Screen detail panel"
          options={DETAIL_TABS}
          value={detailTab}
          onChange={setDetailTab}
        />
      }
    >
      {detailTab === 'assets' ? (
        <div data-testid="screen-spec-assets">
          <ScreenSpecPalette
            canClickPlace={canClickPlace}
            insertTargetLabel={insertTargetLabel}
            onPlaceKind={placeFromAssets}
          />
        </div>
      ) : (
        <div data-testid="screen-spec-props">
          <WorkbenchPropertyStack>
            <div className="widget-tree-inspector__header">
              <Badge data-testid="screen-spec-kind-pill">
                {screenKindLabel(selectedNode.kind)}
              </Badge>
            </div>
            <ScreenNodeInspector
              node={selectedNode}
              parentKind={selectedEntry?.parentKind}
              onChange={updateNode}
            />
          </WorkbenchPropertyStack>
        </div>
      )}
    </WorkbenchLabeledPane>
  );
}

/**
 * @deprecated Compatibility editor for pre-compile Screen Spec templates.
 * Compile once and continue design/code editing in `WidgetTreeLab`.
 */
export function ScreenSpecEditor({
  value,
  onChange,
  onCompileError,
  className,
  selectedPath,
  onSelectPath,
  pane = 'all',
}: ScreenSpecEditorProps) {
  const model = useScreenSpecEditorModel({
    value,
    onChange,
    onCompileError,
    selectedPath,
    onSelectPath,
  });

  if (pane === 'outline') {
    return (
      <WorkbenchFill className={className} data-testid="screen-spec-editor">
        <ScreenSpecOutlineBody model={model} />
      </WorkbenchFill>
    );
  }

  if (pane === 'inspector') {
    return (
      <WorkbenchFill className={className}>
        <ScreenSpecInspectorBody model={model} />
      </WorkbenchFill>
    );
  }

  return (
    <WorkbenchFill className={className} data-testid="screen-spec-editor">
      <SplitView
        defaultPrimarySizePercent={38}
        minPrimarySizePercent={24}
        maxPrimarySizePercent={55}
        primary={<ScreenSpecOutlineBody model={model} />}
        secondary={<ScreenSpecInspectorBody model={model} />}
      />
    </WorkbenchFill>
  );
}
