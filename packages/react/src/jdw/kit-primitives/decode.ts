import type { UiDocumentLiteralPolicyInput } from '@workbench-kit/jdw';

import type { KitJdwDecodeResult, KitJdwPrimitive } from './contracts.js';
import { acceptsPrimitiveField, getPrimitiveSpec } from './primitive-specs.js';

/** Does not execute getters or admit inherited, symbol, or non-enumerable props. */
export function ownDataRecord(value: unknown): Readonly<Record<string, unknown>> | undefined {
  try {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return undefined;
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        typeof key !== 'string' ||
        descriptor?.enumerable !== true ||
        !Object.prototype.hasOwnProperty.call(descriptor, 'value')
      )
        return undefined;
    }
    return value as Readonly<Record<string, unknown>>;
  } catch {
    return undefined;
  }
}

/** Strict resolved-props boundary, not a replacement for the JDW source parser. */
export function decodeKitJdwPrimitive(type: unknown, props: unknown): KitJdwDecodeResult {
  const spec = getPrimitiveSpec(type);
  if (spec === undefined) return Object.freeze({ status: 'invalid', code: 'unknown-type' });
  const record = ownDataRecord(props);
  if (record === undefined) return Object.freeze({ status: 'invalid', code: 'invalid-props' });
  for (const key of Object.keys(record)) {
    if (!spec.fields.some((field) => field.id === key))
      return Object.freeze({
        status: 'invalid',
        code: 'unknown-property',
        ...(key.length <= 128 ? { property: key } : {}),
      });
  }
  const decoded: Record<string, string | boolean> = {};
  for (const field of spec.fields) {
    if (!Object.prototype.hasOwnProperty.call(record, field.id)) {
      if (field.required)
        return Object.freeze({ status: 'invalid', code: 'missing-property', property: field.id });
      if ('defaultValue' in field && field.defaultValue !== undefined)
        decoded[field.id] = field.defaultValue;
    } else {
      const value = record[field.id];
      if (!acceptsPrimitiveField(field, value))
        return Object.freeze({ status: 'invalid', code: 'invalid-property', property: field.id });
      decoded[field.id] = value as string | boolean;
    }
  }
  return Object.freeze({
    status: 'valid',
    value: Object.freeze({
      type: spec.type,
      props: Object.freeze(decoded),
    }) as unknown as KitJdwPrimitive,
  });
}

/** Compose with the host's existing V3 literal policy; unrelated components pass through. */
export function validateKitJdwLiteral({
  component,
  property,
  value,
}: UiDocumentLiteralPolicyInput): string | undefined {
  if (!/^kit\.(?:button|icon-button|badge|media-slot|panel-loading)(?:\.|$)/u.test(component.id))
    return undefined;
  const spec = getPrimitiveSpec(component.id);
  if (spec === undefined || component.version !== '1')
    return 'The Kit primitive identity or version is unavailable.';
  const field = spec.fields.find((candidate) => candidate.id === property.id);
  if (field === undefined) return 'The Kit primitive property is unavailable.';
  return acceptsPrimitiveField(field, value) ? undefined : 'The Kit primitive literal is invalid.';
}
