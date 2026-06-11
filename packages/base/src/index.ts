/** Phase 0 placeholder — foundation layer exports arrive in a later phase. */
export const WORKBENCH_KIT_BASE_VERSION = '0.0.0' as const;

export type Disposable = {
  dispose(): void;
};

export type Event<T> = (listener: (e: T) => void) => Disposable;
