import type { UiPropertyDescriptor } from './types';

export const UI_LAYOUT_VALUE_TYPES = Object.freeze([
  'layout.dimension',
  'layout.spacing',
  'layout.border',
  'layout.radius',
  'layout.shadow',
  'layout.flex-container',
  'layout.flex-child',
  'layout.grid-tracks',
  'layout.grid-placement',
  'layout.split',
  'layout.overlay-placement',
  'layout.canvas-placement',
] as const);
export type UiBuiltinLayoutValueType = (typeof UI_LAYOUT_VALUE_TYPES)[number];

export const UI_LENGTH_UNITS = Object.freeze(['px', 'rem', 'em', 'vw', 'vh'] as const);
export type UiLengthUnit = (typeof UI_LENGTH_UNITS)[number];

export const UI_INTRINSIC_SIZE_KEYWORDS = Object.freeze([
  'auto',
  'min-content',
  'max-content',
] as const);
export type UiIntrinsicSizeKeyword = (typeof UI_INTRINSIC_SIZE_KEYWORDS)[number];

export interface UiLengthValue {
  readonly kind: 'length';
  readonly value: number;
  readonly unit: UiLengthUnit;
}

export interface UiPercentageValue {
  readonly kind: 'percentage';
  readonly value: number;
}

export interface UiFlexFractionValue {
  readonly kind: 'flex-fraction';
  readonly value: number;
}

export interface UiIntrinsicSizeValue {
  readonly kind: 'intrinsic-size';
  readonly value: UiIntrinsicSizeKeyword;
}

export type UiLengthOrPercentageValue = UiLengthValue | UiPercentageValue;

export type UiDimensionValue =
  UiLengthOrPercentageValue | UiFlexFractionValue | UiIntrinsicSizeValue;

export interface UiSpacingValue {
  readonly kind: 'spacing';
  readonly top: UiLengthOrPercentageValue;
  readonly right: UiLengthOrPercentageValue;
  readonly bottom: UiLengthOrPercentageValue;
  readonly left: UiLengthOrPercentageValue;
}

export const UI_BORDER_STYLES = Object.freeze([
  'none',
  'solid',
  'dashed',
  'dotted',
  'double',
] as const);
export type UiBorderStyle = (typeof UI_BORDER_STYLES)[number];

export interface UiBorderValue {
  readonly kind: 'border';
  readonly width: UiLengthValue;
  readonly style: UiBorderStyle;
  readonly color: string;
}

export interface UiRadiusValue {
  readonly kind: 'radius';
  readonly topLeft: UiLengthOrPercentageValue;
  readonly topRight: UiLengthOrPercentageValue;
  readonly bottomRight: UiLengthOrPercentageValue;
  readonly bottomLeft: UiLengthOrPercentageValue;
}

export interface UiShadowValue {
  readonly kind: 'shadow';
  readonly offsetX: UiLengthValue;
  readonly offsetY: UiLengthValue;
  readonly blur: UiLengthValue;
  readonly spread: UiLengthValue;
  readonly color: string;
  readonly inset?: boolean;
}

export const UI_LAYOUT_STRATEGY_KINDS = Object.freeze([
  'flow',
  'stack',
  'flex',
  'grid',
  'split',
  'overlay',
  'canvas',
] as const);
export type UiBuiltinLayoutStrategyKind = (typeof UI_LAYOUT_STRATEGY_KINDS)[number];
export type UiLayoutStrategyKind = UiBuiltinLayoutStrategyKind | (string & Record<never, never>);

export const UI_LAYOUT_PROPERTY_SCOPES = Object.freeze(['container', 'child'] as const);
export type UiLayoutPropertyScope = (typeof UI_LAYOUT_PROPERTY_SCOPES)[number];

export const UI_LAYOUT_PROPERTY_GROUPS = Object.freeze([
  'sizing',
  'spacing',
  'alignment',
  'flex',
  'grid',
  'split',
  'canvas',
  'typography',
  'appearance',
  'effects',
  'advanced',
] as const);
export type UiBuiltinLayoutPropertyGroup = (typeof UI_LAYOUT_PROPERTY_GROUPS)[number];
export type UiLayoutPropertyGroup = UiBuiltinLayoutPropertyGroup | (string & Record<never, never>);

export interface UiLayoutPropertyDescriptor<
  TLiteral = unknown,
> extends UiPropertyDescriptor<TLiteral> {
  readonly scope: UiLayoutPropertyScope;
  readonly group: UiLayoutPropertyGroup;
  readonly strategyKinds: readonly UiLayoutStrategyKind[];
}

export interface UiLayoutStrategyDescriptor {
  readonly id: string;
  readonly kind: UiLayoutStrategyKind;
  readonly label?: string;
  readonly supportedContainerProperties: readonly string[];
  readonly supportedChildProperties: readonly string[];
}

export const UI_LAYOUT_DIRECTIONS = Object.freeze(['row', 'column'] as const);
export type UiLayoutDirection = (typeof UI_LAYOUT_DIRECTIONS)[number];

export const UI_FLEX_WRAPS = Object.freeze(['nowrap', 'wrap', 'wrap-reverse'] as const);
export type UiFlexWrap = (typeof UI_FLEX_WRAPS)[number];

