export interface SizeLike {
  readonly width: number;
  readonly height: number;
}

export interface RectLike {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Compute the source crop rectangle on a wallpaper image for a monitor when the
 * desktop wallpaper is spanned across the virtual desktop.
 *
 * Maps monitor bounds from virtual-desktop coordinates into image pixel space
 * using the image's cover of the full virtual desktop (uniform scale, centered).
 */
export function resolveWallpaperCropRect(
  imageSize: SizeLike,
  virtualDesktop: RectLike,
  monitor: RectLike,
): RectLike {
  if (imageSize.width <= 0 || imageSize.height <= 0) {
    throw new Error('Wallpaper image size must be positive.');
  }
  if (virtualDesktop.width <= 0 || virtualDesktop.height <= 0) {
    throw new Error('Virtual desktop size must be positive.');
  }
  if (monitor.width <= 0 || monitor.height <= 0) {
    throw new Error('Monitor size must be positive.');
  }

  const scale = Math.max(
    virtualDesktop.width / imageSize.width,
    virtualDesktop.height / imageSize.height,
  );
  const drawnWidth = imageSize.width * scale;
  const drawnHeight = imageSize.height * scale;
  const offsetX = virtualDesktop.x - (drawnWidth - virtualDesktop.width) / 2;
  const offsetY = virtualDesktop.y - (drawnHeight - virtualDesktop.height) / 2;

  const cropX = (monitor.x - offsetX) / scale;
  const cropY = (monitor.y - offsetY) / scale;
  const cropWidth = monitor.width / scale;
  const cropHeight = monitor.height / scale;

  const x = Math.max(0, Math.min(imageSize.width, cropX));
  const y = Math.max(0, Math.min(imageSize.height, cropY));
  const maxWidth = imageSize.width - x;
  const maxHeight = imageSize.height - y;

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.max(0, Math.round(Math.min(cropWidth, maxWidth))),
    height: Math.max(0, Math.round(Math.min(cropHeight, maxHeight))),
  };
}

export interface WallpaperPathResolver {
  resolveWallpaperPath(): Promise<string | null>;
}

/**
 * Win32 wallpaper path resolver behind an injected registry reader.
 * Other platforms should inject a resolver that returns null until implemented.
 */
export function createWin32WallpaperPathResolver(options: {
  readonly readRegistryString: (keyPath: string, valueName: string) => Promise<string | null>;
}): WallpaperPathResolver {
  return {
    async resolveWallpaperPath(): Promise<string | null> {
      const value = await options.readRegistryString('HKCU\\Control Panel\\Desktop', 'WallPaper');
      if (value === null) {
        return null;
      }
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    },
  };
}
