export {
  createEncryptedSecretVault,
  EncryptionUnavailableError,
  type CreateEncryptedSecretVaultOptions,
  type EncryptedSecretVault,
  type SafeStorageCipher,
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
  cacheAllowlistedHttpsAsset,
  registerRootConfinedAssetProtocol,
  type AssetCachePolicy,
  type AssetCacheStore,
  type CachedAssetMeta,
  type FetchAllowlistedHttps,
  type PathRootHelpers,
  type PrivilegedProtocolApi,
  type RegisterRootConfinedAssetProtocolOptions,
} from './assets/root-confined-asset-protocol.js';
export {
  createWin32WallpaperPathResolver,
  resolveWallpaperCropRect,
  type RectLike,
  type SizeLike,
  type WallpaperPathResolver,
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
