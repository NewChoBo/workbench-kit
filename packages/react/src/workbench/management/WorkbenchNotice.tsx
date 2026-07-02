import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { IconButton, WorkbenchBanner, WorkbenchBannerMessage } from '../../primitives/index';

export type WorkbenchNoticeTone = 'error' | 'info' | 'success' | 'warning';
export type WorkbenchNoticePosition = 'bottom-center' | 'bottom-right';

export interface WorkbenchNoticeItem {
  dataAttributes?: Record<string, string>;
  id: string;
  message: ReactNode;
  tone: WorkbenchNoticeTone;
}

export interface ShowWorkbenchNoticeInput {
  dataAttributes?: Record<string, string>;
  durationMs?: number;
  id?: string;
  message: ReactNode;
  tone: WorkbenchNoticeTone;
}

export interface WorkbenchNoticeController {
  clearNotices: () => void;
  dismissNotice: (id: string) => void;
  notices: readonly WorkbenchNoticeItem[];
  showNotice: (input: ShowWorkbenchNoticeInput) => string;
}

const WorkbenchNoticeContext = createContext<WorkbenchNoticeController | null>(null);

export function useWorkbenchNoticeController(): WorkbenchNoticeController {
  const [notices, setNotices] = useState<WorkbenchNoticeItem[]>([]);
  const nextIdRef = useRef(0);
  const timeoutHandlesRef = useRef(new Map<string, number>());

  const clearNoticeTimeout = useCallback((id: string): void => {
    const timeoutHandle = timeoutHandlesRef.current.get(id);
    if (timeoutHandle !== undefined) {
      window.clearTimeout(timeoutHandle);
      timeoutHandlesRef.current.delete(id);
    }
  }, []);

  const dismissNotice = useCallback(
    (id: string): void => {
      clearNoticeTimeout(id);
      setNotices((current) => current.filter((notice) => notice.id !== id));
    },
    [clearNoticeTimeout],
  );

  const clearNotices = useCallback((): void => {
    for (const timeoutHandle of timeoutHandlesRef.current.values()) {
      window.clearTimeout(timeoutHandle);
    }
    timeoutHandlesRef.current.clear();
    setNotices([]);
  }, []);

  const showNotice = useCallback(
    ({
      dataAttributes,
      durationMs = 4200,
      id,
      message,
      tone,
    }: ShowWorkbenchNoticeInput): string => {
      const noticeId = id ?? `workbench-notice-${nextIdRef.current++}`;

      clearNoticeTimeout(noticeId);
      setNotices((current) => [
        ...current.filter((notice) => notice.id !== noticeId),
        {
          ...(dataAttributes === undefined ? {} : { dataAttributes }),
          id: noticeId,
          message,
          tone,
        },
      ]);

      if (durationMs > 0) {
        const timeoutHandle = window.setTimeout(() => dismissNotice(noticeId), durationMs);
        timeoutHandlesRef.current.set(noticeId, timeoutHandle);
      }

      return noticeId;
    },
    [clearNoticeTimeout, dismissNotice],
  );

  useEffect(() => clearNotices, [clearNotices]);

  return {
    clearNotices,
    dismissNotice,
    notices,
    showNotice,
  };
}

export function WorkbenchNoticeProvider({
  children,
  controller,
  dataAttributes,
  position = 'bottom-right',
}: {
  children: ReactNode;
  controller?: WorkbenchNoticeController;
  dataAttributes?: Record<string, string>;
  position?: WorkbenchNoticePosition;
}) {
  const localController = useWorkbenchNoticeController();
  const resolvedController = controller ?? localController;

  return (
    <WorkbenchNoticeContext.Provider value={resolvedController}>
      {children}
      <WorkbenchNoticeViewport
        controller={resolvedController}
        position={position}
        {...(dataAttributes === undefined ? {} : { dataAttributes })}
      />
    </WorkbenchNoticeContext.Provider>
  );
}

export function WorkbenchNoticeViewport({
  controller,
  dataAttributes,
  position = 'bottom-right',
}: {
  controller: WorkbenchNoticeController;
  dataAttributes?: Record<string, string>;
  position?: WorkbenchNoticePosition;
}) {
  const visibleNotices = controller.notices.slice(-3);
  if (visibleNotices.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className={resolveNoticeViewportClassName(position)}
      data-position={position}
      {...(dataAttributes ?? {})}
    >
      {visibleNotices.map((notice) => (
        <WorkbenchBanner
          className="pointer-events-auto"
          data-tone={notice.tone}
          key={notice.id}
          style={resolveNoticeBannerStyle(notice.tone)}
          tone={notice.tone === 'warning' ? 'warning' : 'default'}
          {...(notice.dataAttributes ?? {})}
        >
          <WorkbenchBannerMessage>{notice.message}</WorkbenchBannerMessage>
          <IconButton
            compact
            icon="close"
            label="Dismiss notice"
            onClick={() => controller.dismissNotice(notice.id)}
            type="button"
          />
        </WorkbenchBanner>
      ))}
    </div>
  );
}

export function useWorkbenchNotice(): WorkbenchNoticeController {
  const controller = useContext(WorkbenchNoticeContext);
  if (controller === null) {
    throw new Error('useWorkbenchNotice must be used within a WorkbenchNoticeProvider.');
  }

  return controller;
}

function resolveNoticeViewportClassName(position: WorkbenchNoticePosition): string {
  return joinClasses(
    'pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col gap-2 px-4',
    position === 'bottom-center' ? 'items-center' : 'items-end',
  );
}

function resolveNoticeBannerStyle(tone: WorkbenchNoticeTone): CSSProperties {
  return {
    borderColor:
      tone === 'error'
        ? 'var(--ui-danger-border, currentColor)'
        : tone === 'success'
          ? 'var(--ui-success-border, currentColor)'
          : undefined,
    maxWidth: 'min(520px, calc(100vw - 32px))',
    minWidth: 'min(420px, calc(100vw - 32px))',
  };
}

function joinClasses(...classes: Array<string | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
