import { describe, expect, it, vi } from 'vitest';

import { createWin32WallpaperPathResolver, resolveWallpaperCropRect } from './wallpaper-crop.js';

describe('resolveWallpaperCropRect', () => {
  it('maps a monitor into image space for a spanned desktop', () => {
    const crop = resolveWallpaperCropRect(
      { width: 3840, height: 1080 },
      { x: 0, y: 0, width: 3840, height: 1080 },
      { x: 1920, y: 0, width: 1920, height: 1080 },
    );

    expect(crop).toEqual({ x: 1920, y: 0, width: 1920, height: 1080 });
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
});
