export type ProviderLaunchActionKind = 'url' | 'exec' | 'script' | 'folder' | 'command' | 'steam';

export interface ProviderUrlAction {
  readonly type: 'url';
  readonly url: string;
}

export interface ProviderExecAction {
  readonly type: 'exec';
  readonly path: string;
  readonly args?: readonly string[];
  readonly workingDir?: string;
  readonly env?: Readonly<Record<string, string>>;
}

export interface ProviderScriptAction {
  readonly type: 'script';
  readonly shell: string;
  readonly command: string;
  readonly args?: readonly string[];
  readonly workingDir?: string;
  readonly env?: Readonly<Record<string, string>>;
}

export interface ProviderFolderAction {
  readonly type: 'folder';
  readonly path: string;
}

export interface ProviderCommandAction {
  readonly type: 'command';
  readonly commandId: string;
}

export type ProviderSteamActionMode = 'run' | 'rungameid' | 'install' | 'details';

export interface ProviderSteamAction {
  readonly type: 'steam';
  readonly appId: string;
  readonly mode?: ProviderSteamActionMode;
}

export type ProviderLibraryAction =
  | ProviderUrlAction
  | ProviderExecAction
  | ProviderScriptAction
  | ProviderFolderAction
  | ProviderCommandAction
  | ProviderSteamAction;

export interface MappedLaunchAction {
  readonly type: 'app' | 'url' | 'script' | 'folder' | 'command';
  readonly target: string;
  readonly args?: readonly string[];
  readonly workingDir?: string;
  readonly env?: Readonly<Record<string, string>>;
}

export function providerActionTypeLabel(action: Pick<ProviderLibraryAction, 'type'>): string {
  switch (action.type) {
    case 'steam':
      return 'Steam';
    case 'url':
      return 'URL';
    case 'exec':
      return 'App';
    case 'folder':
      return 'Folder';
    case 'script':
      return 'Script';
    case 'command':
      return 'Command';
  }
}

export function providerActionIcon(action: Pick<ProviderLibraryAction, 'type'>): string {
  switch (action.type) {
    case 'steam':
      return 'play';
    case 'url':
      return 'link';
    case 'exec':
      return 'window';
    case 'folder':
      return 'folder';
    case 'script':
    case 'command':
      return 'terminal';
  }
}

export function providerActionToLaunchAction(
  action: ProviderLibraryAction,
): MappedLaunchAction | null {
  switch (action.type) {
    case 'url':
      return { type: 'url', target: action.url };
    case 'exec':
      return {
        type: 'app',
        target: action.path,
        ...(action.args !== undefined ? { args: [...action.args] } : {}),
        ...(action.workingDir !== undefined ? { workingDir: action.workingDir } : {}),
        ...(action.env !== undefined ? { env: { ...action.env } } : {}),
      };
    case 'folder':
      return { type: 'folder', target: action.path };
    case 'steam':
      return { type: 'url', target: `steam://${steamLaunchActionToPath(action)}` };
    case 'script':
    case 'command':
    default:
      return null;
  }
}

function steamLaunchActionToPath(action: ProviderSteamAction): string {
  switch (action.mode ?? 'run') {
    case 'run':
      return `run/${action.appId}`;
    case 'rungameid':
      return `rungameid/${action.appId}`;
    case 'install':
      return `install/${action.appId}`;
    case 'details':
      return `nav/games/details/${action.appId}`;
  }
}
