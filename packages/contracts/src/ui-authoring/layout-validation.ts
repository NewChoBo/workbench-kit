import {
  UI_BORDER_STYLES,
  UI_CROSS_AXIS_ALIGNMENTS,
  UI_FLEX_WRAPS,
  UI_INTRINSIC_SIZE_KEYWORDS,
  UI_LAYOUT_DIRECTIONS,
  UI_MAIN_AXIS_ALIGNMENTS,
  isUiLayoutAnchor,
  isUiLengthUnit,
  type UiDimensionValue,
  type UiLayoutPropertyDescriptor,
  type UiLayoutPropertyScope,
  type UiLayoutStrategyDescriptor,
  type UiLengthOrPercentageValue,
} from './layout-types';

export const UI_LAYOUT_VALIDATION_ISSUE_CODES = Object.freeze([
  'blank-layout-strategy-id',
  'blank-layout-strategy-kind',
  'blank-layout-property-id',
  'blank-layout-property-group',
  'duplicate-layout-property-id',
  'unknown-layout-property-id',
  'layout-property-scope-mismatch',
  'layout-property-strategy-mismatch',
  'invalid-layout-number',
  'invalid-layout-dimension-kind',
  'invalid-layout-range',
  'invalid-layout-enum',
  'invalid-flex-value',
  'invalid-grid-track-list',
  'invalid-grid-placement',
  'invalid-split-value',
  'invalid-overlay-placement',
  'invalid-canvas-placement',
] as const);

export type UiLayoutValidationIssueCode = (typeof UI_LAYOUT_VALIDATION_ISSUE_CODES)[number];

export interface UiLayoutValidationIssue {
  readonly code: UiLayoutValidationIssueCode;
  readonly message: string;
  readonly path: string;
  readonly strategyId?: string;
  readonly propertyId?: string;
  readonly scope?: UiLayoutPropertyScope;
  readonly valueKind?: string;
}

export interface ValidateUiDimensionValueOptions {
  readonly allowedKinds?: readonly UiDimensionValue['kind'][];
  readonly allowNegative?: boolean;
  readonly path?: string;
}

export interface ValidateUiSpacingValueOptions {
  readonly allowNegative?: boolean;
  readonly path?: string;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function issue(
  code: UiLayoutValidationIssueCode,
  message: string,
  path: string,
  context: Partial<
    Pick<UiLayoutValidationIssue, 'strategyId' | 'propertyId' | 'scope' | 'valueKind'>
  > = {},
): UiLayoutValidationIssue {
  return { code, message, path, ...context };
}

function kindOf(value: unknown): string | undefined {
  return isRecord(value) && typeof value.kind === 'string' ? value.kind : undefined;
}

function childPath(path: string, child: string): string {
  return path.length === 0 ? child : `${path}.${child}`;
}

function indexPath(path: string, index: number): string {
  return `${path}[${index}]`;
}

function validateFiniteNumber(
  value: unknown,
  path: string,
  options: { readonly integer?: boolean; readonly min?: number } = {},
): readonly UiLayoutValidationIssue[] {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return [issue('invalid-layout-number', 'Layout number must be finite.', path)];
  }
  if (options.integer && !Number.isInteger(value)) {
    return [issue('invalid-layout-number', 'Layout number must be an integer.', path)];
  }
  if (options.min !== undefined && value < options.min) {
    return [
      issue(
        'invalid-layout-range',
        `Layout number must be greater than or equal to ${options.min}.`,
        path,
      ),
    ];
  }
  return [];
}

function validateEnum(
  value: unknown,
  values: readonly string[],
  path: string,
): readonly UiLayoutValidationIssue[] {
  if (typeof value === 'string' && values.includes(value)) return [];
  return [issue('invalid-layout-enum', 'Layout value is not in the declared vocabulary.', path)];
}

