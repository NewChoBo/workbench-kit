import { useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import {
  createCommandRegistry,
  executeCommand,
  resolveCommandMenuItems,
} from '@workbench-kit/platform';
import { isSaveSuccess, type SaveResult } from '@workbench-kit/contracts';
import { useWorkspaceDrafts } from './WorkspaceDraftsContext';
import { ConfirmDialog } from '../../modal/ConfirmDialog';
import { ContextMenu, type ContextMenuItem } from '../../overlay/ContextMenu';
import { Button } from '../../primitives/Button';
import { EmptyState } from '../../primitives/EmptyState';
import { IconButton } from '../../primitives/IconButton';
import { Panel, PanelBody } from '../../layout/Panel';
import {
  WORKBENCH_COMMAND_SURFACE_EDITOR,
  commandMenuItemsToContextMenuItems,
  createWorkbenchEditorCommands,
  createWorkbenchEditorTabListMenuEntries,
  createWorkbenchEditorTabMenuEntries,
  type WorkbenchEditorCommandContext,
} from '../commands';
import { fileNameOfPath } from './path';
import { WorkspaceEditor, type WorkspaceEditorTheme } from './WorkspaceEditor';
import { WorkspaceFileIcon } from './WorkspaceFileIcon';
import type { WorkspaceFile } from './types';

const editorCommandRegistry = createCommandRegistry(createWorkbenchEditorCommands());
const editorTabListMenuEntries = createWorkbenchEditorTabListMenuEntries();
const editorTabMenuEntries = createWorkbenchEditorTabMenuEntries();

export interface WorkspaceEditorPanelRenderEditorContext {
  content: string;
  file: WorkspaceFile;
  isDirty: boolean;
  onChange: (content: string) => void;
  onDiscard: () => void;
  onSave: (content: string) => void;
  theme?: WorkspaceEditorTheme | undefined;
}

export type WorkspaceEditorPanelRenderEditor = (
  context: WorkspaceEditorPanelRenderEditorContext,
) => ReactNode;

export interface WorkspaceEditorPanelRenderTabActionsContext {
  content: string;
  file: WorkspaceFile;
  isDirty: boolean;
  onDelete: () => void;
  onDiscard: () => void;
  onSave: () => void;
  theme?: WorkspaceEditorTheme | undefined;
}

export type WorkspaceEditorPanelRenderTabActions = (
  context: WorkspaceEditorPanelRenderTabActionsContext,
) => ReactNode;

export interface WorkspaceEditorPanelProps {
  emptyLabel?: string;
  files: WorkspaceFile[];
  onCloseAll?: () => void;
  onCloseOthers?: (path: string) => void;
  onClosePath?: (path: string) => void;
  onCopyPath?: (path: string) => void;
  onDeletePath?: (path: string) => void;
  onSaveFile?: (
    path: string,
    content: string,
    previousUpdatedAt?: string,
  ) => SaveResult | Promise<SaveResult | undefined> | undefined;
  onSelectedPathChange: (path: string) => void;
  openPaths: string[];
  renderEditor?: WorkspaceEditorPanelRenderEditor | undefined;
  renderTabActions?: WorkspaceEditorPanelRenderTabActions | undefined;
  selectedPath?: string;
  theme?: WorkspaceEditorTheme;
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
  renderEditor,
  renderTabActions,
  selectedPath,
  theme,
}: WorkspaceEditorPanelProps) {
  const filesByPath = useMemo(() => new Map(files.map((file) => [file.path, file])), [files]);
  const openFiles = openPaths
    .map((path) => filesByPath.get(path))
    .filter((file): file is WorkspaceFile => Boolean(file));
  const selectedFile = selectedPath ? filesByPath.get(selectedPath) : openFiles[0];
  const [deletePath, setDeletePath] = useState<string | null>(null);
  const {
    getDraft,
    isDirty,
    updateDraft: updateDraftContext,
    saveDraft: saveDraftContext,
    discardDraft: discardDraftContext,
  } = useWorkspaceDrafts();
  const [tabContextMenu, setTabContextMenu] = useState<{
    path: string | null;
    x: number;
    y: number;
  } | null>(null);
  const selectedContent = selectedFile ? getDraft(selectedFile.path, selectedFile.content) : '';

  const updateDraft = (path: string, content: string) => {
    updateDraftContext(path, content, filesByPath.get(path)?.content ?? '');
  };

  const saveFile = (path: string, content: string) => {
    Promise.resolve(onSaveFile?.(path, content, filesByPath.get(path)?.updatedAt))
      .then((result) => {
        if (!result || isSaveSuccess(result)) {
          saveDraftContext(path, content);
        }
      })
      .catch(() => {
        // keep draft intact when persistence fails
      });
  };

  const discardFile = (file: WorkspaceFile) => {
    discardDraftContext(file.path, file.content);
  };

  const handleTabContextMenu = (event: MouseEvent<HTMLElement>, path: string | null) => {
    event.preventDefault();
    event.stopPropagation();
    setTabContextMenu({ path, x: event.clientX, y: event.clientY });
  };

  const createEditorCommandContext = (
    file: WorkspaceFile | undefined,
  ): WorkbenchEditorCommandContext => {
    const filePath = file?.path;
    const content = file ? getDraft(file.path, file.content) : '';

    return {
      canCloseAll: Boolean(onCloseAll),
      canCloseOthers: Boolean(onCloseOthers),
      canClosePath: Boolean(onClosePath),
      canCopyPath: Boolean(onCopyPath),
      canDeletePath: Boolean(onDeletePath),
      canDiscardFile: Boolean(filePath),
      canSaveFile: Boolean(filePath),
      canSplitDown: false,
      canSplitRight: false,
      canTogglePinned: false,
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
      discardFile: () => {
        if (file) discardFile(file);
      },
      filePath,
      hasMultipleOpenFiles: openFiles.length > 1,
      hasOpenFiles: openFiles.length > 0,
      hasUnsavedChanges: Boolean(file && isDirty(file.path, file.content)),
      isPinned: false,
      saveFile: () => {
        if (filePath) saveFile(filePath, content);
      },
      splitDown: () => undefined,
      splitRight: () => undefined,
      togglePinned: () => undefined,
    };
  };

  const createTabContextItems = (path: string | null): ContextMenuItem[] => {
    const file = path ? filesByPath.get(path) : undefined;
    const context = createEditorCommandContext(file);

    return commandMenuItemsToContextMenuItems(
      resolveCommandMenuItems({
        context,
        surface: WORKBENCH_COMMAND_SURFACE_EDITOR,
        entries: file ? editorTabMenuEntries : editorTabListMenuEntries,
        registry: editorCommandRegistry,
      }),
      (commandId) => executeCommand(editorCommandRegistry, commandId, context),
    );
  };

  const handleConfirmDelete = () => {
    if (deletePath) {
      onDeletePath?.(deletePath);
    }
    setDeletePath(null);
  };
  const selectedIsDirty = Boolean(selectedFile && isDirty(selectedFile.path, selectedFile.content));

  return (
    <Panel className="workspace-panel">
      <PanelBody className="workspace-panel__body">
        {openFiles.length > 0 ? (
          <div
            className="workspace-editor"
            onKeyDown={(event) => {
              if (!selectedFile) return;
              if (event.key.toLowerCase() !== 's' || (!event.ctrlKey && !event.metaKey)) return;

              event.preventDefault();
              saveFile(selectedFile.path, selectedContent);
            }}
          >
            <div className="workspace-editor__tabbar">
              <div
                aria-label="Open workspace files"
                className="workspace-editor__tabs ui-workbench-scrollbar--hidden"
                role="tablist"
                onContextMenu={(event) => handleTabContextMenu(event, null)}
              >
                {openFiles.map((file) => {
                  const isActive = file.path === selectedFile?.path;
                  const isDirtyValue = isDirty(file.path, file.content);

                  return (
                    <div
                      key={file.path}
                      className={`workspace-editor__tab${isActive ? ' workspace-editor__tab--active' : ''}`}
                      title={file.path}
                      onContextMenu={(event) => handleTabContextMenu(event, file.path)}
                    >
                      <Button
                        aria-selected={isActive}
                        className="workspace-editor__tab-button"
                        role="tab"
                        onClick={() => onSelectedPathChange(file.path)}
                      >
                        <WorkspaceFileIcon mimeType={file.mimeType} path={file.path} />
                        <span className="workspace-editor__path">{fileNameOfPath(file.path)}</span>
                        {isDirtyValue ? (
                          <span className="workspace-editor__dirty" aria-label="Unsaved changes" />
                        ) : null}
                      </Button>
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

              {selectedFile && renderTabActions ? (
                <div className="workspace-editor__tab-actions">
                  {renderTabActions({
                    content: selectedContent,
                    file: selectedFile,
                    isDirty: selectedIsDirty,
                    onDelete: () => setDeletePath(selectedFile.path),
                    onDiscard: () => discardFile(selectedFile),
                    onSave: () => saveFile(selectedFile.path, selectedContent),
                    theme,
                  })}
                </div>
              ) : null}
            </div>

            {selectedFile ? (
              renderEditor ? (
                renderEditor({
                  content: selectedContent,
                  file: selectedFile,
                  isDirty: selectedIsDirty,
                  onChange: (content) => updateDraft(selectedFile.path, content),
                  onDiscard: () => discardFile(selectedFile),
                  onSave: (content) => saveFile(selectedFile.path, content),
                  theme,
                })
              ) : (
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
              )
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
