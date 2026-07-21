import { reformatDateString, splitDateTimeString } from '../domain/mapping/dateFormat.js';
import { applyStringTemplate, isPlainObject } from '../domain/mapping/pathUtils.js';
import type { ValueTransformDefinition } from '../domain/types.js';
import { createValueTransformRegistry } from './createValueTransformRegistry.js';

export const BUILTIN_TRANSFORM_IDS = {
  identity: 'identity',
  arrayFirst: 'array:first',
  arrayJoin: 'array:join',
  stringTrim: 'string:trim',
  stringUpper: 'string:upper',
  stringLower: 'string:lower',
  stringPrefix: 'string:prefix',
  stringSuffix: 'string:suffix',
  stringTemplate: 'string:template',
  dateReformat: 'date:reformat',
  datetimeCombine: 'datetime:combine',
  datetimeDate: 'datetime:date',
  datetimeTime: 'datetime:time',
} as const;

export const ARRAY_REDUCE_TRANSFORM_IDS = [
  BUILTIN_TRANSFORM_IDS.arrayFirst,
  BUILTIN_TRANSFORM_IDS.arrayJoin,
] as const;

export const STRING_FORMAT_TRANSFORM_IDS = [
  BUILTIN_TRANSFORM_IDS.stringTrim,
  BUILTIN_TRANSFORM_IDS.stringUpper,
  BUILTIN_TRANSFORM_IDS.stringLower,
  BUILTIN_TRANSFORM_IDS.stringPrefix,
  BUILTIN_TRANSFORM_IDS.stringSuffix,
] as const;

function asString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return typeof value === 'string' ? value : String(value);
}

