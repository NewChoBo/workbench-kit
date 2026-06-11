import { isContextKeyTruthy, type ContextKeyValue } from './context-key-value.js';

/**
 * Minimal when-clause evaluator for Phase 1.
 * Migration M1 replaces this with the canonical parser from legacy `@workbench-kit/core`
 * (`when-clause.ts`) merged into `platform`. Do not extend this parser for new features.
 */
export function evaluateWhenClause(
  when: string | undefined,
  context: Readonly<Record<string, ContextKeyValue>>,
): boolean {
  const expression = when?.trim();
  if (!expression) {
    return true;
  }

  return evaluateOrExpression(expression, context);
}

function evaluateOrExpression(
  expression: string,
  context: Readonly<Record<string, ContextKeyValue>>,
): boolean {
  const parts = splitTopLevel(expression, '||');
  return parts.some((part) => evaluateAndExpression(part.trim(), context));
}

function evaluateAndExpression(
  expression: string,
  context: Readonly<Record<string, ContextKeyValue>>,
): boolean {
  const parts = splitTopLevel(expression, '&&');
  return parts.every((part) => evaluateUnaryExpression(part.trim(), context));
}

function evaluateUnaryExpression(
  expression: string,
  context: Readonly<Record<string, ContextKeyValue>>,
): boolean {
  if (expression.startsWith('!')) {
    return !evaluateUnaryExpression(expression.slice(1).trim(), context);
  }

  return evaluatePrimaryExpression(expression, context);
}

function evaluatePrimaryExpression(
  expression: string,
  context: Readonly<Record<string, ContextKeyValue>>,
): boolean {
  const equalityMatch = /^([a-zA-Z][\w.]*) *(==|!=) *(.+)$/.exec(expression);
  if (equalityMatch) {
    const [, key, operator, rawValue] = equalityMatch;
    const actual = context[key];
    const expected = parseLiteral(rawValue.trim());
    return operator === '==' ? actual === expected : actual !== expected;
  }

  const key = expression.trim();
  return isContextKeyTruthy(context[key]);
}

function parseLiteral(rawValue: string): ContextKeyValue {
  if (rawValue === 'true') {
    return true;
  }

  if (rawValue === 'false') {
    return false;
  }

  if (rawValue === 'null') {
    return null;
  }

  if (
    (rawValue.startsWith("'") && rawValue.endsWith("'")) ||
    (rawValue.startsWith('"') && rawValue.endsWith('"'))
  ) {
    return rawValue.slice(1, -1);
  }

  const numeric = Number(rawValue);
  if (!Number.isNaN(numeric)) {
    return numeric;
  }

  return rawValue;
}

function splitTopLevel(expression: string, operator: '&&' | '||'): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;

  for (let index = 0; index < expression.length; index += 1) {
    const char = expression[index];

    if (char === '(') {
      depth += 1;
      current += char;
      continue;
    }

    if (char === ')') {
      depth -= 1;
      current += char;
      continue;
    }

    if (depth === 0 && expression.slice(index, index + operator.length) === operator) {
      parts.push(current);
      current = '';
      index += operator.length - 1;
      continue;
    }

    current += char;
  }

  parts.push(current);
  return parts;
}
