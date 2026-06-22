import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { EditorTabs, IconButton } from '@workbench-kit/react/primitives';
import { StoryWorkbenchShellFrame } from '@workbench-kit/react/workbench';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import {
  DEFAULT_EDITOR_PANE_VISIBILITY,
  getVisibleEditorPaneKinds,
  sanitizeEditorPaneVisibility,
  toggleEditorPaneVisibility,
  type EditorPaneKind,
  type EditorPaneVisibility,
} from './editor-pane-visibility.js';
import './editor-area.css';

const meta = {
  title: 'Shell React/Editor',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Editor pane visibility toolbar (Code / Form / Preview) composed with EditorTabs — mirrors shell editor-area toggle behavior without a live workspace.',
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function EditorPaneToggleToolbar({
  formEligible,
  onTogglePane,
  previewEligible,
  visibility,
}: {
  formEligible: boolean;
  onTogglePane: (pane: EditorPaneKind) => void;
  previewEligible: boolean;
  visibility: EditorPaneVisibility;
}) {
  return (
    <div
      aria-label="Editor view mode"
      className="workbench-editor-area__view-toolbar"
      role="toolbar"
    >
      <IconButton
        aria-pressed={visibility.code}
        className={[
          'workbench-editor-area__view-button',
          visibility.code && 'workbench-editor-area__view-button--active',
        ]
          .filter(Boolean)
          .join(' ')}
        compact
        icon="codicon-code"
        label="Code"
        onClick={() => onTogglePane('code')}
      />
      {formEligible ? (
        <IconButton
          aria-pressed={visibility.form}
          className={[
            'workbench-editor-area__view-button',
            visibility.form && 'workbench-editor-area__view-button--active',
          ]
            .filter(Boolean)
            .join(' ')}
          compact
          icon="codicon-symbol-field"
          label="Form"
          onClick={() => onTogglePane('form')}
        />
      ) : null}
      {previewEligible ? (
        <IconButton
          aria-pressed={visibility.preview}
          className={[
            'workbench-editor-area__view-button',
            visibility.preview && 'workbench-editor-area__view-button--active',
          ]
            .filter(Boolean)
            .join(' ')}
          compact
          icon="codicon-preview"
          label="Preview"
          onClick={() => onTogglePane('preview')}
        />
      ) : null}
    </div>
  );
}

function EditorPaneTogglesHarness() {
  const [visibility, setVisibility] = useState<EditorPaneVisibility>(DEFAULT_EDITOR_PANE_VISIBILITY);
  const visiblePanes = useMemo(() => getVisibleEditorPaneKinds(visibility).join(', '), [visibility]);

  const handleTogglePane = (pane: EditorPaneKind) => {
    setVisibility((current) =>
      sanitizeEditorPaneVisibility(toggleEditorPaneVisibility(current, pane), {
        formEligible: true,
        previewEligible: true,
      }),
    );
  };

  return (
    <StoryWorkbenchShellFrame variant="editor">
      <EditorTabs
        activeId="readme"
        addons={
          <EditorPaneToggleToolbar
            formEligible
            previewEligible
            visibility={visibility}
            onTogglePane={handleTogglePane}
          />
        }
        aria-label="Open workspace files"
        tabs={[
          {
            id: 'readme',
            label: 'README.md',
            fileIconKind: 'markdown',
          },
        ]}
        onSelect={() => undefined}
      />
      <div
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: `repeat(${Math.max(getVisibleEditorPaneKinds(visibility).length, 1)}, minmax(0, 1fr))`,
          minHeight: 0,
          padding: 16,
        }}
      >
        {visibility.code ? (
          <section aria-label="Code pane" style={{ border: '1px solid var(--color-border)', padding: 12 }}>
            Code editor surface
          </section>
        ) : null}
        {visibility.form ? (
          <section aria-label="Form pane" style={{ border: '1px solid var(--color-border)', padding: 12 }}>
            Structured form surface
          </section>
        ) : null}
        {visibility.preview ? (
          <section
            aria-label="Preview pane"
            style={{ border: '1px solid var(--color-border)', padding: 12 }}
          >
            Preview surface
          </section>
        ) : null}
      </div>
      <div
        aria-label="Editor pane visibility"
        role="status"
        style={{ borderTop: '1px solid var(--color-border)', fontSize: 12, padding: 8 }}
      >
        visible={visiblePanes}
      </div>
    </StoryWorkbenchShellFrame>
  );
}

export const PaneToggleFlow: Story = {
  name: 'Editor / Pane toggles',
  render: () => <EditorPaneTogglesHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toolbar = canvas.getByRole('toolbar', { name: 'Editor view mode' });
    const visibilityLog = canvas.getByLabelText('Editor pane visibility');

    await expect(canvas.getByRole('tab', { name: 'README.md' })).toBeVisible();
    await expect(within(toolbar).getByRole('button', { name: 'Code' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(visibilityLog).toHaveTextContent('visible=code');

    await userEvent.click(within(toolbar).getByRole('button', { name: 'Form' }));
    await expect(within(toolbar).getByRole('button', { name: 'Form' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(canvas.getByLabelText('Form pane')).toBeVisible();
    await expect(visibilityLog).toHaveTextContent('visible=code, form');

    await userEvent.click(within(toolbar).getByRole('button', { name: 'Preview' }));
    await expect(canvas.getByLabelText('Preview pane')).toBeVisible();
    await expect(visibilityLog).toHaveTextContent('visible=code, form, preview');

    await userEvent.click(within(toolbar).getByRole('button', { name: 'Code' }));
    await expect(within(toolbar).getByRole('button', { name: 'Code' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await expect(canvas.queryByLabelText('Code pane')).toBeNull();
    await expect(visibilityLog).toHaveTextContent('visible=form, preview');

    await userEvent.click(within(toolbar).getByRole('button', { name: 'Form' }));
    await waitFor(() => expect(visibilityLog).toHaveTextContent('visible=preview'));

    await userEvent.click(within(toolbar).getByRole('button', { name: 'Preview' }));
    await expect(visibilityLog).toHaveTextContent('visible=preview');
    await expect(within(toolbar).getByRole('button', { name: 'Preview' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  },
  tags: ['storybook-play-baseline', 'storybook-play-required'],
};