export function validateUiDimensionValue(
  value: unknown,
  options: ValidateUiDimensionValueOptions = {},
): readonly UiLayoutValidationIssue[] {
  const path = options.path ?? '';
  const kind = kindOf(value);
  if (!isRecord(value) || kind === undefined) {
    return [issue('invalid-layout-dimension-kind', 'Layout dimension must declare a kind.', path)];
  }

  const allowedKinds = options.allowedKinds;
  if (
    !['length', 'percentage', 'flex-fraction', 'intrinsic-size'].includes(kind) ||
    (allowedKinds !== undefined && !allowedKinds.includes(kind as UiDimensionValue['kind']))
  ) {
    return [
      issue(
        'invalid-layout-dimension-kind',
        `Layout dimension kind "${kind}" is not allowed.`,
        childPath(path, 'kind'),
        { valueKind: kind },
      ),
    ];
  }

  if (kind === 'intrinsic-size') {
    return validateEnum(value.value, UI_INTRINSIC_SIZE_KEYWORDS, childPath(path, 'value'));
  }

  const issues = [
    ...validateFiniteNumber(value.value, childPath(path, 'value'), {
      ...(kind === 'flex-fraction' ? { min: Number.MIN_VALUE } : {}),
    }),
  ];
  if (
    issues.length === 0 &&
    options.allowNegative !== true &&
    kind !== 'flex-fraction' &&
    (value.value as number) < 0
  ) {
    issues.push(
      issue(
        'invalid-layout-range',
        'Layout dimension must not be negative.',
        childPath(path, 'value'),
        { valueKind: kind },
      ),
    );
  }

  if (kind === 'length' && !isUiLengthUnit(value.unit)) {
    issues.push(
      issue(
        'invalid-layout-enum',
        'Layout length unit is not supported.',
        childPath(path, 'unit'),
        { valueKind: kind },
      ),
    );
  }
  return issues;
}

export function validateUiSpacingValue(
  value: unknown,
  options: ValidateUiSpacingValueOptions = {},
): readonly UiLayoutValidationIssue[] {
  const path = options.path ?? '';
  if (!isRecord(value) || value.kind !== 'spacing') {
    return [issue('invalid-layout-dimension-kind', 'Spacing value is invalid.', path)];
  }
  return ['top', 'right', 'bottom', 'left'].flatMap((edge) =>
    validateUiDimensionValue(value[edge], {
      allowedKinds: ['length', 'percentage'],
      allowNegative: options.allowNegative,
      path: childPath(path, edge),
    }),
  );
}

export function validateUiBorderValue(value: unknown): readonly UiLayoutValidationIssue[] {
  if (!isRecord(value) || value.kind !== 'border') {
    return [issue('invalid-layout-dimension-kind', 'Border value is invalid.', '')];
  }
  return [
    ...validateUiDimensionValue(value.width, {
      allowedKinds: ['length'],
      path: 'width',
    }),
    ...validateEnum(value.style, UI_BORDER_STYLES, 'style'),
    ...(typeof value.color === 'string' && value.color.trim().length > 0
      ? []
      : [issue('invalid-layout-enum', 'Border color must not be blank.', 'color')]),
  ];
}

export function validateUiRadiusValue(value: unknown): readonly UiLayoutValidationIssue[] {
  if (!isRecord(value) || value.kind !== 'radius') {
    return [issue('invalid-layout-dimension-kind', 'Radius value is invalid.', '')];
  }
  return ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'].flatMap((corner) =>
    validateUiDimensionValue(value[corner], {
      allowedKinds: ['length', 'percentage'],
      path: corner,
    }),
  );
}

