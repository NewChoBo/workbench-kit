import { useMemo, type MouseEvent } from 'react';
import { SideBarList, SideBarListItem } from '../../layout/SideBarViewFrame';
import { flattenWorkspaceTree } from './tree';
import { WorkspaceFileIcon } from './WorkspaceFileIcon';
import type { WorkspaceTreeNode } from './types';

export interface WorkspaceExplorerProps {
  activePath?: string;
  expandedPaths: Set<string>;
  filterQuery?: string;
  nodes: WorkspaceTreeNode[];
  onActivateFile: (path: string) => void;
  onItemContextMenu?: (event: MouseEvent<HTMLElement>, node: WorkspaceTreeNode) => void;
  onToggleFolder: (path: string) => void;
}

export function WorkspaceExplorer({
  activePath,
  expandedPaths,
  filterQuery = '',
  nodes,
  onActivateFile,
  onItemContextMenu,
  onToggleFolder,
}: WorkspaceExplorerProps) {
  const visibleNodes = useMemo(
    () => flattenWorkspaceTree({ expandedPaths, filterQuery, nodes }),
    [expandedPaths, filterQuery, nodes],
  );

  return (
    <SideBarList fill aria-label="Workspace files">
      {visibleNodes.map(({ depth, node }) => {
        const isFolder = node.type === 'folder';
        const expanded = expandedPaths.has(node.path) || Boolean(filterQuery.trim());

        return (
          <SideBarListItem
            key={node.path}
            active={activePath === node.path}
            depth={depth}
            onClick={() => {
              if (isFolder) {
                onToggleFolder(node.path);
                return;
              }
              onActivateFile(node.path);
            }}
            onContextMenu={(event) => onItemContextMenu?.(event, node)}
          >
            <span className="workbench-tree-prefix">
              {isFolder ? (
                <i
                  aria-hidden="true"
                  className={`codicon codicon-chevron-${expanded ? 'down' : 'right'} workbench-tree-chevron`}
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
        );
      })}
      {visibleNodes.length === 0 ? <SideBarListItem disabled>No files</SideBarListItem> : null}
    </SideBarList>
  );
}
