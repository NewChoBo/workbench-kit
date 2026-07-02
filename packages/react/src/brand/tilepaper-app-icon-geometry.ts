/** Shared workbench app icon layout (1024 canvas, Material-style root surface). */
export const TILEPAPER_ICON_CANVAS_SIZE = 1024;

const REFERENCE_TILE_SIZE = 314;
/** Unified squircle radius — bumped for a softer, rounder Material feel. */
const REFERENCE_TILE_RX = 116;

/** Base rhythm for canvas → root panel inset. */
export const TILEPAPER_ICON_SPACING = 48;

/** Pulls the motif slightly toward the canvas center (px): wider outer rim, tighter tile grid. */
export const TILEPAPER_ICON_CENTER_CLUSTER = 8;

/** Ambient backdrop around the elevated root surface. */
export const TILEPAPER_ICON_CANVAS_MARGIN =
  TILEPAPER_ICON_SPACING + TILEPAPER_ICON_CENTER_CLUSTER / 2;

/** Inset of the 4 tiles inside the root surface. */
export const TILEPAPER_ICON_GRID_MARGIN = TILEPAPER_ICON_SPACING - TILEPAPER_ICON_CENTER_CLUSTER;
export const TILEPAPER_ICON_GRID_GAP = TILEPAPER_ICON_SPACING - TILEPAPER_ICON_CENTER_CLUSTER;

/** Material-style elevation for the root surface panel. */
export const TILEPAPER_ICON_ROOT_ELEVATION = {
  dy: 8,
  floodColor: '#020617',
  floodOpacity: 0.42,
  stdDeviation: 12,
} as const;

const TILE_GRADIENT_OFFSETS = {
  x1: 20,
  x2: 250,
  y1: 22,
  y2: 262,
} as const;

const panelSize = TILEPAPER_ICON_CANVAS_SIZE - TILEPAPER_ICON_CANVAS_MARGIN * 2;
const panelX = TILEPAPER_ICON_CANVAS_MARGIN;
const panelY = TILEPAPER_ICON_CANVAS_MARGIN;
const tileSize = (panelSize - TILEPAPER_ICON_GRID_MARGIN * 2 - TILEPAPER_ICON_GRID_GAP) / 2;

/** Same absolute corner radius on every rounded rect (matches the 4 tiles). */
export const TILEPAPER_ICON_UNIFIED_RX = REFERENCE_TILE_RX;

const panelRx = TILEPAPER_ICON_UNIFIED_RX;
const tileRx = TILEPAPER_ICON_UNIFIED_RX;
const tileOrigin = panelX + TILEPAPER_ICON_GRID_MARGIN;

const gradientOffsetScale = tileSize / REFERENCE_TILE_SIZE;
const gradientOffsets = {
  x1: Math.round(TILE_GRADIENT_OFFSETS.x1 * gradientOffsetScale),
  x2: Math.round(TILE_GRADIENT_OFFSETS.x2 * gradientOffsetScale),
  y1: Math.round(TILE_GRADIENT_OFFSETS.y1 * gradientOffsetScale),
  y2: Math.round(TILE_GRADIENT_OFFSETS.y2 * gradientOffsetScale),
};

export const TILEPAPER_ICON_CANVAS = {
  size: TILEPAPER_ICON_CANVAS_SIZE,
  rx: TILEPAPER_ICON_UNIFIED_RX,
} as const;

/** Material root surface — the primary app panel sitting above the backdrop. */
export const TILEPAPER_ICON_ROOT_PANEL = {
  x: panelX,
  y: panelY,
  size: panelSize,
  rx: panelRx,
} as const;

export const TILEPAPER_ICON_GRID = {
  margin: TILEPAPER_ICON_GRID_MARGIN,
  gap: TILEPAPER_ICON_GRID_GAP,
  tileSize,
  tileRx,
} as const;

