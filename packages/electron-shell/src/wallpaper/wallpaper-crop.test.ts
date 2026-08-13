import { describe, expect, it, vi } from 'vitest';

import {
  createWin32RegistryStringReader,
  createWin32WallpaperPathResolver,
  resolveWallpaperCropRect,
} from './wallpaper-crop.js';

describe('resolveWallpaperCropRect', () => {
  it('maps a monitor into image space for a spanned desktop', () => {
    const crop = resolveWallpaperCropRect(
      { width: 3840, height: 1080 },
      { x: 0, y: 0, width: 3840, height: 1080 },
      { x: 1920, y: 0, width: 1920, height: 1080 },
    );

    expect(crop).toEqual({ x: 1920, y: 0, width: 1920, height: 1080 });
  });

  it('preserves image aspect ratio when the virtual desktop ratio differs', () => {
    const crop = resolveWallpaperCropRect(
      { width: 4000, height: 2000 },
      { x: 0, y: 0, width: 3000, height: 2000 },
      { x: 0, y: 0, width: 1500, height: 2000 },
    );

    expect(crop).toEqual({ x: 500, y: 0, width: 1500, height: 2000 });
  });

  it('rejects non-finite geometry instead of returning an invalid crop', () => {
    expect(() =>
      resolveWallpaperCropRect(
        { width: Number.NaN, height: 1080 },
        { x: 0, y: 0, width: 1920, height: 1080 },
        { x: 0, y: 0, width: 1920, height: 1080 },
      ),
    ).toThrow(/finite and positive/u);
    expect(() =>
      resolveWallpaperCropRect(
        { width: 1920, height: 1080 },
        { x: Number.POSITIVE_INFINITY, y: 0, width: 1920, height: 1080 },
        { x: 0, y: 0, width: 1920, height: 1080 },
      ),
    ).toThrow(/Virtual desktop bounds/u);
  });

  it('clamps crops that extend outside the image', () => {
    const crop = resolveWallpaperCropRect(
      { width: 1000, height: 500 },
      { x: 0, y: 0, width: 2000, height: 1000 },
      { x: 1800, y: 800, width: 400, height: 400 },
    );

    expect(crop.x).toBeGreaterThanOrEqual(0);
    expect(crop.y).toBeGreaterThanOrEqual(0);
    expect(crop.x + crop.width).toBeLessThanOrEqual(1000);
    expect(crop.y + crop.height).toBeLessThanOrEqual(500);
  });

  it('rejects non-positive sizes', () => {
    expect(() =>
      resolveWallpaperCropRect(
        { width: 0, height: 100 },
        { x: 0, y: 0, width: 100, height: 100 },
        { x: 0, y: 0, width: 50, height: 50 },
      ),
    ).toThrow(/positive/i);
  });
});

describe('createWin32WallpaperPathResolver', () => {
  it('returns trimmed registry wallpaper path', async () => {
    const readRegistryString = vi.fn(async () => '  C:\\Walls\\desk.jpg  ');
    const resolver = createWin32WallpaperPathResolver({ readRegistryString });

    await expect(resolver.resolveWallpaperPath()).resolves.toBe('C:\\Walls\\desk.jpg');
    expect(readRegistryString).toHaveBeenCalledWith('HKCU\\Control Panel\\Desktop', 'WallPaper');
  });

  it('returns null when registry value is missing/blank', async () => {
    const resolver = createWin32WallpaperPathResolver({
      readRegistryString: async () => '   ',
    });
    await expect(resolver.resolveWallpaperPath()).resolves.toBeNull();
  });

  it('falls back when the registry path is stale', async () => {
    const pathExists = vi.fn(async (filePath: string) => filePath.endsWith('TranscodedWallpaper'));
    const resolver = createWin32WallpaperPathResolver({
      fallbackPath:
        'C:\\Users\\me\\AppData\\Roaming\\Microsoft\\Windows\\Themes\\TranscodedWallpaper',
      pathExists,
      readRegistryString: async () => 'C:\\missing.jpg',
    });

    await expect(resolver.resolveWallpaperPath()).resolves.toMatch(/TranscodedWallpaper$/u);
    expect(pathExists).toHaveBeenCalledTimes(2);
  });
});

describe('createWin32RegistryStringReader', () => {
  it('runs a bounded shell-free query and parses the requested value', async () => {
    const execFile = vi.fn((_file, _args, _options, callback) => {
      callback(null, '    Wallpaper    REG_SZ    C:\\Walls\\desk.jpg\r\n');
    });
    const readRegistryString = createWin32RegistryStringReader({ execFile });

    await expect(readRegistryString('HKCU\\Control Panel\\Desktop', 'Wallpaper')).resolves.toBe(
      'C:\\Walls\\desk.jpg',
    );
    expect(execFile).toHaveBeenCalledWith(
      'reg',
      ['query', 'HKCU\\Control Panel\\Desktop', '/v', 'Wallpaper'],
      {
        encoding: 'utf8',
        maxBuffer: 64 * 1024,
        shell: false,
        timeout: 2_000,
        windowsHide: true,
      },
      expect.any(Function),
    );
  });

  it('returns null when the query throws or fails', async () => {
    const thrown = createWin32RegistryStringReader({
      execFile: () => {
        throw new Error('unavailable');
      },
    });
    await expect(thrown('key', 'value')).resolves.toBeNull();

    const failed = createWin32RegistryStringReader({
      execFile: (_file, _args, _options, callback) => {
        callback(new Error('failed'), '');
      },
    });
    await expect(failed('key', 'value')).resolves.toBeNull();
  });
});
