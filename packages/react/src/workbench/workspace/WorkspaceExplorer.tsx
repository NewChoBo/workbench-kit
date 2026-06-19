import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import {
  createEmptyWorkspaceSelection,
  getWorkspaceSelectionActionPaths,
  normalizeWorkspaceSelectionPaths,
  parentPathOf,
  updateWorkspaceSelection,
  type WorkspaceSelectionMode,
  type WorkspaceSelectionState,
} from '@workbench-kit/workspace';
import { VS_CODE_TREE_BASE_INDENT, VS_CODE_TREE_INDENT_SIZE } from '../../layout/layoutHelpers';
import { SideBarList, SideBarListItem, sideBarTreeDepthStyle } from '../../layout/SideBarViewFrame';
import { cxCodicon } from '../../utils/codicon';
import { flattenWorkspaceTree } from './tree';
import { WorkspaceFileIcon } from './WorkspaceFileIcon';
import type { WorkspaceTreeNode } from './types';

export const WORKSPACE_EXPLORER_DRAG_DATA_TYPE = 'application/x-newchobo-ui-workspace-paths';
export const WORKSPACE_EXPLORER_DRAG_METADATA_DATA_TYPE = `${WORKSPACE_EXPLORER_DRAG_DATA_TYPE}.metadata`;

export type WorkspaceExplorerSelectionChangeReason =
  | 'clear'
  | 'click'
  | 'context-menu'
  | 'drag-start'
  | 'folder-click';

export interface WorkspaceExplorerSelectionChangeMeta {
  event?: DragEvent<HTMLButtonElement> | MouseEvent<HTMLButtonElement>;
  mode?: WorkspaceSelectionMode;
  node?: WorkspaceTreeNode;
  reason: WorkspaceExplorerSelectionChangeReason;
}

export interface WorkspaceExplorerItemActionMeta {
  actionPaths: string[];
  selected: boolean;
  selection: WorkspaceSelectionState;
}

export type WorkspaceExplorerItemContextMenuMeta = WorkspaceExplorerItemActionMeta;

export interface WorkspaceExplorerDragMetadataContext {
  event: DragEvent<HTMLButtonElement>;
  node: WorkspaceTreeNode;
  sourcePaths: string[];
  selection: WorkspaceSelectionState;
}

export type WorkspaceExplorerDragMetadata = unknown;

export type WorkspaceExplorerDragMetadataFactory<TMetadata = WorkspaceExplorerDragMetadata> = (
  meta: WorkspaceExplorerDragMetadataContext,
) => TMetadata | undefined;

export interface WorkspaceExplorerItemKeyboardActionMeta extends WorkspaceExplorerItemActionMeta {
  event: KeyboardEvent<HTMLButtonElement>;
  node: WorkspaceTreeNode;
}

export interface WorkspaceExplorerMoveRequestMeta {
  event: DragEvent<HTMLButtonElement | HTMLUListElement>;
  sourcePaths: string[];
  targetFolderPath: string;
  targetNode?: WorkspaceTreeNode;
}

export type WorkspaceExplorerInlineEditKind =
  | 'create-file'
  | 'create-folder'
  | 'rename-file'
  | 'rename-folder';

export interface WorkspaceExplorerInlineEditState {
  error?: ReactNode;
  id?: string;
  kind: WorkspaceExplorerInlineEditKind;
  parentPath?: string;
  path?: string;
  value: string;
}

export interface WorkspaceExplorerInlineEditCommitMeta {
  edit: WorkspaceExplorerInlineEditState;
  value: string;
}

export interface WorkspaceExplorerProps {
  activePath?: string;
  dragDataType?: string;
  dragMetadataDataType?: string;
  dragMetadataFactory?: WorkspaceExplorerDragMetadataFactory;
  expandedPaths: Set<string>;
  filterQuery?: string;
  inlineEdit?: WorkspaceExplorerInlineEditState;
  nodes: WorkspaceTreeNode[];
  onActivateFile: (path: string) => void;
  onInlineEditCancel?: (edit: WorkspaceExplorerInlineEditState) => void;
  onInlineEditCommit?: (meta: WorkspaceExplorerInlineEditCommitMeta) => void;
  onInlineEditValueChange?: (value: string, edit: WorkspaceExplorerInlineEditState) => void;
  onItemContextMenu?: (
    event: MouseEvent<HTMLButtonElement>,
    node: WorkspaceTreeNode,
    meta: WorkspaceExplorerItemContextMenuMeta,
  ) => void;
  onRequestDelete?: (meta: WorkspaceExplorerItemKeyboardActionMeta) => void;
  onRequestMove?: (meta: WorkspaceExplorerMoveRequestMeta) => void;
  onRequestRename?: (meta: WorkspaceExplorerItemKeyboardActionMeta) => void;
  onSelectionChange?: (
    selection: WorkspaceSelectionState,
    meta: WorkspaceExplorerSelectionChangeMeta,
  ) => void;
  onToggleFolder: (path: string) => void;
  focusedPath?: string | undefined;
  selectedPaths?: Iterable<string>;
  selectionAnchorPath?: string;
}

