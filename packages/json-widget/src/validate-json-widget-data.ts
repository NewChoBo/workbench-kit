import type { JsonWidgetNode } from './jdw-node.js';
import { isJsonWidgetDynamicValueExpression, parseJsonWidgetData } from './jdw-node.js';
import { WORKBENCH_JDW_KNOWN_TYPES } from './jdw-profile.js';

export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
}

export interface ValidateJsonWidgetDataOptions {
  /** When set, unknown `type` values produce errors. */
  readonly strictKnownTypes?: boolean | undefined;
  /** Additional registered types accepted when `strictKnownTypes` is true. */
  readonly registeredTypes?: readonly string[] | undefined;
}

export interface ValidatedJsonWidgetData {
  readonly value: JsonWidgetNode | null;
  readonly issues: readonly ValidationIssue[];
  readonly valid: boolean;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isJdwNode(value: unknown): value is JsonWidgetNode {
  return (
    isObjectRecord(value) &&
    typeof value.type === 'string' &&
    value.type.trim().length > 0 &&
    isObjectRecord(value.args)
  );
}

function readNumber(value: unknown, path: string, issues: ValidationIssue[], label: string): void {
  if (value === undefined) {
    return;
  }

  if (isJsonWidgetDynamicValueExpression(value)) {
    return;
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    issues.push({ path, message: `${label} must be a finite number.` });
  }
}

function readMinNumber(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  label: string,
  minimum: number,
): void {
  if (value === undefined) {
    return;
  }

  if (isJsonWidgetDynamicValueExpression(value)) {
    return;
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    issues.push({ path, message: `${label} must be a finite number.` });
    return;
  }

  if (value < minimum) {
    issues.push({ path, message: `${label} must be >= ${minimum}.` });
  }
}

function readString(value: unknown, path: string, issues: ValidationIssue[], label: string): void {
  if (value === undefined) {
    return;
  }

  if (typeof value !== 'string') {
    issues.push({ path, message: `${label} must be a string.` });
  }
}

function readRequiredString(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  label: string,
): string | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) {
    issues.push({ path, message: `${label} is required.` });
    return undefined;
  }

  return value;
}

function readBoolean(value: unknown, path: string, issues: ValidationIssue[], label: string): void {
  if (value === undefined) {
    return;
  }

  if (isJsonWidgetDynamicValueExpression(value)) {
    return;
  }

  if (typeof value !== 'boolean') {
    issues.push({ path, message: `${label} must be a boolean.` });
  }
}

function isAllowedStaticImageSource(value: string): boolean {
  const source = value.trim();
  if (source.length === 0 || source.startsWith('//')) return false;

  const schemeMatch = /^[A-Za-z][A-Za-z0-9+.-]*:/.exec(source);
  if (!schemeMatch) return true;

  const scheme = schemeMatch[0].slice(0, -1).toLowerCase();
  return scheme === 'http' || scheme === 'https' || scheme === 'workspace' || scheme === 'asset';
}

function readImageSource(value: unknown, path: string, issues: ValidationIssue[]): void {
  const source = readRequiredString(value, path, issues, 'src');
  if (source === undefined) return;

  if (!isAllowedStaticImageSource(source)) {
    issues.push({
      path,
      message:
        'src must be a relative path, absolute path, http(s), workspace://, or asset:// URL.',
    });
  }
}

function validateChildNodes(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  options: ValidateJsonWidgetDataOptions,
): void {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    issues.push({ path, message: 'children must be an array.' });
    return;
  }

  value.forEach((child, index) => {
    validateJsonWidgetNode(child, `${path}[${index}]`, issues, options);
  });
}

function validateSingleChild(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  options: ValidateJsonWidgetDataOptions,
): void {
  if (value === undefined) {
    issues.push({ path, message: 'child is required.' });
    return;
  }

  validateJsonWidgetNode(value, path, issues, options);
}

