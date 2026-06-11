import { compileScreenSpecToJson } from './compile.js';
import type { JdwScreenSpec, ScreenNode } from './types.js';

export interface ParsedScreenSpec {
  readonly value: JdwScreenSpec | null;
  readonly error: string | null;
}

export interface CompiledScreenSpecText {
  readonly spec: JdwScreenSpec | null;
  readonly json: string | null;
  readonly error: string | null;
}

const SCREEN_NODE_KINDS = new Set(['text', 'panel', 'expanded', 'row', 'column', 'grid', 'stack']);

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseError(error: unknown): string {
  if (error instanceof SyntaxError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function validateScreenNode(node: unknown, path: string): string | null {
  if (!isObjectRecord(node)) {
    return `${path} must be an object.`;
  }

  const kind = node.kind;
  if (typeof kind !== 'string' || !SCREEN_NODE_KINDS.has(kind)) {
    return `${path}.kind must be a supported screen node kind.`;
  }

  if (kind === 'expanded') {
    const childError = validateScreenNode(node.child, `${path}.child`);
    if (childError) {
      return childError;
    }
    return null;
  }

  if (kind === 'row' || kind === 'column' || kind === 'grid' || kind === 'stack') {
    if (!Array.isArray(node.children)) {
      return `${path}.children must be an array.`;
    }

    if (kind === 'grid' && typeof node.columns !== 'number') {
      return `${path}.columns must be a number.`;
    }

    for (const [index, child] of node.children.entries()) {
      const childError = validateScreenNode(child, `${path}.children[${index}]`);
      if (childError) {
        return childError;
      }
    }
  }

  if (kind === 'text' || kind === 'panel') {
    if (typeof node.content !== 'string') {
      return `${path}.content must be a string.`;
    }
  }

  return null;
}

function validateScreenSpec(value: unknown): string | null {
  if (!isObjectRecord(value)) {
    return 'Screen spec must be a JSON object.';
  }

  if (typeof value.id !== 'string' || value.id.trim().length === 0) {
    return 'Screen spec id is required.';
  }

  if (!isObjectRecord(value.layout)) {
    return 'Screen spec layout is required.';
  }

  if (typeof value.layout.maxWidth !== 'number' || typeof value.layout.maxHeight !== 'number') {
    return 'Screen spec layout.maxWidth and layout.maxHeight must be numbers.';
  }

  return validateScreenNode(value.root, 'root');
}

export function parseScreenSpecJson(source: string): ParsedScreenSpec {
  try {
    const parsed = JSON.parse(source) as unknown;
    const validationError = validateScreenSpec(parsed);
    if (validationError !== null) {
      return { value: null, error: validationError };
    }

    return { value: parsed as JdwScreenSpec, error: null };
  } catch (error) {
    return { value: null, error: parseError(error) };
  }
}

export function compileScreenSpecText(source: string): CompiledScreenSpecText {
  const parsed = parseScreenSpecJson(source);
  if (parsed.error !== null || parsed.value === null) {
    return { spec: null, json: null, error: parsed.error };
  }

  try {
    return {
      spec: parsed.value,
      json: compileScreenSpecToJson(parsed.value),
      error: null,
    };
  } catch (error) {
    return { spec: parsed.value, json: null, error: parseError(error) };
  }
}

export function isScreenNode(value: unknown): value is ScreenNode {
  return validateScreenNode(value, 'node') === null;
}
