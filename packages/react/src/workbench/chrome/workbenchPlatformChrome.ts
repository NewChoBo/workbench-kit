export type WorkbenchHostPlatform = 'darwin' | 'win32' | 'linux';

export type WorkbenchWindowChromeMode = 'platform' | 'generic';

export function resolveWorkbenchHostPlatform(
  platformOverride?: WorkbenchHostPlatform | null,
): WorkbenchHostPlatform {
  if (platformOverride) {
    return platformOverride;
  }

  if (typeof navigator === 'undefined') {
    return 'win32';
  }

  const platform = navigator.platform?.toLowerCase() ?? '';
  const userAgent = navigator.userAgent?.toLowerCase() ?? '';

  if (platform.includes('mac') || userAgent.includes('mac')) {
    return 'darwin';
  }

  if (platform.includes('linux') || userAgent.includes('linux')) {
    return 'linux';
  }

  return 'win32';
}

export function resolveWorkbenchWindowChromeDataAttributes(
  chrome: WorkbenchWindowChromeMode = 'platform',
): Record<string, string> | undefined {
  if (chrome !== 'platform') {
    return undefined;
  }

  return {
    'data-workbench-window-chrome': 'platform',
  };
}