function isKnownType(type: string, options: ValidateJsonWidgetDataOptions): boolean {
  if ((WORKBENCH_JDW_KNOWN_TYPES as readonly string[]).includes(type)) {
    return true;
  }

  return options.registeredTypes?.includes(type) ?? false;
}

export function validateJsonWidgetNode(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  options: ValidateJsonWidgetDataOptions = {},
): void {
  if (!isJdwNode(value)) {
    issues.push({ path, message: 'Expected JDW v7 node (type + args).' });
    return;
  }

  const node = value;
  const argsPath = `${path}.args`;

  if (options.strictKnownTypes && !isKnownType(node.type, options)) {
    issues.push({ path: `${path}.type`, message: `Unknown widget type "${node.type}".` });
  }

  switch (node.type) {
    case 'text': {
      readString(node.args.text, `${argsPath}.text`, issues, 'text');
      if (node.args.text === undefined) {
        issues.push({ path: `${argsPath}.text`, message: 'text is required.' });
      }
      readString(node.args.color, `${argsPath}.color`, issues, 'color');
      readString(node.args.background, `${argsPath}.background`, issues, 'background');
      readMinNumber(node.args.fontSize, `${argsPath}.fontSize`, issues, 'fontSize', 1);
      break;
    }
    case 'row':
    case 'column': {
      readMinNumber(node.args.gap, `${argsPath}.gap`, issues, 'gap', 0);
      readMinNumber(node.args.padding, `${argsPath}.padding`, issues, 'padding', 0);
      readString(node.args.background, `${argsPath}.background`, issues, 'background');
      readString(
        node.args.mainAxisAlignment,
        `${argsPath}.mainAxisAlignment`,
        issues,
        'mainAxisAlignment',
      );
      readString(
        node.args.crossAxisAlignment,
        `${argsPath}.crossAxisAlignment`,
        issues,
        'crossAxisAlignment',
      );
      validateChildNodes(node.args.children, `${argsPath}.children`, issues, options);
      break;
    }
    case 'expanded':
    case 'flexible': {
      readMinNumber(node.args.flex, `${argsPath}.flex`, issues, 'flex', 0);
      if (
        node.type === 'flexible' &&
        node.args.fit !== undefined &&
        !isJsonWidgetDynamicValueExpression(node.args.fit) &&
        node.args.fit !== 'tight' &&
        node.args.fit !== 'loose'
      ) {
        issues.push({
          path: `${argsPath}.fit`,
          message: 'fit must be "tight" or "loose".',
        });
      }
      validateSingleChild(node.args.child, `${argsPath}.child`, issues, options);
      break;
    }
    case 'grid': {
      readMinNumber(node.args.columns, `${argsPath}.columns`, issues, 'columns', 1);
      if (node.args.columns === undefined) {
        issues.push({ path: `${argsPath}.columns`, message: 'columns is required.' });
      }
      readMinNumber(node.args.gap, `${argsPath}.gap`, issues, 'gap', 0);
      readMinNumber(node.args.padding, `${argsPath}.padding`, issues, 'padding', 0);
      readString(node.args.background, `${argsPath}.background`, issues, 'background');
      validateChildNodes(node.args.children, `${argsPath}.children`, issues, options);

      if (Array.isArray(node.args.children)) {
        node.args.children.forEach((child, index) => {
          if (!isJdwNode(child)) {
            return;
          }

          const childArgsPath = `${argsPath}.children[${index}].args`;
          readNumber(child.args.col, `${childArgsPath}.col`, issues, 'col');
          readNumber(child.args.row, `${childArgsPath}.row`, issues, 'row');
          readMinNumber(child.args.colSpan, `${childArgsPath}.colSpan`, issues, 'colSpan', 1);
          readMinNumber(child.args.rowSpan, `${childArgsPath}.rowSpan`, issues, 'rowSpan', 1);
        });
      }
      break;
    }
    case 'stack': {
      readString(node.args.background, `${argsPath}.background`, issues, 'background');
      validateChildNodes(node.args.children, `${argsPath}.children`, issues, options);

      if (Array.isArray(node.args.children)) {
        node.args.children.forEach((child, index) => {
          if (!isJdwNode(child)) {
            return;
          }

          const childArgsPath = `${argsPath}.children[${index}].args`;
          readNumber(child.args.left, `${childArgsPath}.left`, issues, 'left');
          readNumber(child.args.top, `${childArgsPath}.top`, issues, 'top');
          readNumber(child.args.right, `${childArgsPath}.right`, issues, 'right');
          readNumber(child.args.bottom, `${childArgsPath}.bottom`, issues, 'bottom');
        });
      }
      break;
    }
    case 'box':
    case 'container': {
      readMinNumber(node.args.width, `${argsPath}.width`, issues, 'width', 0);
      readMinNumber(node.args.height, `${argsPath}.height`, issues, 'height', 0);
      readMinNumber(node.args.padding, `${argsPath}.padding`, issues, 'padding', 0);
      readString(node.args.background, `${argsPath}.background`, issues, 'background');
      break;
    }
    case 'padding': {
      readMinNumber(node.args.padding, `${argsPath}.padding`, issues, 'padding', 0);
      break;
    }
    case 'align': {
      readString(node.args.alignment, `${argsPath}.alignment`, issues, 'alignment');
      break;
    }
    case 'sized_box': {
      readMinNumber(node.args.width, `${argsPath}.width`, issues, 'width', 0);
      readMinNumber(node.args.height, `${argsPath}.height`, issues, 'height', 0);
      break;
    }
    case 'image': {
      readImageSource(node.args.src, `${argsPath}.src`, issues);
      readString(node.args.alt, `${argsPath}.alt`, issues, 'alt');
      readString(node.args.fit, `${argsPath}.fit`, issues, 'fit');
      readMinNumber(node.args.width, `${argsPath}.width`, issues, 'width', 0);
      readMinNumber(node.args.height, `${argsPath}.height`, issues, 'height', 0);
      break;
    }
    case 'icon': {
      readRequiredString(node.args.name, `${argsPath}.name`, issues, 'name');
      readString(node.args.color, `${argsPath}.color`, issues, 'color');
      readMinNumber(node.args.size, `${argsPath}.size`, issues, 'size', 1);
      break;
    }
    case 'button': {
      readRequiredString(node.args.label, `${argsPath}.label`, issues, 'label');
      readString(node.args.variant, `${argsPath}.variant`, issues, 'variant');
      readString(node.args.color, `${argsPath}.color`, issues, 'color');
      readString(node.args.background, `${argsPath}.background`, issues, 'background');
      readBoolean(node.args.disabled, `${argsPath}.disabled`, issues, 'disabled');
      break;
    }
    case 'center':
    default:
      break;
  }

  if (node.type !== 'expanded' && node.type !== 'flexible') {
    if ('child' in node.args && node.args.child !== undefined) {
      validateSingleChild(node.args.child, `${argsPath}.child`, issues, options);
    }
  }

  if (
    node.type !== 'row' &&
    node.type !== 'column' &&
    node.type !== 'grid' &&
    node.type !== 'stack' &&
    'children' in node.args &&
    node.args.children !== undefined
  ) {
    validateChildNodes(node.args.children, `${argsPath}.children`, issues, options);
  }
}

export function validateJsonWidgetData(
  source: string,
  options: ValidateJsonWidgetDataOptions = {},
): ValidatedJsonWidgetData {
  const parsed = parseJsonWidgetData(source);
  if (parsed.parseError !== null || parsed.value === null) {
    return {
      value: null,
      issues: [{ path: 'root', message: parsed.parseError ?? 'Invalid JSON widget data.' }],
      valid: false,
    };
  }

  const issues: ValidationIssue[] = [];
  validateJsonWidgetNode(parsed.value, 'root', issues, options);

  return {
    value: parsed.value,
    issues,
    valid: issues.length === 0,
  };
}
