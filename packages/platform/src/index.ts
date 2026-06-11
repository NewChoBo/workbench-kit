import type { Disposable } from '@workbench-kit/base';

/** Phase 0 placeholder — platform services arrive in a later phase. */
export const WORKBENCH_KIT_PLATFORM_VERSION = '0.0.0' as const;

export type ServiceIdentifier<T> = symbol & { __serviceBrand: T };

export type PlatformService = Disposable;
