import { useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { ContextMenu } from './ContextMenu';

function ContextFocusHarness() {
  const [open, setOpen] = useState(false);
  const [closed, setClosed] = useState(0);
  const invoker = useRef<HTMLButtonElement>(null);
  const editor = useRef<HTMLInputElement>(null);
  return (
    <div style={{ padding: 24 }}>
      <button ref={invoker} type="button" onClick={() => setOpen(true)}>
        Open actions
      </button>
      {open ? (
        <ContextMenu
          ariaLabel="Editing actions"
          x={24}
          y={70}
          returnFocusTarget={invoker.current}
          items={[{ id: 'edit', label: 'Edit value', onSelect: () => editor.current?.focus() }]}
          onClose={() => {
            setClosed((count) => count + 1);
            setOpen(false);
          }}
        />
      ) : null}
      <label>
        Value <input ref={editor} defaultValue="Draft" />
      </label>
      <output aria-label="Close count">{closed}</output>
    </div>
  );
}

const meta = {
  title: 'Atomic UI/Overlay/Context editing',
  tags: ['storybook-play-required', 'storybook-play-context-editing'],
  render: () => <ContextFocusHarness />,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const KeyboardExitAndEditFocus: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const open = canvas.getByRole('button', { name: 'Open actions' });
    const value = canvas.getByLabelText('Value');
    await userEvent.click(open);
    await expect(await canvas.findByRole('menuitem', { name: 'Edit value' })).toHaveFocus();
    await userEvent.tab();
    await expect(value).toHaveFocus();
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
    await expect(canvas.getByLabelText('Close count')).toHaveTextContent('1');

    await userEvent.click(open);
    await expect(await canvas.findByRole('menuitem', { name: 'Edit value' })).toHaveFocus();
    await userEvent.tab({ shift: true });
    await expect(open).toHaveFocus();
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
    await expect(canvas.getByLabelText('Close count')).toHaveTextContent('2');

    await userEvent.click(open);
    await userEvent.click(await canvas.findByRole('menuitem', { name: 'Edit value' }));
    await expect(value).toHaveFocus();
    await expect(canvas.getByLabelText('Close count')).toHaveTextContent('3');

    await userEvent.click(open);
    await expect(await canvas.findByRole('menuitem', { name: 'Edit value' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect(open).toHaveFocus();
    await expect(canvas.getByLabelText('Close count')).toHaveTextContent('4');
  },
};
