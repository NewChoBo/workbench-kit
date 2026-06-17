export const WORKBENCH_KIT_BASE_VERSION = '0.0.0' as const;

export {
  DisposableStore,
  dispose,
  isDisposable,
  toDisposable,
  type Disposable,
} from './disposable.js';
export { Emitter, type Event } from './event.js';