export function validateUiShadowValue(value: unknown): readonly UiLayoutValidationIssue[] {
  if (!isRecord(value) || value.kind !== 'shadow') {
    return [issue('invalid-layout-dimension-kind', 'Shadow value is invalid.', '')];
  }
  return [
    ...validateUiDimensionValue(value.offsetX, {
      allowedKinds: ['length'],
      allowNegative: true,
      path: 'offsetX',
    }),
    ...validateUiDimensionValue(value.offsetY, {
      allowedKinds: ['length'],
      allowNegative: true,
      path: 'offsetY',
    }),
    ...validateUiDimensionValue(value.blur, { allowedKinds: ['length'], path: 'blur' }),
    ...validateUiDimensionValue(value.spread, {
      allowedKinds: ['length'],
      allowNegative: true,
      path: 'spread',
    }),
    ...(typeof value.color === 'string' && value.color.trim().length > 0
      ? []
      : [issue('invalid-layout-enum', 'Shadow color must not be blank.', 'color')]),
    ...(value.inset === undefined || typeof value.inset === 'boolean'
      ? []
      : [issue('invalid-layout-enum', 'Shadow inset must be boolean.', 'inset')]),
  ];
}

export function validateUiFlexContainerValue(value: unknown): readonly UiLayoutValidationIssue[] {
  if (!isRecord(value) || value.kind !== 'flex-container') {
    return [issue('invalid-flex-value', 'Flex container value is invalid.', '')];
  }
  return [
    ...validateEnum(value.direction, UI_LAYOUT_DIRECTIONS, 'direction'),
    ...validateEnum(value.wrap, UI_FLEX_WRAPS, 'wrap'),
    ...validateEnum(value.mainAxisAlignment, UI_MAIN_AXIS_ALIGNMENTS, 'mainAxisAlignment'),
    ...validateEnum(value.crossAxisAlignment, UI_CROSS_AXIS_ALIGNMENTS, 'crossAxisAlignment'),
  ];
}

export function validateUiFlexChildValue(value: unknown): readonly UiLayoutValidationIssue[] {
  if (!isRecord(value) || value.kind !== 'flex-child') {
    return [issue('invalid-flex-value', 'Flex child value is invalid.', '')];
  }
  return [
    ...validateFiniteNumber(value.grow, 'grow', { min: 0 }),
    ...validateFiniteNumber(value.shrink, 'shrink', { min: 0 }),
    ...validateUiDimensionValue(value.basis, {
      allowedKinds: ['length', 'percentage', 'intrinsic-size'],
      path: 'basis',
    }),
    ...validateFiniteNumber(value.order, 'order', { integer: true }),
    ...validateEnum(value.alignSelf, ['auto', ...UI_CROSS_AXIS_ALIGNMENTS], 'alignSelf'),
  ];
}

function validateGridTrack(value: unknown, path: string): readonly UiLayoutValidationIssue[] {
  if (!isRecord(value)) {
    return [issue('invalid-grid-track-list', 'Grid track value is invalid.', path)];
  }
  if (value.kind === 'grid-minmax') {
    return [
      ...validateUiDimensionValue(value.min, {
        allowedKinds: ['length', 'percentage', 'intrinsic-size'],
        path: childPath(path, 'min'),
      }),
      ...validateUiDimensionValue(value.max, {
        allowedKinds: ['length', 'percentage', 'flex-fraction', 'intrinsic-size'],
        path: childPath(path, 'max'),
      }),
    ];
  }
  return validateUiDimensionValue(value, {
    allowedKinds: ['length', 'percentage', 'flex-fraction', 'intrinsic-size'],
    path,
  });
}

