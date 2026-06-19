import { useId, type SVGProps } from 'react';
import { cx } from '../utils/cx';
import {
  TILEPAPER_ICON_CANVAS,
  TILEPAPER_ICON_GRADIENTS,
  TILEPAPER_ICON_GRID,
  TILEPAPER_ICON_ROOT_ELEVATION,
  TILEPAPER_ICON_ROOT_PANEL,
  TILEPAPER_ICON_TILES,
  tilepaperPaperFoldPaths,
} from './tilepaper-app-icon-geometry.js';

export interface TilepaperAppIconProps extends Omit<SVGProps<SVGSVGElement>, 'viewBox'> {}

export function TilepaperAppIcon({ className, ...props }: TilepaperAppIconProps) {
  const idPrefix = `tilepaper-icon-${useId().replace(/:/g, '')}`;
  const bgId = `${idPrefix}-bg`;
  const panelId = `${idPrefix}-panel`;
  const elevationId = `${idPrefix}-elevation`;
  const blueId = `${idPrefix}-blue`;
  const paperId = `${idPrefix}-paper`;
  const tealId = `${idPrefix}-teal`;
  const violetId = `${idPrefix}-violet`;
  const { tileRx, tileSize } = TILEPAPER_ICON_GRID;
  const fold = tilepaperPaperFoldPaths(
    TILEPAPER_ICON_TILES.paper.x,
    TILEPAPER_ICON_TILES.paper.y,
    tileSize,
  );

  return (
    <svg
      aria-hidden="true"
      className={cx('tilepaper-app-icon', className)}
      fill="none"
      viewBox={`0 0 ${TILEPAPER_ICON_CANVAS.size} ${TILEPAPER_ICON_CANVAS.size}`}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <filter
          id={elevationId}
          x="-12%"
          y="-8%"
          width="124%"
          height="128%"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow
            dx="0"
            dy={TILEPAPER_ICON_ROOT_ELEVATION.dy}
            floodColor={TILEPAPER_ICON_ROOT_ELEVATION.floodColor}
            floodOpacity={TILEPAPER_ICON_ROOT_ELEVATION.floodOpacity}
            stdDeviation={TILEPAPER_ICON_ROOT_ELEVATION.stdDeviation}
          />
        </filter>
        <linearGradient
          id={bgId}
          x1={TILEPAPER_ICON_GRADIENTS.bg.x1}
          x2={TILEPAPER_ICON_GRADIENTS.bg.x2}
          y1={TILEPAPER_ICON_GRADIENTS.bg.y1}
          y2={TILEPAPER_ICON_GRADIENTS.bg.y2}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#0A1020" />
          <stop offset="1" stopColor="#121C33" />
        </linearGradient>
        <linearGradient
          id={panelId}
          x1={TILEPAPER_ICON_GRADIENTS.panel.x1}
          x2={TILEPAPER_ICON_GRADIENTS.panel.x2}
          y1={TILEPAPER_ICON_GRADIENTS.panel.y1}
          y2={TILEPAPER_ICON_GRADIENTS.panel.y2}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#1A2C4D" />
          <stop offset="0.42" stopColor="#162844" />
          <stop offset="1" stopColor="#111D35" />
        </linearGradient>
        <linearGradient
          id={blueId}
          x1={TILEPAPER_ICON_GRADIENTS.blue.x1}
          x2={TILEPAPER_ICON_GRADIENTS.blue.x2}
          y1={TILEPAPER_ICON_GRADIENTS.blue.y1}
          y2={TILEPAPER_ICON_GRADIENTS.blue.y2}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#5D88FF" />
          <stop offset="1" stopColor="#3158D6" />
        </linearGradient>
        <linearGradient
          id={paperId}
          x1={TILEPAPER_ICON_GRADIENTS.paper.x1}
          x2={TILEPAPER_ICON_GRADIENTS.paper.x2}
          y1={TILEPAPER_ICON_GRADIENTS.paper.y1}
          y2={TILEPAPER_ICON_GRADIENTS.paper.y2}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#FFF9EE" />
          <stop offset="1" stopColor="#DDD9D1" />
        </linearGradient>
        <linearGradient
          id={tealId}
          x1={TILEPAPER_ICON_GRADIENTS.teal.x1}
          x2={TILEPAPER_ICON_GRADIENTS.teal.x2}
          y1={TILEPAPER_ICON_GRADIENTS.teal.y1}
          y2={TILEPAPER_ICON_GRADIENTS.teal.y2}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#2FD6C1" />
          <stop offset="1" stopColor="#149685" />
        </linearGradient>
        <linearGradient
          id={violetId}
          x1={TILEPAPER_ICON_GRADIENTS.violet.x1}
          x2={TILEPAPER_ICON_GRADIENTS.violet.x2}
          y1={TILEPAPER_ICON_GRADIENTS.violet.y1}
          y2={TILEPAPER_ICON_GRADIENTS.violet.y2}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#8A67FF" />
          <stop offset="1" stopColor="#5D3AC8" />
        </linearGradient>
      </defs>
      <rect
        width={TILEPAPER_ICON_CANVAS.size}
        height={TILEPAPER_ICON_CANVAS.size}
        rx={TILEPAPER_ICON_CANVAS.rx}
        fill={`url(#${bgId})`}
      />
      <rect
        filter={`url(#${elevationId})`}
        fill={`url(#${panelId})`}
        height={TILEPAPER_ICON_ROOT_PANEL.size}
        rx={TILEPAPER_ICON_ROOT_PANEL.rx}
        width={TILEPAPER_ICON_ROOT_PANEL.size}
        x={TILEPAPER_ICON_ROOT_PANEL.x}
        y={TILEPAPER_ICON_ROOT_PANEL.y}
      />
      <rect
        x={TILEPAPER_ICON_TILES.blue.x}
        y={TILEPAPER_ICON_TILES.blue.y}
        width={tileSize}
        height={tileSize}
        rx={tileRx}
        fill={`url(#${blueId})`}
      />
      <rect
        x={TILEPAPER_ICON_TILES.teal.x}
        y={TILEPAPER_ICON_TILES.teal.y}
        width={tileSize}
        height={tileSize}
        rx={tileRx}
        fill={`url(#${tealId})`}
      />
      <rect
        x={TILEPAPER_ICON_TILES.violet.x}
        y={TILEPAPER_ICON_TILES.violet.y}
        width={tileSize}
        height={tileSize}
        rx={tileRx}
        fill={`url(#${violetId})`}
      />
      <rect
        x={TILEPAPER_ICON_TILES.paper.x}
        y={TILEPAPER_ICON_TILES.paper.y}
        width={tileSize}
        height={tileSize}
        rx={tileRx}
        fill={`url(#${paperId})`}
      />
      <path d={fold.highlight} fill="white" fillOpacity="0.92" />
      <path d={fold.shadow} fill="#C9C3B7" fillOpacity="0.74" />
    </svg>
  );
}
