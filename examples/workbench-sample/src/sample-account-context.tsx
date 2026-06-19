import { createContext, useContext, type ReactNode } from 'react';
import type { SampleAuthController } from './useSampleAuth.js';

const SampleAccountContext = createContext<SampleAuthController | null>(null);

export function SampleAccountProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: SampleAuthController;
}) {
  return <SampleAccountContext.Provider value={value}>{children}</SampleAccountContext.Provider>;
}

export function useSampleAccount(): SampleAuthController {
  const value = useContext(SampleAccountContext);
  if (!value) {
    throw new Error('useSampleAccount must be used within SampleAccountProvider.');
  }

  return value;
}