export function validateUiGridTrackListValue(value: unknown): readonly UiLayoutValidationIssue[] {
  if (!isRecord(value) || value.kind !== 'grid-track-list' || !Array.isArray(value.tracks)) {
    return [issue('invalid-grid-track-list', 'Grid track list is invalid.', '')];
  }
  if (value.tracks.length === 0) {
    return [issue('invalid-grid-track-list', 'Grid track list must not be empty.', 'tracks')];
  }

  return value.tracks.flatMap((track, index) => {
    const path = indexPath('tracks', index);
    if (!isRecord(track) || track.kind !== 'grid-repeat') {
      return validateGridTrack(track, path);
    }
    const issues: UiLayoutValidationIssue[] = [];
    if (
      track.count !== 'auto-fill' &&
      track.count !== 'auto-fit' &&
      (typeof track.count !== 'number' || !Number.isInteger(track.count) || track.count <= 0)
    ) {
      issues.push(
        issue(
          'invalid-grid-track-list',
          'Grid repeat count must be a positive integer, auto-fill, or auto-fit.',
          childPath(path, 'count'),
        ),
      );
    }
    if (!Array.isArray(track.tracks) || track.tracks.length === 0) {
      issues.push(
        issue(
          'invalid-grid-track-list',
          'Grid repeat tracks must not be empty.',
          childPath(path, 'tracks'),
        ),
      );
      return issues;
    }
    track.tracks.forEach((repeatedTrack, repeatedIndex) => {
      const repeatedPath = indexPath(childPath(path, 'tracks'), repeatedIndex);
      if (isRecord(repeatedTrack) && repeatedTrack.kind === 'grid-repeat') {
        issues.push(
          issue('invalid-grid-track-list', 'Grid repeats must not be nested.', repeatedPath),
        );
        return;
      }
      issues.push(...validateGridTrack(repeatedTrack, repeatedPath));
    });
    return issues;
  });
}

export function validateUiGridPlacementValue(value: unknown): readonly UiLayoutValidationIssue[] {
  if (!isRecord(value) || value.kind !== 'grid-placement') {
    return [issue('invalid-grid-placement', 'Grid placement value is invalid.', '')];
  }
  if (value.mode === 'area') {
    return typeof value.area === 'string' && value.area.trim().length > 0
      ? []
      : [issue('invalid-grid-placement', 'Grid area must not be blank.', 'area')];
  }
  if (value.mode !== 'lines') {
    return [issue('invalid-grid-placement', 'Grid placement mode is invalid.', 'mode')];
  }
  return ['columnStart', 'rowStart', 'columnSpan', 'rowSpan'].flatMap((field) =>
    validateFiniteNumber(value[field], field, { integer: true, min: 1 }),
  );
}

function comparableDimensionNumber(
  left: UiLengthOrPercentageValue,
  right: UiLengthOrPercentageValue,
): readonly [number, number] | null {
  if (left.kind !== right.kind) return null;
  if (left.kind === 'length' && right.kind === 'length' && left.unit !== right.unit) return null;
  return [left.value, right.value];
}

function validateComparableRange(
  min: unknown,
  max: unknown,
  maxPath: string,
): readonly UiLayoutValidationIssue[] {
  if (!isRecord(min) || !isRecord(max)) return [];
  const pair = comparableDimensionNumber(
    min as unknown as UiLengthOrPercentageValue,
    max as unknown as UiLengthOrPercentageValue,
  );
  if (pair !== null && pair[0] > pair[1]) {
    return [issue('invalid-layout-range', 'Minimum size must not exceed maximum size.', maxPath)];
  }
  return [];
}

export function validateUiSplitValue(value: unknown): readonly UiLayoutValidationIssue[] {
  if (!isRecord(value) || value.kind !== 'split') {
    return [issue('invalid-split-value', 'Split value is invalid.', '')];
  }
  const issues: UiLayoutValidationIssue[] = [
    ...validateEnum(value.orientation, ['horizontal', 'vertical'], 'orientation'),
    ...validateEnum(value.fixedTrack, ['primary', 'secondary'], 'fixedTrack'),
    ...validateUiDimensionValue(value.size, {
      allowedKinds: ['length', 'percentage'],
      path: 'size',
    }),
  ];
  if (value.minSize !== undefined) {
    issues.push(
      ...validateUiDimensionValue(value.minSize, {
        allowedKinds: ['length', 'percentage'],
        path: 'minSize',
      }),
    );
  }
  if (value.maxSize !== undefined) {
    issues.push(
      ...validateUiDimensionValue(value.maxSize, {
        allowedKinds: ['length', 'percentage'],
        path: 'maxSize',
      }),
    );
  }
  for (const field of ['collapsible', 'collapsed', 'resizable'] as const) {
    if (typeof value[field] !== 'boolean') {
      issues.push(issue('invalid-split-value', `Split ${field} must be boolean.`, field));
    }
  }
  if (value.collapsed === true && value.collapsible !== true) {
    issues.push(
      issue('invalid-split-value', 'A collapsed Split track must be collapsible.', 'collapsed'),
    );
  }
  if (value.minSize !== undefined && value.maxSize !== undefined) {
    issues.push(...validateComparableRange(value.minSize, value.maxSize, 'maxSize'));
  }
  return issues;
}

