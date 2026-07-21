/** @vitest-environment jsdom */

import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { WorkbenchSchemaForm } from './SchemaForm';
import { useWorkbenchSettingsCommit } from './settingsCommit';
import type { WorkbenchSettingsPreferenceChange } from './settingsCommit';
import { WorkbenchSettingsModal } from './WorkbenchSettingsModal';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

function ImmediateCommitProbe() {
  const commit = useWorkbenchSettingsCommit();

  return (
    <button
      type="button"
      onClick={() => {
        commit?.onPreferenceChange?.({
          categoryId: commit.categoryId,
          key: 'theme',
          scopeId: commit.scopeId || undefined,
          value: 'dark',
        });
      }}
    >
      Commit theme
    </button>
  );
}

describe('WorkbenchSettingsModal', () => {
  it('renders settings as a movable maximizable modal window', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchSettingsModal
        categories={[
          {
            content: <p>Appearance controls</p>,
            id: 'appearance',
            label: 'Appearance',
          },
        ]}
        title="Settings"
        onClose={() => undefined}
      />,
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('ui-modal__titlebar-drag');
    expect(markup).toContain('aria-label="Maximize modal"');
    expect(markup).toContain(
      'ui-scroll-area ui-workbench-scrollbar ui-scroll-area--vertical ui-workbench-navigation-panel__nav-scroll',
    );
    expect(markup).toContain(
      'ui-scroll-area ui-workbench-scrollbar ui-scroll-area--vertical ui-workbench-navigation-panel__content-scroll',
    );
    expect(markup).not.toContain('ui-scroll-area--stable-gutter');
    expect(markup).toContain('Appearance controls');
  });

  it('keeps the host footer in explicit commit mode by default', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchSettingsModal
        categories={[
          {
            content: <p>Appearance controls</p>,
            id: 'appearance',
            label: 'Appearance',
          },
        ]}
        footer={
          <>
            <button type="button">Cancel</button>
            <button type="submit">Apply</button>
          </>
        }
        title="Settings"
        onClose={() => undefined}
      />,
    );

    expect(markup).toContain('ui-modal__footer');
    expect(markup).toContain('Cancel');
    expect(markup).toContain('Apply');
  });

  it('hides the footer in immediate commit mode', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchSettingsModal
        categories={[
          {
            content: <p>Appearance controls</p>,
            id: 'appearance',
            label: 'Appearance',
          },
        ]}
        commitMode="immediate"
        footer={
          <>
            <button type="button">Cancel</button>
            <button type="submit">Apply</button>
          </>
        }
        title="Settings"
        onClose={() => undefined}
      />,
    );

    expect(markup).not.toContain('ui-modal__footer');
    expect(markup).not.toContain('Cancel');
    expect(markup).not.toContain('Apply');
  });

  it('forwards immediate preference commits through onPreferenceChange', async () => {
    const changes: WorkbenchSettingsPreferenceChange[] = [];
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(
          <WorkbenchSettingsModal
            categories={[
              {
                content: <ImmediateCommitProbe />,
                id: 'appearance',
                label: 'Appearance',
              },
            ]}
            commitMode="immediate"
            scopes={[{ id: 'user', label: 'User' }]}
            title="Settings"
            onClose={() => undefined}
            onPreferenceChange={(change) => {
              changes.push(change);
            }}
          />,
        );
      });

      const button = Array.from(container.querySelectorAll('button')).find((candidate) =>
        candidate.textContent?.includes('Commit theme'),
      );
      expect(button).toBeTruthy();

      await act(async () => {
        button?.click();
      });

      expect(changes).toEqual([
        {
          categoryId: 'appearance',
          key: 'theme',
          scopeId: 'user',
          value: 'dark',
        },
      ]);
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });

  it('hides schema form actions and emits field changes in immediate mode', async () => {
    const changes: WorkbenchSettingsPreferenceChange[] = [];
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    function ImmediateSchemaForm() {
      const [values, setValues] = useState<Record<string, string | boolean | number>>({
        compactRows: false,
      });

      return (
        <WorkbenchSchemaForm
          fields={[
            {
              id: 'compactRows',
              label: 'Compact rows',
              type: 'checkbox',
            },
          ]}
          showActions
          values={values}
          onValuesChange={(nextValues) => {
            setValues(nextValues);
          }}
        />
      );
    }

    try {
      await act(async () => {
        root.render(
          <WorkbenchSettingsModal
            categories={[
              {
                content: <ImmediateSchemaForm />,
                id: 'appearance',
                label: 'Appearance',
              },
            ]}
            commitMode="immediate"
            title="Settings"
            onClose={() => undefined}
            onPreferenceChange={(change) => {
              changes.push(change);
            }}
          />,
        );
      });

      expect(container.querySelector('.ui-workbench-schema-form__actions')).toBeNull();

      const checkbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
      expect(checkbox).not.toBeNull();

      await act(async () => {
        checkbox?.click();
      });

      expect(changes).toEqual([
        {
          categoryId: 'appearance',
          key: 'compactRows',
          value: true,
        },
      ]);
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });
});
