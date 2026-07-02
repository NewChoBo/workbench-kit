export type ProviderLaunchActionKind =
  | 'url'
  | 'exec'
  | 'script'
  | 'folder'
  | 'command'
  | 'steam'
  | 'epic';

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

export type ProviderEpicActionMode = 'launch' | 'open' | 'install';

export interface ProviderEpicAction {
  readonly type: 'epic';
  readonly appName?: string;
  readonly artifactId?: string;
  readonly catalogItemId?: string;
  readonly catalogNamespace?: string;
  readonly installLocation?: string;
  readonly mode?: ProviderEpicActionMode;
  readonly silent?: boolean;
}

export type ProviderLibraryAction =
  | ProviderUrlAction
  | ProviderExecAction
  | ProviderScriptAction
  | ProviderFolderAction
  | ProviderCommandAction
  | ProviderSteamAction
  | ProviderEpicAction;

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
    case 'epic':
      return 'Epic Games';
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
    case 'epic':
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
    case 'epic': {
      const target = epicLaunchActionToUrl(action);
      return target === null ? null : { type: 'url', target };
    }
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

export function createEpicStoreUrl(input: { appName?: string | null }): string | null {
  const appName = normalizeEpicToken(input.appName ?? null);
  if (appName === null) {
    return null;
  }

  return `https://store.epicgames.com/en-US/p/${encodeURIComponent(appName.toLowerCase())}`;
}

function epicLaunchActionToUrl(action: ProviderEpicAction): string | null {
  const appsPath = buildEpicLauncherAppsPath(action);
  if (appsPath === null) {
    return null;
  }

  const mode = action.mode ?? 'launch';
  const query = new URLSearchParams({ action: mode });
  if (mode === 'launch' && action.silent !== false) {
    query.set('silent', 'true');
  }

  return `com.epicgames.launcher://apps/${appsPath}?${query.toString()}`;
}

function buildEpicLauncherAppsPath(action: ProviderEpicAction): string | null {
  const namespace = normalizeEpicToken(action.catalogNamespace);
  const catalogItemId = normalizeEpicToken(action.catalogItemId);
  const artifactId = normalizeEpicToken(action.artifactId);
  const appName = normalizeEpicToken(action.appName);

  if (namespace !== null && catalogItemId !== null) {
    const thirdSegment = artifactId ?? appName;
    if (thirdSegment !== null) {
      return `${encodeEpicUriSegment(namespace)}%3A${encodeEpicUriSegment(catalogItemId)}%3A${encodeEpicUriSegment(thirdSegment)}`;
    }
  }

  if (appName !== null) {
    return encodeEpicUriSegment(appName);
  }

  const installLocation = normalizeEpicToken(action.installLocation);
  if (installLocation !== null) {
    return encodeEpicInstallLocationPath(installLocation);
  }

  return null;
}

function normalizeEpicToken(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function encodeEpicUriSegment(value: string): string {
  return encodeURIComponent(value);
}

function encodeEpicInstallLocationPath(installLocation: string): string {
  const normalized = installLocation.replace(/\\/g, '/');
  const driveMatch = /^([a-zA-Z]):(\/.*)?$/.exec(normalized);
  if (driveMatch === null) {
    return normalized
      .split('/')
      .filter((segment) => segment.length > 0)
      .map((segment) => encodeURIComponent(segment))
      .join('%2F');
  }

  const [, drive, remainder = ''] = driveMatch;
  const encodedRemainder = remainder
    .split('/')
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join('%2F');

  return encodedRemainder.length > 0 ? `${drive}%3A%2F${encodedRemainder}` : `${drive}%3A`;
}