export const UI_MAIN_AXIS_ALIGNMENTS = Object.freeze([
  'start',
  'center',
  'end',
  'space-between',
  'space-around',
  'space-evenly',
] as const);
export type UiMainAxisAlignment = (typeof UI_MAIN_AXIS_ALIGNMENTS)[number];

export const UI_CROSS_AXIS_ALIGNMENTS = Object.freeze([
  'stretch',
  'start',
  'center',
  'end',
] as const);
export type UiCrossAxisAlignment = (typeof UI_CROSS_AXIS_ALIGNMENTS)[number];
export type UiSelfAlignment = 'auto' | UiCrossAxisAlignment;

export interface UiFlexContainerValue {
  readonly kind: 'flex-container';
  readonly direction: UiLayoutDirection;
  readonly wrap: UiFlexWrap;
  readonly mainAxisAlignment: UiMainAxisAlignment;
  readonly crossAxisAlignment: UiCrossAxisAlignment;
}

export interface UiFlexChildValue {
  readonly kind: 'flex-child';
  readonly grow: number;
  readonly shrink: number;
  readonly basis: UiLengthValue | UiPercentageValue | UiIntrinsicSizeValue;
  readonly order: number;
  readonly alignSelf: UiSelfAlignment;
}

export type UiGridTrackBreadthValue =
  UiLengthValue | UiPercentageValue | UiFlexFractionValue | UiIntrinsicSizeValue;

export interface UiGridMinMaxValue {
  readonly kind: 'grid-minmax';
  readonly min: Exclude<UiGridTrackBreadthValue, UiFlexFractionValue>;
  readonly max: UiGridTrackBreadthValue;
}

export type UiGridTrackValue = UiGridTrackBreadthValue | UiGridMinMaxValue;

export interface UiGridRepeatValue {
  readonly kind: 'grid-repeat';
  readonly count: number | 'auto-fill' | 'auto-fit';
  readonly tracks: readonly UiGridTrackValue[];
}

export interface UiGridTrackListValue {
  readonly kind: 'grid-track-list';
  readonly tracks: readonly (UiGridTrackValue | UiGridRepeatValue)[];
}

export type UiGridPlacementValue =
  | {
      readonly kind: 'grid-placement';
      readonly mode: 'lines';
      readonly columnStart: number;
      readonly rowStart: number;
      readonly columnSpan: number;
      readonly rowSpan: number;
    }
  | {
      readonly kind: 'grid-placement';
      readonly mode: 'area';
      readonly area: string;
    };

export interface UiSplitValue {
  readonly kind: 'split';
  readonly orientation: 'horizontal' | 'vertical';
  readonly fixedTrack: 'primary' | 'secondary';
  readonly size: UiLengthValue | UiPercentageValue;
  readonly minSize?: UiLengthValue | UiPercentageValue;
  readonly maxSize?: UiLengthValue | UiPercentageValue;
  readonly collapsible: boolean;
  readonly collapsed: boolean;
  readonly resizable: boolean;
}

export const UI_LAYOUT_ANCHORS = Object.freeze([
  'top-start',
  'top-center',
  'top-end',
  'center-start',
  'center',
  'center-end',
  'bottom-start',
  'bottom-center',
  'bottom-end',
] as const);
export type UiLayoutAnchor = (typeof UI_LAYOUT_ANCHORS)[number];

export interface UiOverlayPlacementValue {
  readonly kind: 'overlay-placement';
  readonly anchor: UiLayoutAnchor;
  readonly top?: UiLengthOrPercentageValue;
  readonly right?: UiLengthOrPercentageValue;
  readonly bottom?: UiLengthOrPercentageValue;
  readonly left?: UiLengthOrPercentageValue;
  readonly zIndex: number;
}

export interface UiCanvasSizeConstraintsValue {
  readonly minWidth?: UiLengthOrPercentageValue;
  readonly maxWidth?: UiLengthOrPercentageValue;
  readonly minHeight?: UiLengthOrPercentageValue;
  readonly maxHeight?: UiLengthOrPercentageValue;
  readonly aspectRatio?: number;
}

export interface UiCanvasPlacementValue {
  readonly kind: 'canvas-placement';
  readonly x: UiLengthOrPercentageValue;
  readonly y: UiLengthOrPercentageValue;
  readonly width: UiLengthValue | UiPercentageValue | UiIntrinsicSizeValue;
  readonly height: UiLengthValue | UiPercentageValue | UiIntrinsicSizeValue;
  readonly anchor: UiLayoutAnchor;
  readonly zIndex: number;
  readonly constraints?: UiCanvasSizeConstraintsValue;
}

export function isUiLengthUnit(value: unknown): value is UiLengthUnit {
  return typeof value === 'string' && UI_LENGTH_UNITS.includes(value as UiLengthUnit);
}

export function isUiLayoutStrategyKind(value: unknown): value is UiLayoutStrategyKind {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isUiLayoutPropertyScope(value: unknown): value is UiLayoutPropertyScope {
  return (
    typeof value === 'string' && UI_LAYOUT_PROPERTY_SCOPES.includes(value as UiLayoutPropertyScope)
  );
}

export function isUiLayoutAnchor(value: unknown): value is UiLayoutAnchor {
  return typeof value === 'string' && UI_LAYOUT_ANCHORS.includes(value as UiLayoutAnchor);
}