export function WorkspaceExplorer({
  activePath,
  dragDataType = WORKSPACE_EXPLORER_DRAG_DATA_TYPE,
  dragMetadataDataType = WORKSPACE_EXPLORER_DRAG_METADATA_DATA_TYPE,
  dragMetadataFactory,
  expandedPaths,
  filterQuery = '',
  focusedPath,
  inlineEdit,
  nodes,
  onActivateFile,
  onInlineEditCancel,
  onInlineEditCommit,
  onInlineEditValueChange,
  onItemContextMenu,
  onRequestDelete,
  onRequestMove,
  onRequestRename,
  onSelectionChange,
  onToggleFolder,
  selectedPaths = [],
  selectionAnchorPath,
}: WorkspaceExplorerProps) {
  const draggedPathsRef = useRef<string[]>([]);
  const inlineEditInputRef = useRef<HTMLInputElement>(null);
  const [dropTargetPath, setDropTargetPath] = useState<string | null>(null);
  const visibleNodes = useMemo(
    () => flattenWorkspaceTree({ expandedPaths, filterQuery, nodes }),
    [expandedPaths, filterQuery, nodes],
  );
  const visibleFilePaths = useMemo(
    () => visibleNodes.filter(({ node }) => node.type === 'file').map(({ node }) => node.path),
    [visibleNodes],
  );
  const normalizedSelectedPaths = useMemo(
    () => normalizeWorkspaceSelectionPaths(selectedPaths),
    [selectedPaths],
  );
  const selectedPathSet = useMemo(
    () => new Set(normalizedSelectedPaths),
    [normalizedSelectedPaths],
  );
  const currentSelection = useMemo<WorkspaceSelectionState>(
    () => ({
      anchorPath: selectionAnchorPath,
      paths: normalizedSelectedPaths,
    }),
    [normalizedSelectedPaths, selectionAnchorPath],
  );
  const inlineEditKey = inlineEdit
    ? (inlineEdit.id ??
      `${inlineEdit.kind}:${inlineEdit.path ?? ''}:${inlineEdit.parentPath ?? ''}`)
    : undefined;

  useEffect(() => {
    const input = inlineEditInputRef.current;
    if (!input) return;

    input.focus();
    input.select();
  }, [inlineEditKey]);

  const selectFile = (event: MouseEvent<HTMLButtonElement>, node: WorkspaceTreeNode) => {
    const mode = resolveSelectionMode(event);
    const nextSelection = onSelectionChange
      ? {
          ...updateWorkspaceSelection({
            mode,
            orderedPaths: visibleFilePaths,
            selection: currentSelection,
            targetPath: node.path,
          }),
          focusedPath: node.path,
        }
      : currentSelection;

    if (onSelectionChange) {
      onSelectionChange(nextSelection, { event, mode, node, reason: 'click' });
    }

    if (mode === 'single' || !onSelectionChange) {
      onActivateFile(node.path);
    }
  };

  const selectFolder = (event: MouseEvent<HTMLButtonElement>, node: WorkspaceTreeNode) => {
    onSelectionChange?.(
      {
        anchorPath: undefined,
        focusedPath: node.path,
        paths: [],
      },
      { event, mode: 'single', node, reason: 'folder-click' },
    );
    onToggleFolder(node.path);
  };

  const clearSelection = () => {
    onSelectionChange?.(createEmptyWorkspaceSelection(), { reason: 'clear' });
  };

  const getItemActionMeta = (node: WorkspaceTreeNode): WorkspaceExplorerItemActionMeta => {
    if (node.type === 'folder') {
      const selection = {
        anchorPath: undefined,
        focusedPath: node.path,
        paths: [] as string[],
      };

      return {
        actionPaths: [node.path],
        selected: focusedPath === node.path,
        selection,
      };
    }

    const selected = selectedPathSet.has(node.path);
    const selection = !selected
      ? {
          anchorPath: node.path,
          focusedPath: node.path,
          paths: [node.path],
        }
      : {
          ...currentSelection,
          focusedPath: node.path,
        };

    return {
      actionPaths: getWorkspaceSelectionActionPaths({
        selectedPaths: selection.paths,
        targetPath: node.path,
      }),
      selected,
      selection,
    };
  };

  const handleItemContextMenu = (event: MouseEvent<HTMLButtonElement>, node: WorkspaceTreeNode) => {
    const meta = getItemActionMeta(node);

    if (node.type === 'file' && !meta.selected) {
      onSelectionChange?.(
        {
          ...meta.selection,
          focusedPath: node.path,
        },
        {
          event,
          mode: 'single',
          node,
          reason: 'context-menu',
        },
      );
    }

    if (node.type === 'folder') {
      onSelectionChange?.(
        {
          anchorPath: undefined,
          focusedPath: node.path,
          paths: [],
        },
        {
          event,
          mode: 'single',
          node,
          reason: 'context-menu',
        },
      );
    }

    onItemContextMenu?.(event, node, meta);
  };

  const handleItemKeyDown = (event: KeyboardEvent<HTMLButtonElement>, node: WorkspaceTreeNode) => {
    if (event.key !== 'Delete' && event.key !== 'F2') return;

    const meta = getItemActionMeta(node);

    if (event.key === 'Delete') {
      if (meta.actionPaths.length === 0) return;

      event.preventDefault();
      onRequestDelete?.({ ...meta, event, node });
      return;
    }

    if (meta.actionPaths.length !== 1) return;

    event.preventDefault();
    onRequestRename?.({ ...meta, event, node });
  };

  const canDropToFolder = (targetFolderPath: string) =>
    Boolean(onRequestMove) &&
    draggedPathsRef.current.length > 0 &&
    draggedPathsRef.current.some(
      (sourcePath) =>
        parentPathOf(sourcePath) !== targetFolderPath &&
        sourcePath !== targetFolderPath &&
        !targetFolderPath.startsWith(`${sourcePath}/`),
    );

  const handleItemDragStart = (event: DragEvent<HTMLButtonElement>, node: WorkspaceTreeNode) => {
    if (!onRequestMove) {
      event.preventDefault();
      return;
    }

    const meta = getItemActionMeta(node);
    const sourcePaths = meta.actionPaths;
    if (sourcePaths.length === 0) {
      event.preventDefault();
      return;
    }

    if (!meta.selected) {
      onSelectionChange?.(meta.selection, {
        event,
        mode: 'single',
        node,
        reason: 'drag-start',
      });
    }

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(dragDataType, JSON.stringify(sourcePaths));
    if (dragMetadataFactory) {
      const metadata = dragMetadataFactory({
        event,
        node,
        sourcePaths,
        selection: meta.selection,
      });

      if (metadata !== undefined) {
        event.dataTransfer.setData(dragMetadataDataType, JSON.stringify(metadata));
      }
    }
    event.dataTransfer.setData('text/plain', sourcePaths.join('\n'));
    draggedPathsRef.current = sourcePaths;
    setDropTargetPath(null);
  };

  const handleDragEnd = () => {
    draggedPathsRef.current = [];
    setDropTargetPath(null);
  };

  const handleDropTargetDragOver = (
    event: DragEvent<HTMLButtonElement | HTMLUListElement>,
    targetFolderPath: string,
  ) => {
    if (!canDropToFolder(targetFolderPath)) return;

    if (targetFolderPath) {
      event.stopPropagation();
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropTargetPath(targetFolderPath);
  };

  const handleDropTargetDragLeave = (
    event: DragEvent<HTMLButtonElement | HTMLUListElement>,
    targetFolderPath: string,
  ) => {
    if (targetFolderPath) {
      event.stopPropagation();
    }
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;

    setDropTargetPath((currentPath) => (currentPath === targetFolderPath ? null : currentPath));
  };

  const handleDrop = (
    event: DragEvent<HTMLButtonElement | HTMLUListElement>,
    targetFolderPath: string,
    targetNode?: WorkspaceTreeNode,
  ) => {
    if (!canDropToFolder(targetFolderPath)) return;

    if (targetFolderPath) {
      event.stopPropagation();
    }
    event.preventDefault();
    onRequestMove?.({
      event,
      sourcePaths: draggedPathsRef.current,
      targetFolderPath,
      targetNode,
    });
    draggedPathsRef.current = [];
    setDropTargetPath(null);
  };

  const commitInlineEdit = () => {
    if (!inlineEdit) return;

    onInlineEditCommit?.({
      edit: inlineEdit,
      value: inlineEdit.value.trim(),
    });
  };

  const handleInlineEditKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!inlineEdit) return;

    if (event.key === 'Enter') {
      event.preventDefault();
      commitInlineEdit();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      onInlineEditCancel?.(inlineEdit);
    }
  };

  const renderInlineEdit = ({
    depth,
    directory,
    key,
    mimeType,
    path,
  }: {
    depth: number;
    directory: boolean;
    key: string;
    mimeType?: string;
    path: string;
  }) => {
    if (!inlineEdit) return null;

    const depthStyle = sideBarTreeDepthStyle(depth, undefined, VS_CODE_TREE_INDENT_SIZE, VS_CODE_TREE_BASE_INDENT);

    return (
      <li key={key} className="ui-side-bar-list-entry">
        <div className="ui-side-bar-inline-edit" style={depthStyle}>
          <span className="workbench-tree-prefix">
            <span className="workbench-tree-spacer" />
            <WorkspaceFileIcon directory={directory} mimeType={mimeType} path={path} />
          </span>
          <input
            ref={inlineEditInputRef}
            aria-label="Workspace item name"
            className="ui-side-bar-inline-edit__input"
            value={inlineEdit.value}
            onBlur={commitInlineEdit}
            onChange={(event) => onInlineEditValueChange?.(event.currentTarget.value, inlineEdit)}
            onKeyDown={handleInlineEditKeyDown}
          />
        </div>
        {inlineEdit.error ? (
          <div className="ui-side-bar-inline-edit__error" style={depthStyle}>
            {inlineEdit.error}
          </div>
        ) : null}
      </li>
    );
  };

  return (
    <SideBarList
      fill
      aria-label="Workspace files"
      dropTarget={dropTargetPath === ''}
      onDragLeave={(event) => handleDropTargetDragLeave(event, '')}
      onDragOver={(event) => handleDropTargetDragOver(event, '')}
      onDrop={(event) => handleDrop(event, '')}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          clearSelection();
        }
      }}
    >
      {visibleNodes.map(({ depth, node }) => {
        const isFolder = node.type === 'folder';
        const expanded = expandedPaths.has(node.path) || Boolean(filterQuery.trim());
        const isFocused = focusedPath === node.path;
        const selected = isFocused || (node.type === 'file' && selectedPathSet.has(node.path));
        const dropTarget = isFolder && dropTargetPath === node.path;
        const editingRename =
          inlineEdit?.kind.startsWith('rename') && inlineEdit.path === node.path;

        return editingRename ? (
          renderInlineEdit({
            depth,
            directory: isFolder,
            key: `inline-edit:${inlineEditKey}`,
            mimeType: node.file?.mimeType,
            path: node.path,
          })
        ) : (
          <Fragment key={node.path}>
            <SideBarListItem
              active={activePath === node.path}
              data-workspace-path={node.path}
              depth={depth}
              draggable={Boolean(onRequestMove)}
              dropTarget={dropTarget}
              selected={selected}
              onClick={(event) => {
                if (isFolder) {
                  selectFolder(event, node);
                  return;
                }
                selectFile(event, node);
              }}
              onContextMenu={(event) => handleItemContextMenu(event, node)}
              onDragEnd={handleDragEnd}
              onDragLeave={
                isFolder ? (event) => handleDropTargetDragLeave(event, node.path) : undefined
              }
              onDragOver={
                isFolder ? (event) => handleDropTargetDragOver(event, node.path) : undefined
              }
              onDragStart={(event) => handleItemDragStart(event, node)}
              onDrop={isFolder ? (event) => handleDrop(event, node.path, node) : undefined}
              onKeyDown={(event) => handleItemKeyDown(event, node)}
            >
              <span className="workbench-tree-prefix">
                {isFolder ? (
                  <i
                    aria-hidden="true"
                    className={cxCodicon(
                      expanded ? 'chevron-down' : 'chevron-right',
                      'workbench-tree-chevron',
                    )}
                  />
                ) : (
                  <span className="workbench-tree-spacer" />
                )}
                <WorkspaceFileIcon
                  directory={isFolder}
                  expanded={expanded}
                  mimeType={node.file?.mimeType}
                  path={node.path}
                />
              </span>
              <span className="workbench-tree-label">{node.name}</span>
            </SideBarListItem>
            {isFolder &&
            inlineEdit?.kind.startsWith('create') &&
            inlineEdit.parentPath === node.path
              ? renderInlineEdit({
                  depth: depth + 1,
                  directory: inlineEdit.kind === 'create-folder',
                  key: `inline-edit:${inlineEditKey}`,
                  path: `${node.path}/${inlineEdit.value}`,
                })
              : null}
          </Fragment>
        );
      })}
      {inlineEdit?.kind.startsWith('create') && !inlineEdit.parentPath
        ? renderInlineEdit({
            depth: 0,
            directory: inlineEdit.kind === 'create-folder',
            key: `inline-edit:${inlineEditKey}`,
            path: inlineEdit.value,
          })
        : null}
      {visibleNodes.length === 0 ? <SideBarListItem disabled>No files</SideBarListItem> : null}
    </SideBarList>
  );
}

function resolveSelectionMode(event: MouseEvent<HTMLElement>): WorkspaceSelectionMode {
  const range = event.shiftKey;
  const toggle = event.ctrlKey || event.metaKey;

  if (range && toggle) return 'toggle-range';
  if (range) return 'range';
  if (toggle) return 'toggle';
  return 'single';
}
