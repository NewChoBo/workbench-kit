import { useMemo, useState, type MouseEvent } from 'react';
import {
  canExecuteCommand,
  createCommandRegistry,
  executeCommand,
  resolveCommandMenuItems,
} from '@newchobo-ui/core';
import {
  discardWorkspaceFileDraft,
  resolveWorkspaceFileDraft,
  saveWorkspaceFileDraft,
  updateWorkspaceFileDraft,
  type WorkspaceFileDraftMap,
} from '@newchobo-ui/workspace';
import { ConfirmDialog } from '../../modal/ConfirmDialog';
import { ContextMenu, type ContextMenuItem } from '../../overlay/ContextMenu';
import { EmptyState } from '../../primitives/EmptyState';
import { IconButton } from '../../primitives/IconButton';
import { Toolbar } from '../../primitives/Toolbar';
import { Panel, PanelBody } from '../../layout/Panel';
import {
  WORKBENCH_EDITOR_DISCARD_CHANGES_COMMAND_ID,
  WORKBENCH_EDITOR_SAVE_COMMAND_ID,
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
  const [draftsByPath, setDraftsByPath] = useState<WorkspaceFileDraftMap>({});
  const [tabContextMenu, setTabContextMenu] = useState<{
    path: string | null;
    x: number;
    y: number;
  } | null>(null);
  const selectedDraft = selectedFile
    ? resolveWorkspaceFileDraft({
        draft: draftsByPath[selectedFile.path],
        file: selectedFile,
      })
    : null;
  const selectedContent = selectedDraft?.content ?? '';

  const updateDraft = (path: string, content: string) => {
    setDraftsByPath((currentDrafts) =>
      updateWorkspaceFileDraft({
        content,
        drafts: currentDrafts,
        fileContent: filesByPath.get(path)?.content ?? '',
        path,
      }),
    );
  };

  const saveFile = (path: string, content: string) => {
    onSaveFile?.(path, content);
    setDraftsByPath((currentDrafts) =>
      saveWorkspaceFileDraft({
        content,
        drafts: currentDrafts,
        path,
      }),
    );
  };

  const discardFile = (file: WorkspaceFile) => {
    setDraftsByPath((currentDrafts) =>
      discardWorkspaceFileDraft({
        drafts: currentDrafts,
        file,
      }),
    );
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
    const draft = file
      ? resolveWorkspaceFileDraft({
          draft: draftsByPath[file.path],
          file,
        })
      : undefined;
    const content = draft?.content ?? '';

    return {
      canCloseAll: Boolean(onCloseAll),
      canCloseOthers: Boolean(onCloseOthers),
      canClosePath: Boolean(onClosePath),
      canCopyPath: Boolean(onCopyPath),
      canDeletePath: Boolean(onDeletePath),
      canDiscardFile: Boolean(filePath),
      canSaveFile: Boolean(filePath),
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
      hasUnsavedChanges: Boolean(file && content !== file.content),
      saveFile: () => {
        if (filePath) saveFile(filePath, content);
      },
    };
  };

  const createTabContextItems = (path: string | null): ContextMenuItem[] => {
    const file = path ? filesByPath.get(path) : undefined;
    const context = createEditorCommandContext(file);

    return commandMenuItemsToContextMenuItems(
      resolveCommandMenuItems({
        context,
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
  const selectedCommandContext = createEditorCommandContext(selectedFile);

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
                  const draft = resolveWorkspaceFileDraft({
                    draft: draftsByPath[file.path],
                    file,
                  });
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
                    disabled={
                      !canExecuteCommand(
                        editorCommandRegistry,
                        WORKBENCH_EDITOR_SAVE_COMMAND_ID,
                        selectedCommandContext,
                      )
                    }
                    icon="codicon-save"
                    label="Save"
                    onClick={() =>
                      executeCommand(
                        editorCommandRegistry,
                        WORKBENCH_EDITOR_SAVE_COMMAND_ID,
                        selectedCommandContext,
                      )
                    }
                  />
                  <IconButton
                    disabled={
                      !canExecuteCommand(
                        editorCommandRegistry,
                        WORKBENCH_EDITOR_DISCARD_CHANGES_COMMAND_ID,
                        selectedCommandContext,
                      )
                    }
                    icon="codicon-discard"
                    label="Discard changes"
                    onClick={() =>
                      executeCommand(
                        editorCommandRegistry,
                        WORKBENCH_EDITOR_DISCARD_CHANGES_COMMAND_ID,
                        selectedCommandContext,
                      )
                    }
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
