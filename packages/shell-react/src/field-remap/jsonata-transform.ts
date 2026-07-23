import jsonata from 'jsonata';
import type { ValueTransformDefinition } from '@workbench-kit/field-remap';

/** Host-registered JSONata expression transform (Stedi-style advanced mapping). */
export const JSONATA_TRANSFORM_ID = 'expr:jsonata' as const;

export const jsonataValueTransform: ValueTransformDefinition = {
  id: JSONATA_TRANSFORM_ID,
  label: 'JSONata expression',
  description: 'Evaluate a JSONata expression against the source value (host-registered).',
  category: 'expression',
  inputTypes: ['string', 'number', 'boolean', 'object', 'array', 'unknown'],
  outputType: 'unknown',
  optionFields: [
    {
      key: 'expression',
      label: 'Expression',
      kind: 'string',
    },
  ],
  apply: async (value, context) => {
    const expression =
      typeof context.options?.expression === 'string' ? context.options.expression.trim() : '';
    if (!expression) {
      return value;
    }
    try {
      const compiled = jsonata(expression);
      // jsonata@2.x evaluate returns a Promise (1.x was synchronous).
      return await compiled.evaluate(value);
    } catch {
      return value;
    }
  },
};
