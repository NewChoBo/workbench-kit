import { useMemo, useState, type MouseEvent } from 'react';
import {
  commandMenuSeparator,
  createCommandRegistry,
  executeCommand,
  resolveCommandMenuItems,
  type CommandMenuEntry,
} from '@newchobo-ui/core';
import { ConfirmDialog } from '../../modal/ConfirmDialog';
import { ContextMenu, type ContextMenuItem } from '../../overlay/ContextMenu';
import { EmptyState } from '../../primitives/EmptyState';
import { IconButton } from '../../primitives/IconButton';
import { Toolbar } from '../../primitives/Toolbar';
import { Panel, PanelBody } from '../../layout/Panel';
import { commandMenuItemsToContextMenuItems } from '../commands';
import { fileNameOfPath } from './path';
import { WorkspaceEditor, type WorkspaceEditorTheme } from './WorkspaceEditor';
import { WorkspaceFileIcon } from './WorkspaceFileIcon';
import type { WorkspaceFile } from './types';

interface FileDraft {
  content: string;
  savedContent: string;
}

interface EditorTabCommandContext {
  canCloseAll: boolean;
  canCloseOthers: boolean;
  canClosePath: boolean;
  canCopyPath: boolean;
  canDeletePath: boolean;
  closeAll: () => void;
  closeOthers: () => void;
  closePath: () => void;
  copyPath: () => void;
  deletePath: () => void;
  filePath?: string;
  hasMultipleOpenFiles: boolean;
  hasOpenFiles: boolean;
}

const editorTabCommandRegistry = createCommandRegistry<EditorTabCommandContext>([
  {
    id: 'editor.copyPath',
    label: 'Copy path',
    icon: 'codicon-copy',
    isEnabled: ({ canCopyPath, filePath }) => Boolean(filePath && canCopyPath),
    run: ({ copyPath }) => copyPath(),
  },
  {
    id: 'editor.close',
    label: 'Close',
    icon: 'codicon-close',
    isEnabled: ({ canClosePath, filePath }) => Boolean(filePath && canClosePath),
    run: ({ closePath }) => closePath(),
  },
  {
    id: 'editor.closeOthers',
    label: 'Close others',
    icon: 'codicon-close-all',
    isEnabled: ({ canCloseOthers, filePath, hasMultipleOpenFiles }) =>
      Boolean(filePath && canCloseOthers && hasMultipleOpenFiles),
    run: ({ closeOthers }) => closeOthers(),
  },
  {
    id: 'editor.closeAll',
    label: 'Close all',
    icon: 'codicon-close-all',
    isEnabled: ({ canCloseAll, hasOpenFiles }) => canCloseAll && hasOpenFiles,
    run: ({ closeAll }) => closeAll(),
  },
  {
    id: 'editor.delete',
    label: 'Delete',
    icon: 'codicon-trash',
    danger: true,
    isEnabled: ({ canDeletePath, filePath }) => Boolean(filePath && canDeletePath),
    run: ({ deletePath }) => deletePath(),
  },
]);

const editorTabListMenuEntries: CommandMenuEntry<EditorTabCommandContext>[] = [
  { commandId: 'editor.closeAll' },
];

const editorTabMenuEntries: CommandMenuEntry<EditorTabCommandContext>[] = [
  { commandId: 'editor.copyPath' },
  commandMenuSeparator('tab-file-separator'),
  { commandId: 'editor.close' },
  { commandId: 'editor.closeOthers' },
  { commandId: 'editor.closeAll' },
  commandMenuSeparator('tab-danger-separator'),
  { commandId: 'editor.delete' },
];

export interface WorkspaceEditorPanelProps {
  emptyLabel?: string;
  files: WorkspaceFile[];
  onCloseAll?: () => void;
  onCloseOthers?: (path: string) => void;
  onClosePath?: (path: string) => void;
  onCopyPath?: (path: string) => void;
  onDeletePath?: (path: string) => void;
  onSaveFile?: (path: string, content: string) => void;
  onSelectedPathChange: (path: string) => void;
  openPaths: string[];
  selectedPath?: string;
  theme?: WorkspaceEditorTheme;
}

