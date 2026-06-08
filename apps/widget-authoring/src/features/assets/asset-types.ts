export type AuthoringAssetType = 'image' | 'icon' | 'color' | 'component-template';

export interface AuthoringAsset {
  id: string;
  name: string;
  type: AuthoringAssetType;
  mimeType: string;
  createdAt: number;
}

export interface AuthoringAssetRecord extends AuthoringAsset {
  /** Image/icon data URL, or `color:#rrggbb` for color assets. */
  dataUrl: string;
}

export const COLOR_ASSET_PREFIX = 'color:';

export type AssetCreateInput =
  | { type: 'image'; name: string; file: File }
  | { type: 'icon'; name: string; svg: string }
  | { type: 'color'; name: string; color: string };

export type AssetUpdateInput =
  | { name?: string; file?: File }
  | { name?: string; svg?: string }
  | { name?: string; color?: string };