export const TILEPAPER_ICON_TILES = {
  blue: { x: tileOrigin, y: tileOrigin },
  paper: { x: tileOrigin + tileSize + TILEPAPER_ICON_GRID_GAP, y: tileOrigin },
  teal: { x: tileOrigin, y: tileOrigin + tileSize + TILEPAPER_ICON_GRID_GAP },
  violet: {
    x: tileOrigin + tileSize + TILEPAPER_ICON_GRID_GAP,
    y: tileOrigin + tileSize + TILEPAPER_ICON_GRID_GAP,
  },
} as const;

export function tilepaperRootElevationFilterMarkup(filterId = 'root-elevation'): string {
  const { dy, floodColor, floodOpacity, stdDeviation } = TILEPAPER_ICON_ROOT_ELEVATION;

  return `<filter id="${filterId}" x="-12%" y="-8%" width="124%" height="128%" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="${dy}" stdDeviation="${stdDeviation}" flood-color="${floodColor}" flood-opacity="${floodOpacity}" />
    </filter>`;
}

/** Scale fold geometry from the original 286px tile art. */
export function tilepaperPaperFoldPaths(paperX: number, paperY: number, tileSizePx: number) {
  const scale = tileSizePx / 286;
  const inset = Math.round(84 * scale);
  const foldStart = Math.round(88 * scale);
  const shadowStart = Math.round(103 * scale);
  const curveOffset = Math.round(37.608 * scale);

  const right = paperX + tileSizePx;
  const foldX = right - foldStart;
  const shadowX = right - shadowStart;

  return {
    highlight: `M${foldX} ${paperY}H${foldX + 4}C${right - curveOffset} ${paperY} ${right} ${paperY + curveOffset} ${right} ${paperY + inset}V${paperY + inset + 4}L${foldX} ${paperY}Z`,
    shadow: `M${shadowX} ${paperY}H${foldX}L${right} ${paperY + inset}V${paperY + shadowStart}L${shadowX} ${paperY}Z`,
  };
}

const panelGradientInset = 18;

export const TILEPAPER_ICON_GRADIENTS = {
  /** Dark ambient behind the elevated root surface. */
  bg: { x1: 512, x2: 512, y1: 72, y2: 952 },
  /** Material surface — slightly brighter toward the top edge. */
  panel: {
    x1: 512,
    x2: 512,
    y1: panelY + panelGradientInset,
    y2: panelY + panelSize - panelGradientInset,
  },
  blue: {
    x1: TILEPAPER_ICON_TILES.blue.x + gradientOffsets.x1,
    x2: TILEPAPER_ICON_TILES.blue.x + gradientOffsets.x2,
    y1: TILEPAPER_ICON_TILES.blue.y + gradientOffsets.y1,
    y2: TILEPAPER_ICON_TILES.blue.y + gradientOffsets.y2,
  },
  paper: {
    x1: 512 + (512 - (TILEPAPER_ICON_TILES.blue.x + gradientOffsets.x2)),
    x2: 512 + (512 - (TILEPAPER_ICON_TILES.blue.x + gradientOffsets.x1)),
    y1: TILEPAPER_ICON_TILES.blue.y + gradientOffsets.y1,
    y2: TILEPAPER_ICON_TILES.blue.y + gradientOffsets.y2,
  },
  teal: {
    x1: TILEPAPER_ICON_TILES.blue.x + gradientOffsets.x1,
    x2: TILEPAPER_ICON_TILES.blue.x + gradientOffsets.x2,
    y1: 512 + (512 - (TILEPAPER_ICON_TILES.blue.y + gradientOffsets.y2)),
    y2: 512 + (512 - (TILEPAPER_ICON_TILES.blue.y + gradientOffsets.y1)),
  },
  violet: {
    x1: 512 + (512 - (TILEPAPER_ICON_TILES.blue.x + gradientOffsets.x2)),
    x2: 512 + (512 - (TILEPAPER_ICON_TILES.blue.x + gradientOffsets.x1)),
    y1: 512 + (512 - (TILEPAPER_ICON_TILES.blue.y + gradientOffsets.y2)),
    y2: 512 + (512 - (TILEPAPER_ICON_TILES.blue.y + gradientOffsets.y1)),
  },
} as const;

