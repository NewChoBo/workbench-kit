/**
 * Pure tray-aware close / quit policy helpers.
 * Hosts apply `hide` vs destroy / `app.quit` — this module has no Electron imports.
 */

export interface ShouldHideOnCloseInput {
  readonly trayEnabled: boolean;
}

/**
 * When tray mode is enabled, the host should hide the window on close instead of destroying it.
 */
export function shouldHideOnClose(input: ShouldHideOnCloseInput): boolean {
  return input.trayEnabled;
}

export type TrayClosePlatformId = 'darwin' | 'win32' | 'linux' | (string & {});

export interface ShouldQuitWhenAllWindowsClosedInput {
  readonly platform: TrayClosePlatformId;
  readonly trayEnabled: boolean;
}

/**
 * Whether the host should quit when the last window closes.
 *
 * - Tray enabled → never auto-quit (stay resident in the notification area).
 * - darwin → keep the app alive without windows (platform convention).
 * - win32 / linux → quit when all windows are closed (when tray is off).
 */
export function shouldQuitWhenAllWindowsClosed(
  input: ShouldQuitWhenAllWindowsClosedInput,
): boolean {
  if (input.trayEnabled) {
    return false;
  }
  if (input.platform === 'darwin') {
    return false;
  }
  return true;
}
