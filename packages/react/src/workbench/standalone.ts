import type { CommandRegistry } from '@workbench-kit/core';
import type {
  SaveResult,
  WorkspacePatchApplyResult,
  WorkspacePatchEvent,
} from '@workbench-kit/contracts';
import type { ReactNode } from 'react';
import type { StatusBarSectionModel } from './StatusBar';
import type { WorkbenchShellCommandContext } from './commands';
import type { WorkspaceFile } from './workspace';

export type WorkbenchTheme = 'light' | 'dark' | (string & {});

export interface WorkbenchActivityDescriptor<TActivityId extends string = string> {
  id: TActivityId;
  label: string;
  icon?: string;
  iconNode?: ReactNode;
}

export interface WorkbenchActivityChangeEvent<TActivityId extends string = string> {
  nextActivityId: TActivityId;
}

export interface WorkbenchWorkspaceController {
  openFile: (path: string) => void | Promise<void>;
  saveFile: (path: string, content: string, previousUpdatedAt?: string) => Promise<SaveResult>;
  deleteFiles: (paths: string[]) => void | Promise<void>;
  moveFiles?: (paths: string[], targetParentPath: string | undefined) => void | Promise<void>;
  rename?: (path: string, nextName: string) => void | Promise<void>;
}

export interface WorkbenchChatController {
  onChatSubmit: (message: string, context?: Record<string, unknown>) => void | Promise<void>;
  onCancelChat: () => void;
}

export interface WorkbenchPatchController {
  onPatchApply: (patch: WorkspacePatchEvent) => Promise<WorkspacePatchApplyResult> | void;
}

export interface WorkbenchSaveController {
  onSaveResult?: (result: SaveResult) => void | Promise<void>;
  onCommitPatchResult?: (
    patch: WorkspacePatchEvent,
    result: WorkspacePatchApplyResult,
    source: 'chat' | 'command',
  ) => void | Promise<void>;
}

export interface WorkbenchStatusController {
  onStatusMessage?: (message: string) => void;
  onError?: (error: Error) => void;
}

export interface WorkbenchShellContract<TActivityId extends string = string> {
  activities: WorkbenchActivityDescriptor<TActivityId>[];
  commandRegistry: CommandRegistry<WorkbenchShellCommandContext<TActivityId>>;
  initialActivityId?: TActivityId;
  initialTheme?: WorkbenchTheme;
  statusSections: StatusBarSectionModel[];
  statusCompact?: boolean;
}

export interface WorkbenchStandaloneEntryState<TActivityId extends string = string> {
  activeActivityId: TActivityId;
  isPrimarySidebarVisible: boolean;
  primarySidebarSizePercent: number;
  primarySidebarMinPercent?: number;
  primarySidebarMaxPercent?: number;
  theme: WorkbenchTheme;
  isSettingsOpen?: boolean;
  settingsCategoryId?: string;
  settingsScopeId?: string;
  settingsSearchValue?: string;
  selectedFilePath?: string;
  openFilePaths?: readonly string[];
}

export interface WorkbenchStandaloneBootstrap<TActivityId extends string = string> {
  contract: WorkbenchShellContract<TActivityId>;
  initialFiles: readonly WorkspaceFile[];
  workspace: WorkbenchWorkspaceController;
  chat: WorkbenchChatController;
  patch: WorkbenchPatchController;
  save: WorkbenchSaveController;
  status: WorkbenchStatusController;
  initialState?: Partial<WorkbenchStandaloneEntryState<TActivityId>>;
}

export type WorkbenchStandaloneBootstrapEvent<TActivityId extends string = string> =
  | { type: 'activity-change'; payload: WorkbenchActivityChangeEvent<TActivityId> }
  | { type: 'status-message'; message: string }
  | { type: 'error'; error: Error };
