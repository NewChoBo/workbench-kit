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

function isFinitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function hasFiniteOrigin(rect: Pick<RectLike, 'x' | 'y'>): boolean {
  return Number.isFinite(rect.x) && Number.isFinite(rect.y);
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
  if (!isFinitePositive(imageSize.width) || !isFinitePositive(imageSize.height)) {
    throw new Error('Wallpaper image size must be finite and positive.');
  }
  if (
    !hasFiniteOrigin(virtualDesktop) ||
    !isFinitePositive(virtualDesktop.width) ||
    !isFinitePositive(virtualDesktop.height)
  ) {
    throw new Error('Virtual desktop bounds must be finite with a positive size.');
  }
  if (
    !hasFiniteOrigin(monitor) ||
    !isFinitePositive(monitor.width) ||
    !isFinitePositive(monitor.height)
  ) {
    throw new Error('Monitor bounds must be finite with a positive size.');
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

export interface Win32RegistryExecFileOptions {
  readonly encoding: 'utf8';
  readonly maxBuffer: number;
  readonly shell: false;
  readonly timeout: number;
  readonly windowsHide: true;
}

export type Win32RegistryExecFile = (
  file: string,
  args: readonly string[],
  options: Win32RegistryExecFileOptions,
  callback: (error: Error | null, stdout: string) => void,
) => void;

export interface CreateWin32RegistryStringReaderOptions {
  readonly execFile: Win32RegistryExecFile;
  readonly maxBufferBytes?: number;
  readonly timeoutMs?: number;
}

const WIN32_REGISTRY_QUERY_DEFAULT_MAX_BUFFER_BYTES = 64 * 1024;
const WIN32_REGISTRY_QUERY_DEFAULT_TIMEOUT_MS = 2_000;

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

/** Create a bounded, shell-free `reg query` string reader. */
export function createWin32RegistryStringReader(
  options: CreateWin32RegistryStringReaderOptions,
): (keyPath: string, valueName: string) => Promise<string | null> {
  const maxBuffer = options.maxBufferBytes ?? WIN32_REGISTRY_QUERY_DEFAULT_MAX_BUFFER_BYTES;
  const timeout = options.timeoutMs ?? WIN32_REGISTRY_QUERY_DEFAULT_TIMEOUT_MS;
  if (!Number.isFinite(maxBuffer) || maxBuffer <= 0) {
    throw new Error('maxBufferBytes must be a finite positive number.');
  }
  if (!Number.isFinite(timeout) || timeout <= 0) {
    throw new Error('timeoutMs must be a finite positive number.');
  }

  return (keyPath, valueName) =>
    new Promise((resolve) => {
      try {
        options.execFile(
          'reg',
          ['query', keyPath, '/v', valueName],
          { encoding: 'utf8', maxBuffer, shell: false, timeout, windowsHide: true },
          (error, stdout) => {
            if (error) {
              resolve(null);
              return;
            }
            const pattern = new RegExp(
              `^\\s*${escapeRegularExpression(valueName)}\\s+REG_\\w+\\s+(.+)$`,
              'imu',
            );
            const value = pattern.exec(stdout)?.[1]?.trim();
            resolve(value && value.length > 0 ? value : null);
          },
        );
      } catch {
        resolve(null);
      }
    });
}

/**
 * Win32 wallpaper path resolver behind an injected registry reader.
 * Other platforms should inject a resolver that returns null until implemented.
 */
export function createWin32WallpaperPathResolver(options: {
  readonly readRegistryString: (keyPath: string, valueName: string) => Promise<string | null>;
  readonly fallbackPath?: string | null;
  readonly pathExists?: (filePath: string) => Promise<boolean>;
}): WallpaperPathResolver {
  return {
    async resolveWallpaperPath(): Promise<string | null> {
      const value = await options.readRegistryString('HKCU\\Control Panel\\Desktop', 'WallPaper');
      const registryPath = value?.trim() || null;
      if (
        registryPath !== null &&
        (!options.pathExists || (await options.pathExists(registryPath)))
      ) {
        return registryPath;
      }

      const fallbackPath = options.fallbackPath?.trim() || null;
      if (
        fallbackPath !== null &&
        (!options.pathExists || (await options.pathExists(fallbackPath)))
      ) {
        return fallbackPath;
      }
      return null;
    },
  };
}
