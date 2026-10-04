import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import {
  createKitJdwRegistry,
  KIT_JDW_PRIMITIVES_SAMPLE,
  renderJdwNode,
  type KitJdwActionState,
  type KitJdwHostPort,
  type KitJdwHostSnapshot,
} from '@workbench-kit/react/jdw';
import { Button } from '@workbench-kit/react/primitives';
import './host.css';

// Sample-owned, in-memory capabilities. The JSON contains none of these URLs/callbacks.
const sampleImage = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="#516080"/><circle cx="60" cy="40" r="22" fill="#c8d7f0"/></svg>')}`;

function createSampleCapabilities(onAction: (key: string) => void) {
  const listeners = new Set<() => void>();
  let snapshot: KitJdwHostSnapshot = Object.freeze({ mode: 'live', contextKey: {} });
  let state: KitJdwActionState = 'ready';
  let hasMedia = true;
  const emit = () => {
    snapshot = Object.freeze({ ...snapshot });
    listeners.forEach((listener) => listener());
  };
  const host: KitJdwHostPort = {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getAction: (key, contextKey) => {
      if (contextKey !== snapshot.contextKey || !['open', 'more'].includes(key)) return undefined;
      return {
        state,
        run: () => {
          // This host remains the final authority, including the synchronous busy claim.
          if (contextKey !== snapshot.contextKey || snapshot.mode !== 'live' || state !== 'ready')
            return;
          state = 'busy';
          emit();
          onAction(key);
        },
      };
    },
    resolveMedia: (key, contextKey) =>
      contextKey === snapshot.contextKey && key === 'cover' && hasMedia
        ? { imageUrl: sampleImage }
        : undefined,
  };
  return {
    host,
    setMode(mode: KitJdwHostSnapshot['mode']) {
      snapshot = Object.freeze({ ...snapshot, mode });
      emit();
    },
    setActionState(next: KitJdwActionState) {
      state = next;
      emit();
    },
    setMedia(available: boolean) {
      hasMedia = available;
      emit();
    },
    replaceContext() {
      snapshot = Object.freeze({ ...snapshot, contextKey: {} });
      state = 'ready';
      emit();
    },
  };
}

function KitJdwPrimitivesLab() {
  const [actions, setActions] = useState<readonly string[]>([]);
  const [record, setRecord] = useState(1);
  const [media, setMedia] = useState(true);
  const [preview, setPreview] = useState(false);
  const capabilities = useMemo(
    () => createSampleCapabilities((key) => setActions((old) => [...old, key])),
    [],
  );
  const registry = useMemo(() => createKitJdwRegistry({ host: capabilities.host }), [capabilities]);
  return (
    <section aria-label="Kit JSON primitives sample" style={{ padding: 16, maxWidth: 760 }}>
      <h2>JSON-composed Kit primitives</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button
          onClick={() => {
            capabilities.setMode(preview ? 'live' : 'preview');
            setPreview(!preview);
          }}
        >
          {preview ? 'Use live mode' : 'Use preview mode'}
        </Button>
        <Button onClick={() => capabilities.setActionState('ready')}>Make ready</Button>
        <Button onClick={() => capabilities.setActionState('busy')}>Make busy</Button>
        <Button onClick={() => capabilities.setActionState('denied')}>Deny action</Button>
        <Button
          onClick={() => {
            capabilities.setMedia(!media);
            setMedia(!media);
          }}
        >
          {media ? 'Revoke image' : 'Restore image'}
        </Button>
        <Button
          onClick={() => {
            capabilities.replaceContext();
            setRecord((value) => value + 1);
          }}
        >
          Replace record
        </Button>
      </div>
      <div aria-label="Rendered JSON" style={{ marginTop: 16 }}>
        {renderJdwNode(KIT_JDW_PRIMITIVES_SAMPLE, {
          registry,
          layoutConstraints: { minWidth: 0, maxWidth: 240, minHeight: 0, maxHeight: 280 },
          values: { record: { title: `Sample record ${record}`, status: 'Available' } },
        })}
      </div>
      <p role="status">Actions: {actions.length === 0 ? 'none' : actions.join(', ')}</p>
      <details>
        <summary>View JSON</summary>
        <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
          {JSON.stringify(KIT_JDW_PRIMITIVES_SAMPLE, null, 2)}
        </pre>
      </details>
    </section>
  );
}

const meta = {
  title: 'JDW/Kit Primitives',
  component: KitJdwPrimitivesLab,
  tags: ['storybook-play-baseline'],
  parameters: { storybookGrid: { enabled: false } },
} satisfies Meta<typeof KitJdwPrimitivesLab>;
export default meta;
type Story = StoryObj<typeof meta>;

export const CapabilityBoundaries: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const open = canvas.getByRole('button', { name: 'Open details' });
    const more = canvas.getByRole('button', { name: 'More actions' });
    open.focus();
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByRole('status')).toHaveTextContent('Actions: open');
    await expect(open).toBeDisabled();
    await userEvent.click(canvas.getByRole('button', { name: 'Make ready' }));
    more.focus();
    await userEvent.keyboard(' ');
    await expect(canvas.getByRole('status')).toHaveTextContent('Actions: open, more');
    await userEvent.click(canvas.getByRole('button', { name: 'Use preview mode' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Make ready' }));
    await expect(open).toBeDisabled();
    await expect(more).toBeDisabled();
    await userEvent.click(canvas.getByRole('button', { name: 'Revoke image' }));
    await expect(canvasElement.querySelector('.ui-workbench-media-slot img')).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Replace record' }));
    await expect(canvas.getByRole('img', { name: 'Sample record 2' })).toBeVisible();
  },
};
