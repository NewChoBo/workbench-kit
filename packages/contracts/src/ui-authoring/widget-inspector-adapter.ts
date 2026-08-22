import type { WidgetInspectorField } from '../widget/registry-contract';
import type { UiPropertyDescriptor, UiValueType, WidgetInspectorScalarValue } from './types';

function inspectorValueType(field: WidgetInspectorField): UiValueType {
  switch (field.kind) {
    case 'text':
      return 'string';
    case 'color':
      return 'color';
    case 'number':
      return 'number';
    case 'select':
      return 'enum';
    case 'boolean':
      return 'boolean';
  }
}

function inspectorConstraints(
  field: WidgetInspectorField,
): Readonly<Record<string, unknown>> | undefined {
  switch (field.kind) {
    case 'number': {
      const constraints = {
        ...(field.min === undefined ? {} : { min: field.min }),
        ...(field.max === undefined ? {} : { max: field.max }),
        ...(field.step === undefined ? {} : { step: field.step }),
      };
      return Object.keys(constraints).length === 0 ? undefined : Object.freeze(constraints);
    }
    case 'select':
      return Object.freeze({
        options: Object.freeze(field.options.map((option) => Object.freeze({ ...option }))),
      });
    default:
      return undefined;
  }
}

function inspectorEditorMetadata(
  field: WidgetInspectorField,
): Readonly<Record<string, unknown>> | undefined {
  if ((field.kind === 'text' || field.kind === 'color') && field.placeholder !== undefined) {
    return Object.freeze({ placeholder: field.placeholder });
  }
  return undefined;
}

export function widgetInspectorFieldToUiPropertyDescriptor(
  field: WidgetInspectorField,
): UiPropertyDescriptor<WidgetInspectorScalarValue> {
  const constraints = inspectorConstraints(field);
  const metadata = inspectorEditorMetadata(field);

  return {
    id: field.prop,
    label: field.label,
    value: {
      type: inspectorValueType(field),
      ...(constraints === undefined ? {} : { constraints }),
      editor: {
        id: field.kind,
        ...(metadata === undefined ? {} : { metadata }),
      },
    },
  };
}
