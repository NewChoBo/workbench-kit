import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  WorkbenchSchemaForm,
  type WorkbenchSchemaFormField,
} from '@workbench-kit/react/workbench/settings';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

const focusRecoveryFields = [
  {
    defaultValue: 'Unavailable',
    disabled: true,
    id: 'disabled-name',
    label: 'Disabled name',
    type: 'text',
    validate: (_value, values) =>
      values.confirmation === true ? undefined : 'Disabled invalid field.',
  },
  {
    defaultValue: 1,
    id: 'read-only-count',
    label: 'Read-only count',
    readOnly: true,
    type: 'number',
    validate: (_value, values) =>
      values.confirmation === true ? undefined : 'Read-only invalid field.',
  },
  {
    id: 'confirmation',
    label: 'Confirm recovery',
    required: true,
    type: 'checkbox',
  },
  {
    id: 'display-name',
    label: 'Display name',
    required: true,
    type: 'text',
  },
  {
    id: 'retry-count',
    label: 'Retry count',
    required: true,
    type: 'number',
  },
] satisfies readonly WorkbenchSchemaFormField[];

function SchemaFormFocusRecoveryFixture() {
  const [submitCount, setSubmitCount] = useState(0);

  return (
    <section aria-labelledby="schema-form-focus-recovery-title">
      <h2 id="schema-form-focus-recovery-title">Invalid submit focus recovery</h2>
      <WorkbenchSchemaForm
        focusFirstInvalidFieldOnSubmit
        fields={focusRecoveryFields}
        onSubmit={() => setSubmitCount((count) => count + 1)}
      />
      <output data-testid="schema-form-submission-count">Submissions: {submitCount}</output>
    </section>
  );
}

const meta = {
  title: 'Workbench Sample/Schema Form',
  component: SchemaFormFocusRecoveryFixture,
  parameters: {
    layout: 'padded',
  },
  tags: ['storybook-play-required', 'storybook-play-sample'],
} satisfies Meta<typeof SchemaFormFocusRecoveryFixture>;

export default meta;

type Story = StoryObj<typeof meta>;

export const InvalidSubmitFocusRecovery: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const submitCount = canvas.getByTestId('schema-form-submission-count');
    const disabledName = canvas.getByRole('textbox', { name: 'Disabled name' });
    const readOnlyCount = canvas.getByRole('spinbutton', { name: 'Read-only count' });
    const confirmation = canvas.getByRole('checkbox', { name: 'Confirm recovery' });
    const displayName = canvas.getByRole('textbox', { name: 'Display name' });
    const retryCount = canvas.getByRole('spinbutton', { name: 'Retry count' });
    const save = canvas.getByRole('button', { name: 'Save' });

    await expect(disabledName).toBeDisabled();
    await expect(disabledName).toHaveAttribute('aria-invalid', 'true');
    await expect(readOnlyCount).toHaveAttribute('readonly');
    await expect(readOnlyCount).toHaveAttribute('aria-invalid', 'true');
    await expect(save).toBeEnabled();
    await expect(submitCount).toHaveTextContent('Submissions: 0');

    await userEvent.click(save);

    await expect(confirmation).toHaveFocus();
    await expect(confirmation).toHaveAttribute('aria-invalid', 'true');
    const confirmationId = confirmation.id;
    const confirmationErrorId = confirmation.getAttribute('aria-describedby');
    expect(confirmationId).not.toBe('');
    expect(confirmationErrorId).not.toBeNull();
    const confirmationError = confirmation.ownerDocument.getElementById(confirmationErrorId!);
    expect(confirmationError).not.toBeNull();
    expect(canvasElement).toContainElement(confirmationError);
    await expect(confirmationError!).toHaveTextContent('This field is required.');
    await expect(submitCount).toHaveTextContent('Submissions: 0');

    await userEvent.click(confirmation);
    await waitFor(() => {
      expect(confirmation).not.toHaveAttribute('aria-invalid');
      expect(confirmation).not.toHaveAttribute('aria-describedby');
      expect(confirmation.id).toBe(confirmationId);
      expect(disabledName).not.toHaveAttribute('aria-invalid');
      expect(readOnlyCount).not.toHaveAttribute('aria-invalid');
    });

    await userEvent.click(retryCount);
    await userEvent.keyboard('{Enter}');

    await expect(displayName).toHaveFocus();
    await expect(displayName).toHaveAttribute('aria-invalid', 'true');
    await expect(submitCount).toHaveTextContent('Submissions: 0');

    await userEvent.type(displayName, 'Workbench');
    await userEvent.keyboard('{Enter}');

    await expect(retryCount).toHaveFocus();
    await expect(retryCount).toHaveAttribute('aria-invalid', 'true');
    await expect(submitCount).toHaveTextContent('Submissions: 0');

    await userEvent.type(retryCount, '3');
    await userEvent.keyboard('{Enter}');

    await waitFor(() => expect(submitCount).toHaveTextContent('Submissions: 1'));
  },
};
