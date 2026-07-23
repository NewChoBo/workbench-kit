import type { ReactElement } from 'react';

import { App, type AppProps } from './App.js';

/**
 * Shared sample host assembly for `pnpm dev` (`main.tsx`) and Storybook.
 * Storage seeding stays scenario-owned; call scenarios before rendering.
 */
export type CreateSampleHostOptions = {
  /** When true, wraps the shell in `WorkbenchDevtoolsShell` (matches `<App devtools />`). */
  readonly devtools?: boolean | undefined;
};

/**
 * Build the sample workbench host tree.
 * Default options match today’s `App` without `devtools`.
 */
export function createSampleHost(options: CreateSampleHostOptions = {}): ReactElement {
  const props: AppProps = {
    devtools: options.devtools ?? false,
  };
  return <App {...props} />;
}