/** Static favicon snapshot (keep in sync with geometry helpers above). */
export function renderTilepaperAppIconSvgMarkup(): string {
  const fold = tilepaperPaperFoldPaths(
    TILEPAPER_ICON_TILES.paper.x,
    TILEPAPER_ICON_TILES.paper.y,
    TILEPAPER_ICON_GRID.tileSize,
  );
  const { bg, panel, blue, paper, teal, violet } = TILEPAPER_ICON_GRADIENTS;
  const { tileSize: t, tileRx: tr } = TILEPAPER_ICON_GRID;
  const root = TILEPAPER_ICON_ROOT_PANEL;

  return `<svg fill="none" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${tilepaperRootElevationFilterMarkup('root-elevation')}
    <linearGradient id="bg" x1="${bg.x1}" x2="${bg.x2}" y1="${bg.y1}" y2="${bg.y2}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0A1020" />
      <stop offset="1" stop-color="#121C33" />
    </linearGradient>
    <linearGradient id="panel" x1="${panel.x1}" x2="${panel.x2}" y1="${panel.y1}" y2="${panel.y2}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#1A2C4D" />
      <stop offset="0.42" stop-color="#162844" />
      <stop offset="1" stop-color="#111D35" />
    </linearGradient>
    <linearGradient id="blue" x1="${blue.x1}" x2="${blue.x2}" y1="${blue.y1}" y2="${blue.y2}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#5D88FF" />
      <stop offset="1" stop-color="#3158D6" />
    </linearGradient>
    <linearGradient id="paper" x1="${paper.x1}" x2="${paper.x2}" y1="${paper.y1}" y2="${paper.y2}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#FFF9EE" />
      <stop offset="1" stop-color="#DDD9D1" />
    </linearGradient>
    <linearGradient id="teal" x1="${teal.x1}" x2="${teal.x2}" y1="${teal.y1}" y2="${teal.y2}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#2FD6C1" />
      <stop offset="1" stop-color="#149685" />
    </linearGradient>
    <linearGradient id="violet" x1="${violet.x1}" x2="${violet.x2}" y1="${violet.y1}" y2="${violet.y2}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#8A67FF" />
      <stop offset="1" stop-color="#5D3AC8" />
    </linearGradient>
  </defs>
  <rect width="${TILEPAPER_ICON_CANVAS.size}" height="${TILEPAPER_ICON_CANVAS.size}" rx="${TILEPAPER_ICON_CANVAS.rx}" fill="url(#bg)" />
  <rect x="${root.x}" y="${root.y}" width="${root.size}" height="${root.size}" rx="${root.rx}" fill="url(#panel)" filter="url(#root-elevation)" />
  <rect x="${TILEPAPER_ICON_TILES.blue.x}" y="${TILEPAPER_ICON_TILES.blue.y}" width="${t}" height="${t}" rx="${tr}" fill="url(#blue)" />
  <rect x="${TILEPAPER_ICON_TILES.teal.x}" y="${TILEPAPER_ICON_TILES.teal.y}" width="${t}" height="${t}" rx="${tr}" fill="url(#teal)" />
  <rect x="${TILEPAPER_ICON_TILES.violet.x}" y="${TILEPAPER_ICON_TILES.violet.y}" width="${t}" height="${t}" rx="${tr}" fill="url(#violet)" />
  <rect x="${TILEPAPER_ICON_TILES.paper.x}" y="${TILEPAPER_ICON_TILES.paper.y}" width="${t}" height="${t}" rx="${tr}" fill="url(#paper)" />
  <path d="${fold.highlight}" fill="white" fill-opacity="0.92" />
  <path d="${fold.shadow}" fill="#C9C3B7" fill-opacity="0.74" />
</svg>
`;
}
