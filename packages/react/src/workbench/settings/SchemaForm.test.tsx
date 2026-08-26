/** @vitest-environment jsdom */

import { act, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  WorkbenchSchemaForm,
  coerceWorkbenchSchemaFormFieldValue,
  getWorkbenchSchemaFormErrors,
  getWorkbenchSchemaFormFieldDefaultValue,
  getWorkbenchSchemaFormFieldError,
  isWorkbenchSchemaFormSubmittable,
  normalizeWorkbenchSchemaFormValues,
  type WorkbenchSchemaFormField,
} from './SchemaForm';
import { WorkbenchSettingsCommitProvider } from './settingsCommit';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

async function renderSchemaForm(element: ReactElement) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(element);
  });

  return {
    container,
    rerender: async (nextElement: ReactElement) => {
      await act(async () => {
        root.render(nextElement);
      });
    },
    cleanup: async () => {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

function changeTextInput(input: HTMLInputElement, value: string) {
  const nativeValueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set;
  nativeValueSetter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

const fields: WorkbenchSchemaFormField[] = [
  {
    defaultValue: 'Workbench',
    description: 'Display name for this configuration.',
    id: 'displayName',
    label: 'Display name',
    required: true,
    type: 'text',
  },
  {
    defaultValue: 'comfortable',
    id: 'density',
    label: 'Density',
    options: [
      { label: 'Comfortable', value: 'comfortable' },
      { label: 'Compact', value: 'compact' },
    ],
    type: 'select',
  },
  {
    defaultValue: true,
    id: 'confirmActions',
    label: 'Confirm before side effects',
    type: 'checkbox',
  },
  {
    defaultValue: 10,
    id: 'maxItems',
    label: 'Maximum items',
    min: 1,
    type: 'number',
    validate: (value) =>
      typeof value === 'number' && value < 1 ? 'Use a value greater than zero.' : undefined,
  },
];

describe('WorkbenchSchemaForm helpers', () => {
  it('normalizes defaults and coerces field values', () => {
    expect(getWorkbenchSchemaFormFieldDefaultValue(fields[0])).toBe('Workbench');
    expect(
      getWorkbenchSchemaFormFieldDefaultValue({
        id: 'enabled',
        label: 'Enabled',
        type: 'checkbox',
      }),
    ).toBe(false);
    expect(coerceWorkbenchSchemaFormFieldValue(fields[3], '12')).toBe(12);
    expect(coerceWorkbenchSchemaFormFieldValue(fields[3], 'not-a-number')).toBe('');

    expect(
      normalizeWorkbenchSchemaFormValues(fields, {
        confirmActions: '',
        density: 'compact',
        maxItems: '8',
      }),
    ).toEqual({
      confirmActions: false,
      density: 'compact',
      displayName: 'Workbench',
      maxItems: 8,
    });
  });

  it('computes required and custom validation errors', () => {
    const values = normalizeWorkbenchSchemaFormValues(fields, {
      displayName: '',
      maxItems: 0,
    });

    expect(
      getWorkbenchSchemaFormFieldError({
        field: fields[0],
        value: values.displayName,
        values,
      }),
    ).toBe('This field is required.');
    expect(getWorkbenchSchemaFormErrors(fields, values)).toEqual({
      displayName: 'This field is required.',
      maxItems: 'Use a value greater than zero.',
    });
  });

  it('checks submittable state', () => {
    expect(isWorkbenchSchemaFormSubmittable({ errors: {} })).toBe(true);
    expect(isWorkbenchSchemaFormSubmittable({ disabled: true, errors: {} })).toBe(false);
    expect(isWorkbenchSchemaFormSubmittable({ errors: { displayName: 'Required' } })).toBe(false);
    expect(isWorkbenchSchemaFormSubmittable({ errors: {}, readOnly: true })).toBe(false);
  });
});

describe('WorkbenchSchemaForm rendering', () => {
  it('renders mixed field types and actions', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchSchemaForm
        fields={fields}
        values={{
          confirmActions: true,
          density: 'compact',
          displayName: 'Workbench Kit',
          maxItems: 20,
        }}
      />,
    );

    expect(markup).toContain('Display name');
    expect(markup).toContain('Density');
    expect(markup).toContain('Confirm before side effects');
    expect(markup).toContain('Maximum items');
    expect(markup).toContain('value="Workbench Kit"');
    expect(markup).toContain('type="number"');
    expect(markup).toContain('data-variant="primary"');
  });

  it('renders validation, disabled, read-only, and empty states', () => {
    const invalidMarkup = renderToStaticMarkup(
      <WorkbenchSchemaForm fields={fields} values={{ displayName: '', maxItems: 0 }} />,
    );
    const readOnlyMarkup = renderToStaticMarkup(
      <WorkbenchSchemaForm fields={fields} readOnly values={{ displayName: 'Read only' }} />,
    );
    const emptyMarkup = renderToStaticMarkup(<WorkbenchSchemaForm fields={[]} />);

    expect(invalidMarkup).toContain('This field is required.');
    expect(invalidMarkup).toContain('Use a value greater than zero.');
    expect(readOnlyMarkup).toContain('readOnly=""');
    expect(readOnlyMarkup).toContain('data-readonly="true"');
    expect(emptyMarkup).toContain('No settings fields');
  });

  it('associates invalid state and messages with every actual control target', async () => {
    const invalidFields: WorkbenchSchemaFormField[] = [
      {
        id: 'name',
        label: 'Name',
        type: 'text',
        validationMessage: 'Name is invalid.',
      },
      {
        id: 'count',
        label: 'Count',
        type: 'number',
        validationMessage: 'Count is invalid.',
      },
      {
        id: 'enabled',
        label: 'Enabled',
        type: 'checkbox',
        validationMessage: 'Enabled is invalid.',
      },
      {
        id: 'mode',
        label: 'Mode',
        options: [{ label: 'Automatic', value: 'automatic' }],
        type: 'select',
        validationMessage: 'Mode is invalid.',
      },
    ];
    const onSubmit = vi.fn();
    const rendered = await renderSchemaForm(
      <WorkbenchSchemaForm fields={invalidFields} onSubmit={onSubmit} />,
    );

    try {
      const targets = [
        rendered.container.querySelector<HTMLElement>('[data-field-id="name"] input'),
        rendered.container.querySelector<HTMLElement>('[data-field-id="count"] input'),
        rendered.container.querySelector<HTMLElement>('[data-field-id="enabled"] input'),
        rendered.container.querySelector<HTMLElement>('[data-field-id="mode"] [role="combobox"]'),
      ];

      for (const target of targets) {
        expect(target).not.toBeNull();
        expect(target?.id).not.toBe('');
        expect(target?.getAttribute('aria-invalid')).toBe('true');

        const errorId = target?.getAttribute('aria-describedby');
        expect(errorId).toBeTruthy();
        expect(errorId ? document.getElementById(errorId)?.getAttribute('role') : null).toBe(
          'alert',
        );
      }

      const submit = rendered.container.querySelector<HTMLButtonElement>('button[type="submit"]');
      expect(submit?.disabled).toBe(true);

      targets[0]?.focus();
      await act(async () => {
        rendered.container
          .querySelector('form')
          ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });

      expect(document.activeElement).toBe(targets[0]);
      expect(onSubmit).not.toHaveBeenCalled();
    } finally {
      await rendered.cleanup();
    }
  });

  it('focuses the first eligible renderably invalid field in declaration order', async () => {
    const orderedFields: WorkbenchSchemaFormField[] = [
      {
        disabled: true,
        id: 'disabled',
        label: 'Disabled',
        type: 'text',
      },
      {
        id: 'readonly',
        label: 'Read only',
        readOnly: true,
        type: 'number',
      },
      {
        id: 'nonRenderable',
        label: 'Non-renderable',
        type: 'checkbox',
      },
      {
        id: 'mode',
        label: 'Mode',
        options: [{ label: 'Automatic', value: 'automatic' }],
        type: 'select',
      },
      {
        id: 'last',
        label: 'Last',
        type: 'text',
      },
    ];
    const onSubmit = vi.fn();
    const rendered = await renderSchemaForm(
      <WorkbenchSchemaForm
        focusFirstInvalidFieldOnSubmit
        errors={{
          unknown: 'Unknown error',
          last: 'Last error',
          nonRenderable: null,
          mode: 'Mode error',
          readonly: 'Read-only error',
          disabled: 'Disabled error',
        }}
        fields={orderedFields}
        onSubmit={onSubmit}
      />,
    );

    try {
      const submit = rendered.container.querySelector<HTMLButtonElement>('button[type="submit"]');
      const mode = rendered.container.querySelector<HTMLElement>(
        '[data-field-id="mode"] [role="combobox"]',
      );
      expect(submit?.disabled).toBe(false);

      await act(async () => {
        submit?.click();
      });

      expect(document.activeElement).toBe(mode);
      expect(onSubmit).not.toHaveBeenCalled();
    } finally {
      await rendered.cleanup();
    }
  });

  it('keeps key-based blocking while skipping non-renderable focus candidates', async () => {
    const onSubmit = vi.fn();
    const rendered = await renderSchemaForm(
      <WorkbenchSchemaForm
        focusFirstInvalidFieldOnSubmit
        errors={{ name: null }}
        fields={[{ id: 'name', label: 'Name', type: 'text' }]}
        onSubmit={onSubmit}
      />,
    );

    try {
      const input = rendered.container.querySelector<HTMLInputElement>('input');
      const submit = rendered.container.querySelector<HTMLButtonElement>('button[type="submit"]');
      input?.focus();

      await act(async () => {
        submit?.click();
      });

      expect(document.activeElement).toBe(input);
      expect(onSubmit).not.toHaveBeenCalled();
    } finally {
      await rendered.cleanup();
    }
  });

  it('submits exactly once after controlled errors are repaired', async () => {
    const requiredFields: WorkbenchSchemaFormField[] = [
      { id: 'name', label: 'Name', required: true, type: 'text' },
    ];
    const onSubmit = vi.fn();
    const rendered = await renderSchemaForm(
      <WorkbenchSchemaForm
        focusFirstInvalidFieldOnSubmit
        fields={requiredFields}
        values={{ name: '' }}
        onSubmit={onSubmit}
      />,
    );

    try {
      const invalidSubmit =
        rendered.container.querySelector<HTMLButtonElement>('button[type="submit"]');
      await act(async () => {
        invalidSubmit?.click();
      });
      expect(onSubmit).not.toHaveBeenCalled();

      await rendered.rerender(
        <WorkbenchSchemaForm
          focusFirstInvalidFieldOnSubmit
          fields={requiredFields}
          values={{ name: 'Ready' }}
          onSubmit={onSubmit}
        />,
      );

      const validSubmit =
        rendered.container.querySelector<HTMLButtonElement>('button[type="submit"]');
      await act(async () => {
        validSubmit?.click();
      });

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith(
        { name: 'Ready' },
        expect.objectContaining({ values: { name: 'Ready' } }),
      );
    } finally {
      await rendered.cleanup();
    }
  });

  it('updates uncontrolled values and gives Cancel the current snapshot', async () => {
    const onCancel = vi.fn();
    const onSubmit = vi.fn();
    const onValuesChange = vi.fn();
    const rendered = await renderSchemaForm(
      <WorkbenchSchemaForm
        defaultValues={{ name: 'Initial' }}
        fields={[{ id: 'name', label: 'Name', type: 'text' }]}
        onCancel={onCancel}
        onSubmit={onSubmit}
        onValuesChange={onValuesChange}
      />,
    );

    try {
      const input = rendered.container.querySelector<HTMLInputElement>('input');
      const cancel = Array.from(rendered.container.querySelectorAll('button')).find(
        (button) => button.textContent === 'Cancel',
      );

      await act(async () => {
        if (input) {
          changeTextInput(input, 'Updated');
        }
      });

      expect(onValuesChange).toHaveBeenCalledTimes(1);
      expect(onValuesChange.mock.calls[0]?.[0]).toEqual({ name: 'Updated' });

      await act(async () => {
        cancel?.click();
      });

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onCancel).toHaveBeenCalledWith({ values: { name: 'Updated' } });
      expect(onSubmit).not.toHaveBeenCalled();
    } finally {
      await rendered.cleanup();
    }
  });

  it('keeps immediate commit actionless and emits one preference change', async () => {
    const preferenceChanges: unknown[] = [];
    const rendered = await renderSchemaForm(
      <WorkbenchSettingsCommitProvider
        value={{
          categoryId: 'appearance',
          commitMode: 'immediate',
          onPreferenceChange: (change) => preferenceChanges.push(change),
          scopeId: 'user',
        }}
      >
        <WorkbenchSchemaForm
          defaultValues={{ name: 'Initial' }}
          fields={[{ id: 'name', label: 'Name', type: 'text' }]}
          showActions
        />
      </WorkbenchSettingsCommitProvider>,
    );

    try {
      expect(rendered.container.querySelector('.ui-workbench-schema-form__actions')).toBeNull();
      const input = rendered.container.querySelector<HTMLInputElement>('input');

      await act(async () => {
        if (input) {
          changeTextInput(input, 'Updated');
        }
      });

      expect(preferenceChanges).toEqual([
        {
          categoryId: 'appearance',
          key: 'name',
          scopeId: 'user',
          value: 'Updated',
        },
      ]);
    } finally {
      await rendered.cleanup();
    }
  });

  it('uses the native submit event path for an Enter-equivalent invalid attempt', async () => {
    const onSubmit = vi.fn();
    const rendered = await renderSchemaForm(
      <WorkbenchSchemaForm
        focusFirstInvalidFieldOnSubmit
        fields={[
          { id: 'first', label: 'First', required: true, type: 'text' },
          { id: 'second', label: 'Second', required: true, type: 'number' },
        ]}
        onSubmit={onSubmit}
      />,
    );

    try {
      const form = rendered.container.querySelector('form');
      const first = rendered.container.querySelector<HTMLInputElement>(
        '[data-field-id="first"] input',
      );
      const second = rendered.container.querySelector<HTMLInputElement>(
        '[data-field-id="second"] input',
      );
      second?.focus();

      await act(async () => {
        form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });

      expect(document.activeElement).toBe(first);
      expect(onSubmit).not.toHaveBeenCalled();
    } finally {
      await rendered.cleanup();
    }
  });

  it('does not add a submitter when actions are hidden', async () => {
    const rendered = await renderSchemaForm(
      <WorkbenchSchemaForm
        focusFirstInvalidFieldOnSubmit
        fields={[{ id: 'name', label: 'Name', required: true, type: 'text' }]}
        showActions={false}
      />,
    );

    try {
      expect(rendered.container.querySelector('button[type="submit"]')).toBeNull();
    } finally {
      await rendered.cleanup();
    }
  });
});
