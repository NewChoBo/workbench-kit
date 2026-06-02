import { useMemo, useState, type MouseEvent } from 'react';
import { ConfirmDialog } from '../../modal/ConfirmDialog';
import { ContextMenu, type ContextMenuItem } from '../../overlay/ContextMenu';
import { EmptyState } from '../../primitives/EmptyState';
import { IconButton } from '../../primitives/IconButton';
import { Toolbar } from '../../primitives/Toolbar';
import { Panel, PanelBody } from '../../layout/Panel';
import { fileNameOfPath } from './path';
import { WorkspaceEditor } from './WorkspaceEditor';
import { WorkspaceFileIcon } from './WorkspaceFileIcon';
import type { WorkspaceFile } from './types';

interface FileDraft {
  content: string;
  savedContent: string;
}

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

  const createTabContextItems = (path: string | null): ContextMenuItem[] => {
    const file = path ? filesByPath.get(path) : null;

    if (!file) {
      return [
        {
          id: 'close-all',
          label: 'Close all',
          icon: 'codicon-close-all',
          disabled: openFiles.length === 0 || !onCloseAll,
          onSelect: () => onCloseAll?.(),
        },
      ];
    }

    return [
      {
        id: 'copy-path',
        label: 'Copy path',
        icon: 'codicon-copy',
        disabled: !onCopyPath,
        onSelect: () => onCopyPath?.(file.path),
      },
      { id: 'tab-file-separator', type: 'separator' },
      {
        id: 'close',
        label: 'Close',
        icon: 'codicon-close',
        disabled: !onClosePath,
        onSelect: () => onClosePath?.(file.path),
      },
      {
        id: 'close-others',
        label: 'Close others',
        icon: 'codicon-close-all',
        disabled: openFiles.length <= 1 || !onCloseOthers,
        onSelect: () => onCloseOthers?.(file.path),
      },
      {
        id: 'close-all',
        label: 'Close all',
        icon: 'codicon-close-all',
        disabled: !onCloseAll,
        onSelect: () => onCloseAll?.(),
      },
      { id: 'tab-danger-separator', type: 'separator' },
      {
        id: 'delete',
        label: 'Delete',
        icon: 'codicon-trash',
        danger: true,
        disabled: !onDeletePath,
        onSelect: () => setDeletePath(file.path),
      },
    ];
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
