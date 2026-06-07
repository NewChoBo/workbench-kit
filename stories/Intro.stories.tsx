import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'Introduction',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  render: () => (
    <main
      style={{
        minHeight: '100vh',
        padding: 40,
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div style={{ maxWidth: 720 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 28 }}>Newchobo UI</h1>
        <p style={{ margin: '0 0 28px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
          Reusable workbench primitives for compact desktop-style React interfaces. Standalone host
          contract: <code>docs/workbench/standalone-host.md</code>.
        </p>
        <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>Playground map</h2>
        <ul
          style={{
            display: 'grid',
            gap: 8,
            margin: '0 0 28px',
            padding: 0,
            listStyle: 'none',
          }}
        >
          <li>
            <code>JsonConfig/Workbench</code> — Monaco config editor with schema or widget preview
          </li>
          <li>
            <code>JsonWidget/Playground</code> — parse/format lab and <code>Interactive</code>{' '}
            sandbox (add, DnD, Monaco, preview)
          </li>
          <li>
            <code>React/Workbench/Shell → Integrated Shell</code> — full end-to-end shell flow
          </li>
          <li>
            <code>React/Workbench/Verification</code> — interactive chrome states and viewport
            matrix
          </li>
        </ul>
        <ul style={{ display: 'grid', gap: 10, margin: 0, padding: 0, listStyle: 'none' }}>
          <li>
            <strong>Verification</strong>: start at <code>React/Workbench/Verification</code> for
            viewport matrix, shell states, and error/warning gallery
          </li>
          <li>
            <strong>Integrated shell</strong>: <code>React/Workbench/Shell → Integrated Shell</code>{' '}
            for full end-to-end flow; use toolbar viewports prefixed with <strong>Verify ·</strong>
          </li>
          <li>
            <strong>Workspace</strong>: explorer, editor, and search under{' '}
            <code>React/Workbench/Workspace</code>
          </li>
          <li>
            <strong>Settings &amp; forms</strong>: schema and modal flows under{' '}
            <code>React/Workbench/Settings</code>
          </li>
          <li>
            <strong>JSON tooling</strong>: <code>JsonConfig/Workbench</code> and{' '}
            <code>JsonWidget</code> playgrounds
          </li>
          <li>
            <strong>Primitives</strong>: buttons, badges, fields, inputs, and empty states
          </li>
          <li>
            <strong>Layout</strong>: panels, sidebar frames, banners, and workbench composition
          </li>
          <li>
            <strong>Overlays</strong>: modal dialogs and context menus
          </li>
        </ul>
      </div>
    </main>
  ),
};
