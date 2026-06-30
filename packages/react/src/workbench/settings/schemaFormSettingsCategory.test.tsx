import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { createWorkbenchSchemaFormSettingsCategory } from './schemaFormSettingsCategory';
import type { WorkbenchSchemaFormFieldChangeContext } from './SchemaForm';

describe('createWorkbenchSchemaFormSettingsCategory', () => {
  it('wraps schema form fields as settings category content', () => {
    const changes: WorkbenchSchemaFormFieldChangeContext[] = [];
    const category = createWorkbenchSchemaFormSettingsCategory({
      fields: [
        {
          defaultValue: true,
          id: 'autoOpen',
          label: 'Auto open',
          type: 'checkbox',
        },
      ],
      formProps: {
        onFieldChange: (context) => changes.push(context),
        showActions: false,
        values: { autoOpen: false },
      },
      id: 'general',
      label: 'General',
      title: 'General settings',
    });

    const markup = renderToStaticMarkup(<>{category.content}</>);

    expect(category).toMatchObject({
      id: 'general',
      label: 'General',
      title: 'General settings',
    });
    expect(markup).toContain('ui-workbench-schema-form');
    expect(markup).toContain('Auto open');
    expect(markup).not.toContain('Save');
    expect(changes).toEqual([]);
  });
});