export function validateUiOverlayPlacementValue(
  value: unknown,
): readonly UiLayoutValidationIssue[] {
  if (!isRecord(value) || value.kind !== 'overlay-placement') {
    return [issue('invalid-overlay-placement', 'Overlay placement value is invalid.', '')];
  }
  const issues: UiLayoutValidationIssue[] = [];
  if (!isUiLayoutAnchor(value.anchor)) {
    issues.push(issue('invalid-layout-enum', 'Overlay anchor is invalid.', 'anchor'));
  }
  for (const edge of ['top', 'right', 'bottom', 'left'] as const) {
    if (value[edge] !== undefined) {
      issues.push(
        ...validateUiDimensionValue(value[edge], {
          allowedKinds: ['length', 'percentage'],
          allowNegative: true,
          path: edge,
        }),
      );
    }
  }
  issues.push(...validateFiniteNumber(value.zIndex, 'zIndex', { integer: true }));
  return issues;
}

function validateCanvasConstraints(
  value: unknown,
  path: string,
): readonly UiLayoutValidationIssue[] {
  if (!isRecord(value)) {
    return [issue('invalid-canvas-placement', 'Canvas constraints are invalid.', path)];
  }
  const issues: UiLayoutValidationIssue[] = [];
  for (const field of ['minWidth', 'maxWidth', 'minHeight', 'maxHeight'] as const) {
    if (value[field] !== undefined) {
      issues.push(
        ...validateUiDimensionValue(value[field], {
          allowedKinds: ['length', 'percentage'],
          path: childPath(path, field),
        }),
      );
    }
  }
  if (value.aspectRatio !== undefined) {
    issues.push(
      ...validateFiniteNumber(value.aspectRatio, childPath(path, 'aspectRatio'), {
        min: Number.MIN_VALUE,
      }),
    );
  }
  if (value.minWidth !== undefined && value.maxWidth !== undefined) {
    issues.push(
      ...validateComparableRange(value.minWidth, value.maxWidth, childPath(path, 'maxWidth')),
    );
  }
  if (value.minHeight !== undefined && value.maxHeight !== undefined) {
    issues.push(
      ...validateComparableRange(value.minHeight, value.maxHeight, childPath(path, 'maxHeight')),
    );
  }
  return issues;
}

export function validateUiCanvasPlacementValue(value: unknown): readonly UiLayoutValidationIssue[] {
  if (!isRecord(value) || value.kind !== 'canvas-placement') {
    return [issue('invalid-canvas-placement', 'Canvas placement value is invalid.', '')];
  }
  const issues: UiLayoutValidationIssue[] = [
    ...validateUiDimensionValue(value.x, {
      allowedKinds: ['length', 'percentage'],
      allowNegative: true,
      path: 'x',
    }),
    ...validateUiDimensionValue(value.y, {
      allowedKinds: ['length', 'percentage'],
      allowNegative: true,
      path: 'y',
    }),
    ...validateUiDimensionValue(value.width, {
      allowedKinds: ['length', 'percentage', 'intrinsic-size'],
      path: 'width',
    }),
    ...validateUiDimensionValue(value.height, {
      allowedKinds: ['length', 'percentage', 'intrinsic-size'],
      path: 'height',
    }),
    ...validateFiniteNumber(value.zIndex, 'zIndex', { integer: true }),
  ];
  if (!isUiLayoutAnchor(value.anchor)) {
    issues.push(issue('invalid-layout-enum', 'Canvas anchor is invalid.', 'anchor'));
  }
  if (value.constraints !== undefined) {
    issues.push(...validateCanvasConstraints(value.constraints, 'constraints'));
  }
  return issues;
}

