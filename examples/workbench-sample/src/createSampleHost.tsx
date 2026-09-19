import type { ReactElement } from 'react';
import type { SampleHostBackendClient } from '@workbench-kit/contracts';

import { App, type AppProps } from './App.js';

/**
 * Shared sample host assembly for `pnpm dev` (`main.tsx`) and Storybook.
 * Storage seeding stays scenario-owned; call scenarios before rendering.
 */
export type CreateSampleHostOptions = {
  /** Caller-owned backend; omitted callers retain the ordinary sample client. */
  readonly backendClient?: SampleHostBackendClient | undefined;
  /** When true, wraps the shell in `WorkbenchDevtoolsShell` (matches `<App devtools />`). */
  readonly devtools?: boolean | undefined;
};

/**
 * Build the sample workbench host tree.
 * Default options match today’s `App` without `devtools`.
 */
export function createSampleHost(options: CreateSampleHostOptions = {}): ReactElement {
  const props: AppProps = {
    backendClient: options.backendClient,
    devtools: options.devtools ?? false,
  };
  return <App {...props} />;
}