export const builtinValueTransforms: readonly ValueTransformDefinition[] = [
  {
    id: BUILTIN_TRANSFORM_IDS.identity,
    label: 'Pass-through',
    description: 'Return the source value unchanged.',
    category: 'utility',
    inputTypes: [
      'string',
      'number',
      'boolean',
      'date',
      'time',
      'datetime',
      'object',
      'array',
      'unknown',
    ],
    outputType: 'unknown',
    apply: (value) => value,
  },
  {
    id: BUILTIN_TRANSFORM_IDS.arrayFirst,
    label: 'Array first',
    description: 'Return the first element of an array (or the value when not an array).',
    category: 'array',
    inputTypes: ['array', 'unknown'],
    outputType: 'unknown',
    apply: (value) => (Array.isArray(value) ? value[0] : value),
  },
  {
    id: BUILTIN_TRANSFORM_IDS.arrayJoin,
    label: 'Array join',
    description: 'Join array elements with a separator (default ", ").',
    category: 'array',
    inputTypes: ['array', 'unknown'],
    outputType: 'string',
    optionFields: [
      {
        key: 'separator',
        label: 'Separator',
        kind: 'string',
      },
    ],
    apply: (value, context) => {
      if (!Array.isArray(value)) {
        return asString(value);
      }
      const separator =
        typeof context.options?.separator === 'string' ? context.options.separator : ', ';
      return value.map((item) => asString(item)).join(separator);
    },
  },
  {
    id: BUILTIN_TRANSFORM_IDS.stringTrim,
    label: 'Trim',
    description: 'Trim leading and trailing whitespace.',
    category: 'string',
    inputTypes: ['string', 'number', 'unknown'],
    outputType: 'string',
    apply: (value) => asString(value).trim(),
  },
  {
    id: BUILTIN_TRANSFORM_IDS.stringUpper,
    label: 'Uppercase',
    description: 'Convert text to uppercase.',
    category: 'string',
    inputTypes: ['string', 'number', 'unknown'],
    outputType: 'string',
    apply: (value) => asString(value).toUpperCase(),
  },
  {
    id: BUILTIN_TRANSFORM_IDS.stringLower,
    label: 'Lowercase',
    description: 'Convert text to lowercase.',
    category: 'string',
    inputTypes: ['string', 'number', 'unknown'],
    outputType: 'string',
    apply: (value) => asString(value).toLowerCase(),
  },
  {
    id: BUILTIN_TRANSFORM_IDS.stringPrefix,
    label: 'Prefix',
    description: 'Prepend a fixed string.',
    category: 'string',
    inputTypes: ['string', 'number', 'unknown'],
    outputType: 'string',
    optionFields: [{ key: 'value', label: 'Prefix', kind: 'string' }],
    apply: (value, context) => {
      const prefix = typeof context.options?.value === 'string' ? context.options.value : '';
      return `${prefix}${asString(value)}`;
    },
  },
  {
    id: BUILTIN_TRANSFORM_IDS.stringSuffix,
    label: 'Suffix',
    description: 'Append a fixed string.',
    category: 'string',
    inputTypes: ['string', 'number', 'unknown'],
    outputType: 'string',
    optionFields: [{ key: 'value', label: 'Suffix', kind: 'string' }],
    apply: (value, context) => {
      const suffix = typeof context.options?.value === 'string' ? context.options.value : '';
      return `${asString(value)}${suffix}`;
    },
  },
  {
    id: BUILTIN_TRANSFORM_IDS.stringTemplate,
    label: 'Template',
    description: 'Fill {path} placeholders from an object (e.g. "{first} {last}").',
    category: 'string',
    inputTypes: ['object', 'unknown'],
    outputType: 'string',
    optionFields: [{ key: 'template', label: 'Template', kind: 'string' }],
    apply: (value, context) => {
      const template =
        typeof context.options?.template === 'string' ? context.options.template : '';
      if (!template) {
        return isPlainObject(value) ? JSON.stringify(value) : asString(value);
      }
      return applyStringTemplate(template, isPlainObject(value) ? value : undefined);
    },
  },
  {
    id: BUILTIN_TRANSFORM_IDS.dateReformat,
    label: 'Date reformat',
    description: 'Reformat a date string (token formats: YYYY, MM, DD).',
    category: 'date',
    inputTypes: ['string', 'unknown'],
    outputType: 'string',
    optionFields: [
      { key: 'inputFormat', label: 'Input format', kind: 'string' },
      { key: 'outputFormat', label: 'Output format', kind: 'string' },
    ],
    apply: (value, context) => {
      const inputFormat =
        typeof context.options?.inputFormat === 'string' ? context.options.inputFormat : 'YYYYMMDD';
      const outputFormat =
        typeof context.options?.outputFormat === 'string'
          ? context.options.outputFormat
          : 'YYYY-MM-DD';
      const text = asString(value);
      return reformatDateString(text, inputFormat, outputFormat) ?? text;
    },
  },
  {
    id: BUILTIN_TRANSFORM_IDS.datetimeCombine,
    label: 'Combine date+time',
    description: 'Join object fields into a datetime string (default keys: date, time).',
    category: 'date',
    inputTypes: ['object', 'unknown'],
    outputType: 'datetime',
    optionFields: [
      { key: 'dateKey', label: 'Date key', kind: 'string' },
      { key: 'timeKey', label: 'Time key', kind: 'string' },
      { key: 'separator', label: 'Separator', kind: 'string' },
    ],
    apply: (value, context) => {
      if (!isPlainObject(value)) {
        return asString(value);
      }
      const dateKey =
        typeof context.options?.dateKey === 'string' ? context.options.dateKey : 'date';
      const timeKey =
        typeof context.options?.timeKey === 'string' ? context.options.timeKey : 'time';
      const separator =
        typeof context.options?.separator === 'string' ? context.options.separator : 'T';
      return `${asString(value[dateKey])}${separator}${asString(value[timeKey])}`;
    },
  },
  {
    id: BUILTIN_TRANSFORM_IDS.datetimeDate,
    label: 'Date part',
    description: 'Take the date part from a datetime string.',
    category: 'date',
    inputTypes: ['string', 'datetime', 'unknown'],
    outputType: 'date',
    apply: (value) => splitDateTimeString(asString(value))?.date ?? asString(value),
  },
  {
    id: BUILTIN_TRANSFORM_IDS.datetimeTime,
    label: 'Time part',
    description: 'Take the time part from a datetime string.',
    category: 'date',
    inputTypes: ['string', 'datetime', 'unknown'],
    outputType: 'time',
    apply: (value) => splitDateTimeString(asString(value))?.time ?? '',
  },
];

export type CreateBuiltinValueTransformRegistryOptions = Record<string, never>;

/** Builtin registry. Hosts may `register()` additional transforms. */
export function createBuiltinValueTransformRegistry(
  _options?: CreateBuiltinValueTransformRegistryOptions,
) {
  return createValueTransformRegistry(builtinValueTransforms);
}

/** @deprecated Empty — kept for import stability while hosts migrate. */
export const TIME_FORMAT_TRANSFORM_IDS = [] as const;
/** @deprecated Empty — kept for import stability while hosts migrate. */
export const DATE_STYLE_TRANSFORM_IDS = [] as const;