export function validateUiLayoutStrategyDescriptor<TLiteral>(
  strategy: UiLayoutStrategyDescriptor,
  properties: readonly UiLayoutPropertyDescriptor<TLiteral>[],
): readonly UiLayoutValidationIssue[] {
  const issues: UiLayoutValidationIssue[] = [];
  const context = { strategyId: strategy.id };
  if (strategy.id.trim().length === 0) {
    issues.push(
      issue('blank-layout-strategy-id', 'Layout strategy id must not be blank.', 'id', context),
    );
  }
  if (strategy.kind.trim().length === 0) {
    issues.push(
      issue(
        'blank-layout-strategy-kind',
        'Layout strategy kind must not be blank.',
        'kind',
        context,
      ),
    );
  }

  const byId = new Map<string, UiLayoutPropertyDescriptor<TLiteral>>();
  properties.forEach((property, index) => {
    const propertyContext = {
      strategyId: strategy.id,
      propertyId: property.id,
      scope: property.scope,
    };
    if (property.id.trim().length === 0) {
      issues.push(
        issue(
          'blank-layout-property-id',
          'Layout property id must not be blank.',
          indexPath('properties', index),
          propertyContext,
        ),
      );
    }
    if (property.group.trim().length === 0) {
      issues.push(
        issue(
          'blank-layout-property-group',
          'Layout property group must not be blank.',
          childPath(indexPath('properties', index), 'group'),
          propertyContext,
        ),
      );
    }
    if (byId.has(property.id)) {
      issues.push(
        issue(
          'duplicate-layout-property-id',
          `Layout property "${property.id}" is duplicated.`,
          childPath(indexPath('properties', index), 'id'),
          propertyContext,
        ),
      );
      return;
    }
    byId.set(property.id, property);
  });

  const validateSupported = (
    ids: readonly string[],
    scope: UiLayoutPropertyScope,
    path: string,
  ) => {
    const seen = new Set<string>();
    ids.forEach((id, index) => {
      const supportedPath = indexPath(path, index);
      if (seen.has(id)) {
        issues.push(
          issue(
            'duplicate-layout-property-id',
            `Supported layout property "${id}" is duplicated.`,
            supportedPath,
            { strategyId: strategy.id, propertyId: id, scope },
          ),
        );
        return;
      }
      seen.add(id);
      const property = byId.get(id);
      if (property === undefined) {
        issues.push(
          issue(
            'unknown-layout-property-id',
            `Supported layout property "${id}" is unknown.`,
            supportedPath,
            { strategyId: strategy.id, propertyId: id, scope },
          ),
        );
        return;
      }
      if (property.scope !== scope) {
        issues.push(
          issue(
            'layout-property-scope-mismatch',
            `Layout property "${id}" belongs to the ${property.scope} scope.`,
            supportedPath,
            { strategyId: strategy.id, propertyId: id, scope },
          ),
        );
      }
      if (!property.strategyKinds.includes(strategy.kind)) {
        issues.push(
          issue(
            'layout-property-strategy-mismatch',
            `Layout property "${id}" does not support strategy kind "${strategy.kind}".`,
            supportedPath,
            { strategyId: strategy.id, propertyId: id, scope },
          ),
        );
      }
    });
  };

  validateSupported(
    strategy.supportedContainerProperties,
    'container',
    'supportedContainerProperties',
  );
  validateSupported(strategy.supportedChildProperties, 'child', 'supportedChildProperties');
  return issues;
}

export function isUiLayoutValidationIssueCode(
  value: unknown,
): value is UiLayoutValidationIssueCode {
  return (
    typeof value === 'string' &&
    UI_LAYOUT_VALIDATION_ISSUE_CODES.includes(value as UiLayoutValidationIssueCode)
  );
}