function resolveDraft(file: WorkspaceFile, draft: FileDraft | undefined): FileDraft {
  if (!draft) {
    return {
      content: file.content,
      savedContent: file.content,
    };
  }

  if (draft.savedContent !== file.content && draft.content === draft.savedContent) {
    return {
      content: file.content,
      savedContent: file.content,
    };
  }

  return draft;
}

export function WorkspaceEditorPanel({
  emptyLabel = 'Open a file from Explorer or Search.',
  files,
  onCloseAll,
  onCloseOthers,
  onClosePath,
  onCopyPath,
  onDeletePath,
  onSaveFile,
  onSelectedPathChange,
  openPaths,
  selectedPath,
  theme,
}: WorkspaceEditorPanelProps) {
  const filesByPath = useMemo(() => new Map(files.map((file) => [file.path, file])), [files]);
  const openFiles = openPaths
    .map((path) => filesByPath.get(path))
    .filter((file): file is WorkspaceFile => Boolean(file));
  const selectedFile = selectedPath ? filesByPath.get(selectedPath) : openFiles[0];
  const [deletePath, setDeletePath] = useState<string | null>(null);
  const [draftsByPath, setDraftsByPath] = useState<Record<string, FileDraft>>({});
  const [tabContextMenu, setTabContextMenu] = useState<{
    path: string | null;
    x: number;
    y: number;
  } | null>(null);
  const selectedDraft = selectedFile
    ? resolveDraft(selectedFile, draftsByPath[selectedFile.path])
    : null;
  const selectedContent = selectedDraft?.content ?? '';
  const isSelectedDirty = Boolean(selectedFile && selectedContent !== selectedFile.content);

  const updateDraft = (path: string, content: string) => {
    setDraftsByPath((currentDrafts) => {
      const fileContent = filesByPath.get(path)?.content ?? '';
      const currentDraft = currentDrafts[path] ?? {
        content: fileContent,
        savedContent: fileContent,
      };

      return {
        ...currentDrafts,
        [path]: {
          ...currentDraft,
          content,
        },
      };
    });
  };

  const saveFile = (path: string, content: string) => {
    onSaveFile?.(path, content);
    setDraftsByPath((currentDrafts) => ({
      ...currentDrafts,
      [path]: {
        content,
        savedContent: content,
      },
    }));
  };

  const discardFile = (file: WorkspaceFile) => {
    setDraftsByPath((currentDrafts) => ({
      ...currentDrafts,
      [file.path]: {
        content: file.content,
        savedContent: file.content,
      },
    }));
  };

  const handleTabContextMenu = (event: MouseEvent<HTMLElement>, path: string | null) => {
    event.preventDefault();
    event.stopPropagation();
    setTabContextMenu({ path, x: event.clientX, y: event.clientY });
  };

  const createEditorTabCommandContext = (
    filePath: string | undefined,
  ): EditorTabCommandContext => ({
    canCloseAll: Boolean(onCloseAll),
    canCloseOthers: Boolean(onCloseOthers),
    canClosePath: Boolean(onClosePath),
    canCopyPath: Boolean(onCopyPath),
    canDeletePath: Boolean(onDeletePath),
    closeAll: () => onCloseAll?.(),
    closeOthers: () => {
      if (filePath) onCloseOthers?.(filePath);
    },
    closePath: () => {
      if (filePath) onClosePath?.(filePath);
    },
    copyPath: () => {
      if (filePath) onCopyPath?.(filePath);
    },
    deletePath: () => {
      if (filePath) setDeletePath(filePath);
    },
    filePath,
    hasMultipleOpenFiles: openFiles.length > 1,
    hasOpenFiles: openFiles.length > 0,
  });

  const createTabContextItems = (path: string | null): ContextMenuItem[] => {
    const filePath = path && filesByPath.has(path) ? path : undefined;
    const context = createEditorTabCommandContext(filePath);

    return commandMenuItemsToContextMenuItems(
      resolveCommandMenuItems({
        context,
        entries: filePath ? editorTabMenuEntries : editorTabListMenuEntries,
        registry: editorTabCommandRegistry,
      }),
      (commandId) => executeCommand(editorTabCommandRegistry, commandId, context),
    );
  };

  const handleConfirmDelete = () => {
    if (deletePath) {
      onDeletePath?.(deletePath);
    }
    setDeletePath(null);
  };

  return (
    <Panel className="workspace-panel">
      <PanelBody className="workspace-panel__body">
        {openFiles.length > 0 ? (
          <div className="workspace-editor">
            <div className="workspace-editor__tabbar">
              <div
                aria-label="Open workspace files"
                className="workspace-editor__tabs"
                role="tablist"
                onContextMenu={(event) => handleTabContextMenu(event, null)}
              >
                {openFiles.map((file) => {
                  const isActive = file.path === selectedFile?.path;
                  const draft = resolveDraft(file, draftsByPath[file.path]);
                  const isDirty = draft.content !== file.content;

                  return (
                    <div
                      key={file.path}
                      className={`workspace-editor__tab${isActive ? ' workspace-editor__tab--active' : ''}`}
                      title={file.path}
                      onContextMenu={(event) => handleTabContextMenu(event, file.path)}
                    >
                      <button
                        aria-selected={isActive}
                        className="workspace-editor__tab-button"
                        role="tab"
                        type="button"
                        onClick={() => onSelectedPathChange(file.path)}
                      >
                        <WorkspaceFileIcon mimeType={file.mimeType} path={file.path} />
                        <span className="workspace-editor__path">{fileNameOfPath(file.path)}</span>
                        {isDirty ? (
                          <span className="workspace-editor__dirty" aria-label="Unsaved changes" />
                        ) : null}
                      </button>
                      <IconButton
                        className="workspace-editor__tab-close"
                        icon="codicon-close"
                        label={`Close ${fileNameOfPath(file.path)}`}
                        onClick={() => onClosePath?.(file.path)}
                      />
                    </div>
                  );
                })}
              </div>

              {selectedFile ? (
                <Toolbar className="workspace-editor__actions">
                  <IconButton
                    disabled={!isSelectedDirty}
                    icon="codicon-save"
                    label="Save"
                    onClick={() => saveFile(selectedFile.path, selectedContent)}
                  />
                  <IconButton
                    disabled={!isSelectedDirty}
                    icon="codicon-discard"
                    label="Discard changes"
                    onClick={() => discardFile(selectedFile)}
                  />
                  <IconButton
                    disabled={!onDeletePath}
                    icon="codicon-trash"
                    label="Delete"
                    variant="danger"
                    onClick={() => setDeletePath(selectedFile.path)}
                  />
                </Toolbar>
              ) : null}
            </div>

            {selectedFile ? (
              <WorkspaceEditor
                key={selectedFile.path}
                file={selectedFile}
                readOnly={false}
                showHeader={false}
                theme={theme}
                value={selectedContent}
                onChange={(content) => updateDraft(selectedFile.path, content)}
                onSave={(content) => saveFile(selectedFile.path, content)}
              />
            ) : (
              <EmptyState icon="codicon-open-preview">{emptyLabel}</EmptyState>
            )}
          </div>
        ) : files.length === 0 ? (
          <EmptyState icon="codicon-folder">No workspace files</EmptyState>
        ) : (
          <EmptyState icon="codicon-open-preview">{emptyLabel}</EmptyState>
        )}
      </PanelBody>

      {deletePath ? (
        <ConfirmDialog
          closeLabel="Close confirmation"
          confirmLabel="Delete"
          detail={<code>{deletePath}</code>}
          message="Delete this workspace file?"
          title="Delete File"
          variant="danger"
          onCancel={() => setDeletePath(null)}
          onConfirm={handleConfirmDelete}
        />
      ) : null}

      {tabContextMenu ? (
        <ContextMenu
          ariaLabel="Editor tab menu"
          items={createTabContextItems(tabContextMenu.path)}
          x={tabContextMenu.x}
          y={tabContextMenu.y}
          onClose={() => setTabContextMenu(null)}
        />
      ) : null}
    </Panel>
  );
}
