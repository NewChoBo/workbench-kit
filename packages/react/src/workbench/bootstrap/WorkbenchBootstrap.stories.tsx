import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { WorkbenchAuthGate } from '../auth/WorkbenchAuthGate';
import type { WorkbenchAuthStatus } from '../auth/WorkbenchAuthGate';
import { WorkbenchBootstrapView } from './WorkbenchBootstrapView';
import { useWorkbenchBootstrap } from './useWorkbenchBootstrap';

const meta = {
  title: 'React/Workbench/Bootstrap',
  component: WorkbenchBootstrapView,
  parameters: { layout: 'fullscreen' },
  args: {
    tasks: [],
  },
} satisfies Meta<typeof WorkbenchBootstrapView>;

export default meta;

type Story = StoryObj<typeof meta>;

const startupTaskDefinitions = [
  {
    id: 'session',
    label: 'Checking session',
    run: async () => {
      await delay(700);
    },
  },
  {
    detail: '8 extensions',
    id: 'extensions',
    label: 'Loading extensions',
    run: async () => {
      await delay(900);
    },
  },
  {
    detail: '6 files, 3 folders',
    id: 'workspace',
    label: 'Preparing workspace',
    run: async () => {
      await delay(800);
    },
  },
] as const;

function StartupPreviewHarness() {
  const bootstrap = useWorkbenchBootstrap();

  useEffect(() => {
    void bootstrap.run(startupTaskDefinitions);
  }, [bootstrap]);

  if (bootstrap.isReady) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: 'var(--color-bg)',
          color: 'var(--color-text)',
        }}
      >
        Workbench ready.
      </main>
    );
  }

  return (
    <div className="workbench-bootstrap-gate" data-theme="dark">
      <WorkbenchBootstrapView
        currentTaskId={bootstrap.currentTaskId}
        error={bootstrap.error}
        heading="Workbench Sample"
        status={bootstrap.status}
        tasks={bootstrap.tasks}
        onRetry={bootstrap.status === 'failed' ? bootstrap.retry : undefined}
      />
    </div>
  );
}

function AuthThenStartupHarness() {
  const [authStatus, setAuthStatus] = useState<WorkbenchAuthStatus>('loading');

  useEffect(() => {
    const timeout = window.setTimeout(() => setAuthStatus('unauthenticated'), 600);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <div data-theme="dark">
      <WorkbenchAuthGate
        authStatus={authStatus}
        loginViewProps={{
          productName: 'Workbench Sample',
          statusLabel: 'Sign in to load your workspace.',
          onSubmit: () => setAuthStatus('authenticated'),
        }}
      >
        <StartupPreviewHarness />
      </WorkbenchAuthGate>
    </div>
  );
}

export const StartupTasks: Story = {
  render: () => <StartupPreviewHarness />,
};

export const AfterSignIn: Story = {
  render: () => <AuthThenStartupHarness />,
};

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
