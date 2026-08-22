export {
  createApplicationQuitGuard,
  type ApplicationQuitDecision,
  type ApplicationQuitEvent,
  type ApplicationQuitGuard,
  type ApplicationQuitGuardResult,
  type ApplicationQuitProceedReason,
  type CreateApplicationQuitGuardOptions,
} from './lifecycle/application-quit-guard.js';
export {
  createEncryptedSecretVault,
  EncryptionUnavailableError,
  type CreateEncryptedSecretVaultOptions,
  type EncryptedSecretVault,
  type SafeStorageCipher,
  type SecretVaultCommitMetadata,
  type SecretVaultDocumentCodec,
} from './secrets/encrypted-secret-vault.js';
export {
  InvalidExternalLinkUrlError,
  openAllowlistedExternalLink,
  UnknownExternalLinkIdError,
  type ExternalLinkAllowlist,
  type OpenAllowlistedExternalLinkInput,
} from './security/open-allowlisted-external-link.js';
export {
  requireOwnedWindowForSender,
  UntrustedIpcSenderError,
  type IpcSenderLike,
} from './security/require-owned-window-for-sender.js';
export {
  registerPrivilegedAssetProtocolScheme,
  type PrivilegedAssetProtocolRegistrar,
  type PrivilegedAssetProtocolScheme,
  type RegisterPrivilegedAssetProtocolSchemeOptions,
} from './assets/privileged-asset-protocol.js';
export {
  createWin32RegistryStringReader,
  createWin32WallpaperPathResolver,
  resolveWallpaperCropRect,
  type CreateWin32RegistryStringReaderOptions,
  type RectLike,
  type SizeLike,
  type WallpaperPathResolver,
  type Win32RegistryExecFile,
  type Win32RegistryExecFileOptions,
} from './wallpaper/wallpaper-crop.js';
export {
  createWindowControlsBridge,
  nextMaximizedState,
  registerWindowControlIpc,
  type CreateWindowControlsBridgeOptions,
  type RegisterWindowControlIpcOptions,
  type WindowControlIpcChannels,
  type WindowControlIpcMain,
  type WindowControlSurface,
  type WindowControlWebContents,
  type WindowControlsBridge,
} from './window/window-controls.js';
