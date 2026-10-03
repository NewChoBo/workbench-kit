import { useCallback, useEffect, useLayoutEffect, useRef, useState, type DragEvent } from 'react';
import { createTypedDragMime, type TypedDragMime } from '../utils/dragMime';

export type WorkbenchPaletteDragFeedback =
  | { readonly accepted: true; readonly message: string }
  | { readonly accepted: false; readonly reason: string; readonly message: string };

export interface WorkbenchPaletteDragEventPoint {
  readonly clientX: number;
  readonly clientY: number;
  readonly target: EventTarget | null;
  readonly currentTarget: HTMLElement;
}

export type WorkbenchPaletteDragTargetResolver<Source, Target> = (
  source: Source,
  point: WorkbenchPaletteDragEventPoint,
) => { readonly key: string; readonly target: Target } | null;

export interface WorkbenchPaletteDragOptions<Source, Target, PreparedData = never> {
  readonly enabled: boolean;
  /** Stable identity for one source/context. Change it whenever that context is invalidated. */
  readonly revisionKey: string | number | object;
  readonly mimeType: string;
  readonly getSourceKey: (source: Source) => string;
  readonly canDrag: (source: Source) => boolean;
  readonly onDragStart?: (source: Source) => void;
  /** Pure deferred preparation. Return metadata; do not mutate inputs, documents or caches. */
  readonly getDropFeedback: (
    source: Source,
    target: Target,
  ) => WorkbenchPaletteDragFeedback & { readonly data?: PreparedData };
  /** Fresh synchronous admission/commit. No prepared command is passed to this callback. */
  readonly onDrop: (source: Source, target: Target) => WorkbenchPaletteDragFeedback;
  readonly pendingMessage: string;
  readonly unavailableMessage: string;
}

export interface WorkbenchPaletteDragPreview<Source, Target, PreparedData = never> {
  readonly source: Source;
  readonly target: Target;
  readonly key: string;
  readonly feedback: WorkbenchPaletteDragFeedback;
  readonly pending: boolean;
  readonly revisionKey: string | number | object;
  readonly preparationGeneration: number;
  /** Published only for the current completed generation. Never serialized into DataTransfer. */
  readonly data?: PreparedData;
}

export interface WorkbenchPaletteDragSourceProps {
  readonly draggable: boolean;
  readonly onDragStart: (event: DragEvent<HTMLElement>) => void;
  readonly onDragEnd: (event: DragEvent<HTMLElement>) => void;
}

export interface WorkbenchPaletteDragTargetProps {
  /** Attach alongside the handlers so child-only commits update the current resolver. */
  readonly ref: (element: HTMLElement | null) => void;
  readonly onDragOver: (event: DragEvent<HTMLElement>) => void;
  readonly onDragLeave: (event: DragEvent<HTMLElement>) => void;
  readonly onDrop: (event: DragEvent<HTMLElement>) => void;
}

export interface WorkbenchPaletteDragResult<Source, Target, PreparedData = never> {
  readonly getSourceProps: (source: Source) => WorkbenchPaletteDragSourceProps;
  readonly getTargetProps: (
    resolveTarget: WorkbenchPaletteDragTargetResolver<Source, Target>,
  ) => WorkbenchPaletteDragTargetProps;
  readonly preview: WorkbenchPaletteDragPreview<Source, Target, PreparedData> | null;
  readonly message: string;
  readonly active: boolean;
  readonly refreshTarget: () => void;
  /** Live receipt check required immediately before consuming completed preparation metadata. */
  readonly isCurrentPreview: (
    preview: WorkbenchPaletteDragPreview<Source, Target, PreparedData>,
  ) => boolean;
  readonly cancel: () => void;
}

interface Gesture<Source> {
  readonly token: string;
  readonly source: Source;
  readonly sourceKey: string;
  readonly revisionKey: string | number | object;
  readonly mimeType: string;
  readonly mime: TypedDragMime<string>;
  readonly origin: HTMLElement;
}

let gestureSequence = 0;

function isAvailableOrigin(origin: HTMLElement): boolean {
  return (
    origin.isConnected &&
    !origin.matches(':disabled') &&
    origin.getAttribute('aria-disabled') !== 'true' &&
    origin.draggable
  );
}

/**
 * One same-window native palette gesture shared by source buttons and a canvas.
 * Hosts own hit-testing and policy. They must include every geometry/context
 * input in the proposal key, then freshly admit the final target in onDrop.
 *
 * A host effect must call isCurrentPreview(preview) immediately before consuming
 * preview.data. Record consumed generations/cache values before refreshTarget
 * so publishing identical metadata cannot cause a refresh loop.
 */
export function useWorkbenchPaletteDrag<Source, Target, PreparedData = never>(
  options: WorkbenchPaletteDragOptions<Source, Target, PreparedData>,
): WorkbenchPaletteDragResult<Source, Target, PreparedData> {
  type Preview = WorkbenchPaletteDragPreview<Source, Target, PreparedData>;
  const optionsRef = useRef(options);
  const gestureRef = useRef<Gesture<Source> | null>(null);
  const targetRef = useRef<{
    readonly owner: object;
    readonly element: HTMLElement;
    readonly resolveTarget: WorkbenchPaletteDragTargetResolver<Source, Target>;
  } | null>(null);
  const pointRef = useRef<WorkbenchPaletteDragEventPoint | null>(null);
  const preparedRef = useRef<Preview | null>(null);
  const preparedGestureRef = useRef<Gesture<Source> | null>(null);
  const generationRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState('');

  const retirePreparation = useCallback(() => {
    generationRef.current += 1;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    preparedRef.current = null;
    preparedGestureRef.current = null;
  }, []);

  const clearPreview = useCallback(
    (nextMessage = '') => {
      retirePreparation();
      if (mountedRef.current) {
        setPreview(null);
        setMessage(nextMessage);
      }
    },
    [retirePreparation],
  );

  const endGesture = useCallback(
    (restoreFocus: boolean, nextMessage = '') => {
      const gesture = gestureRef.current;
      gestureRef.current = null;
      pointRef.current = null;
      clearPreview(nextMessage);
      if (mountedRef.current) setActive(false);
      if (restoreFocus && gesture?.origin.isConnected) {
        gesture.origin.focus({ preventScroll: true });
      }
    },
    [clearPreview],
  );

  const currentGesture = useCallback((): Gesture<Source> | null => {
    const gesture = gestureRef.current;
    const config = optionsRef.current;
    if (!gesture) return null;
    let valid = false;
    try {
      valid =
        config.enabled &&
        gesture.revisionKey === config.revisionKey &&
        gesture.mimeType === config.mimeType &&
        isAvailableOrigin(gesture.origin) &&
        config.getSourceKey(gesture.source) === gesture.sourceKey &&
        config.canDrag(gesture.source);
    } catch {
      // A disappeared/invalid source cannot leave a live gesture behind.
    }
    if (!valid) {
      endGesture(false);
      return null;
    }
    return gesture;
  }, [endGesture]);

  const resolve = useCallback(
    (
      gesture: Gesture<Source>,
      point: WorkbenchPaletteDragEventPoint,
      resolver: WorkbenchPaletteDragTargetResolver<Source, Target> | null,
    ) => {
      if (
        !point.currentTarget.isConnected ||
        !Number.isFinite(point.clientX) ||
        !Number.isFinite(point.clientY)
      ) {
        return null;
      }
      try {
        return resolver?.(gesture.source, point) ?? null;
      } catch {
        return null;
      }
    },
    [],
  );

  const prepareTarget = useCallback(
    (
      gesture: Gesture<Source>,
      proposal: { readonly key: string; readonly target: Target } | null,
    ): Preview | null => {
      const config = optionsRef.current;
      if (!proposal) {
        clearPreview(config.unavailableMessage);
        return null;
      }
      const previous = preparedRef.current;
      if (previous?.key === proposal.key && previous.revisionKey === gesture.revisionKey) {
        return previous;
      }
      retirePreparation();
      const generation = generationRef.current;
      const pending: Preview = {
        source: gesture.source,
        target: proposal.target,
        key: proposal.key,
        feedback: { accepted: false, reason: 'pending', message: config.pendingMessage },
        pending: true,
        revisionKey: gesture.revisionKey,
        preparationGeneration: generation,
      };
      preparedRef.current = pending;
      preparedGestureRef.current = gesture;
      setPreview(pending);
      setMessage(config.pendingMessage);
      // Never run policy/admission synchronously in native dragover.
      timerRef.current = window.setTimeout(() => {
        if (
          !mountedRef.current ||
          generation !== generationRef.current ||
          currentGesture() !== gesture ||
          !targetRef.current ||
          pointRef.current?.currentTarget !== targetRef.current.element ||
          preparedRef.current !== pending
        ) {
          return;
        }
        timerRef.current = null;
        let result: WorkbenchPaletteDragFeedback & { readonly data?: PreparedData };
        try {
          result = optionsRef.current.getDropFeedback(gesture.source, proposal.target);
        } catch {
          result = {
            accepted: false,
            reason: 'unavailable',
            message: optionsRef.current.unavailableMessage,
          };
        }
        if (
          !mountedRef.current ||
          generation !== generationRef.current ||
          currentGesture() !== gesture ||
          !targetRef.current ||
          pointRef.current?.currentTarget !== targetRef.current.element ||
          preparedRef.current !== pending
        ) {
          return;
        }
        const feedback: WorkbenchPaletteDragFeedback = result.accepted
          ? { accepted: true, message: result.message }
          : { accepted: false, reason: result.reason, message: result.message };
        const ready: Preview = {
          ...pending,
          feedback,
          pending: false,
          ...(result.data !== undefined ? { data: result.data } : {}),
        };
        preparedRef.current = ready;
        setPreview(ready);
        setMessage(feedback.message);
      }, 0);
      return pending;
    },
    [clearPreview, currentGesture, retirePreparation],
  );

  const refreshTarget = useCallback(() => {
    const gesture = currentGesture();
    const point = pointRef.current;
    const registration = targetRef.current;
    if (!gesture || !point || registration?.element !== point.currentTarget) return;
    prepareTarget(gesture, resolve(gesture, point, registration.resolveTarget));
  }, [currentGesture, prepareTarget, resolve]);

  const isCurrentPreview = useCallback(
    (candidate: Preview): boolean => {
      if (
        !mountedRef.current ||
        candidate.pending ||
        preparedRef.current !== candidate ||
        candidate.preparationGeneration !== generationRef.current ||
        !targetRef.current ||
        pointRef.current?.currentTarget !== targetRef.current.element ||
        !targetRef.current.element.isConnected
      ) {
        return false;
      }
      const gesture = currentGesture();
      const point = pointRef.current;
      const registration = targetRef.current;
      if (
        !gesture ||
        !point ||
        !registration ||
        preparedGestureRef.current !== gesture ||
        candidate.source !== gesture.source ||
        candidate.revisionKey !== gesture.revisionKey
      ) {
        return false;
      }
      // A target child can commit new geometry before the owner's passive
      // metadata effect runs. Its latest resolver must still name this intent.
      return resolve(gesture, point, registration.resolveTarget)?.key === candidate.key;
    },
    [currentGesture, resolve],
  );

  const cancel = useCallback(() => {
    const gesture = currentGesture();
    if (gesture) endGesture(true);
  }, [currentGesture, endGesture]);

  useLayoutEffect(() => {
    optionsRef.current = options;
    currentGesture();
    if (pointRef.current && !pointRef.current.currentTarget.isConnected) {
      pointRef.current = null;
      clearPreview();
    }
  });

  useEffect(() => {
    mountedRef.current = true;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !gestureRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      cancel();
    };
    const onBlur = () => endGesture(false);
    document.addEventListener('keydown', onEscape, true);
    window.addEventListener('blur', onBlur);
    return () => {
      mountedRef.current = false;
      gestureRef.current = null;
      pointRef.current = null;
      retirePreparation();
      document.removeEventListener('keydown', onEscape, true);
      window.removeEventListener('blur', onBlur);
    };
  }, [cancel, endGesture, retirePreparation]);

  useEffect(() => {
    const gesture = gestureRef.current;
    if (!active || !gesture) return;
    const observer = new MutationObserver(() => {
      currentGesture();
      if (pointRef.current && !pointRef.current.currentTarget.isConnected) {
        pointRef.current = null;
        clearPreview();
      }
    });
    observer.observe(gesture.origin.ownerDocument, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'aria-disabled', 'draggable'],
    });
    return () => observer.disconnect();
  }, [active, clearPreview, currentGesture]);

  const trustedTransfer = (
    gesture: Gesture<Source>,
    transfer: DataTransfer,
    committing: boolean,
  ): boolean => {
    try {
      if (!gesture.mime.has(transfer)) return false;
      const token = gesture.mime.read(transfer);
      // Protected-mode dragover hides data. Drop must disclose the exact token.
      return token === gesture.token || (!committing && token === null);
    } catch {
      return false;
    }
  };

  const getSourceProps = (source: Source): WorkbenchPaletteDragSourceProps => {
    let draggable = false;
    try {
      draggable = options.enabled && options.canDrag(source);
    } catch {
      // An invalid source remains a normal non-draggable button.
    }
    return {
      draggable,
      onDragStart: (event) => {
        const config = optionsRef.current;
        endGesture(false);
        try {
          if (
            !config.enabled ||
            !config.canDrag(source) ||
            !isAvailableOrigin(event.currentTarget)
          ) {
            event.preventDefault();
            return;
          }
          const sourceKey = config.getSourceKey(source);
          const mime = createTypedDragMime<string>({
            mimeType: config.mimeType,
            serialize: (token) => token,
            deserialize: (token) => token || null,
            effectAllowed: 'copy',
          });
          const token = `${++gestureSequence}-${Math.random().toString(36).slice(2)}`;
          const gesture: Gesture<Source> = {
            source,
            sourceKey,
            token,
            revisionKey: config.revisionKey,
            mimeType: config.mimeType,
            mime,
            origin: event.currentTarget,
          };
          mime.write(event.dataTransfer, token);
          config.onDragStart?.(source);
          // A synchronous host transition may have invalidated or replaced the source.
          gestureRef.current = gesture;
          if (!currentGesture()) {
            event.preventDefault();
            return;
          }
          setActive(true);
        } catch {
          event.preventDefault();
          endGesture(false, config.unavailableMessage);
        }
      },
      onDragEnd: (event) => {
        const gesture = currentGesture();
        if (!gesture || gesture.origin !== event.currentTarget) return;
        const feedback = preparedRef.current?.feedback;
        endGesture(true, feedback && !feedback.accepted ? feedback.message : '');
      },
    };
  };

  const getTargetProps = (
    resolveTarget: WorkbenchPaletteDragTargetResolver<Source, Target>,
  ): WorkbenchPaletteDragTargetProps => {
    // Every committed callback ref owns its resolver. Unlike an owner layout
    // effect, this also observes geometry renders confined to a target child.
    const owner = {};
    const eventPoint = (event: DragEvent<HTMLElement>): WorkbenchPaletteDragEventPoint => ({
      clientX: event.clientX,
      clientY: event.clientY,
      target: event.target,
      currentTarget: event.currentTarget,
    });
    return {
      ref: (element) => {
        if (element) {
          targetRef.current = { owner, element, resolveTarget };
          if (pointRef.current && pointRef.current.currentTarget !== element) {
            pointRef.current = null;
            clearPreview();
          }
        } else if (targetRef.current?.owner === owner) {
          const detachedElement = targetRef.current.element;
          targetRef.current = null;
          // Callback replacement detaches/attaches in the same commit. Wait for
          // that commit before retiring a true detach, preserving a stable
          // preview and last point across ordinary feedback rerenders.
          queueMicrotask(() => {
            if (
              mountedRef.current &&
              targetRef.current === null &&
              pointRef.current?.currentTarget === detachedElement
            ) {
              pointRef.current = null;
              clearPreview();
            }
          });
        }
      },
      onDragOver: (event) => {
        const gesture = currentGesture();
        if (!gesture || !trustedTransfer(gesture, event.dataTransfer, false)) return;
        event.preventDefault();
        event.stopPropagation();
        const point = eventPoint(event);
        pointRef.current = point;
        const next = prepareTarget(gesture, resolve(gesture, point, resolveTarget));
        event.dataTransfer.dropEffect =
          next && !next.pending && next.feedback.accepted ? 'copy' : 'none';
      },
      onDragLeave: (event) => {
        if (!gestureRef.current) return;
        const related = event.relatedTarget;
        if (related instanceof Node && event.currentTarget.contains(related)) return;
        if (related === null) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            rect.width > 0 &&
            rect.height > 0 &&
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom
          ) {
            return;
          }
        }
        pointRef.current = null;
        clearPreview();
      },
      onDrop: (event) => {
        const gesture = currentGesture();
        if (!gesture) return;
        event.preventDefault();
        event.stopPropagation();
        const config = optionsRef.current;
        if (!trustedTransfer(gesture, event.dataTransfer, true)) {
          endGesture(true, config.unavailableMessage);
          return;
        }
        const proposal = resolve(gesture, eventPoint(event), resolveTarget);
        const prepared = preparedRef.current;
        if (
          !proposal ||
          !prepared ||
          proposal.key !== prepared.key ||
          prepared.revisionKey !== config.revisionKey ||
          prepared.pending
        ) {
          endGesture(true, proposal ? config.pendingMessage : config.unavailableMessage);
          return;
        }
        if (!prepared.feedback.accepted) {
          endGesture(true, prepared.feedback.message);
          return;
        }
        // Retire the token before calling the host: reentrant/repeated drops cannot commit twice.
        endGesture(false);
        let feedback: WorkbenchPaletteDragFeedback;
        try {
          feedback = config.onDrop(gesture.source, proposal.target);
        } catch {
          feedback = { accepted: false, reason: 'unavailable', message: config.unavailableMessage };
        }
        if (mountedRef.current) setMessage(feedback.message);
        if (
          !feedback.accepted &&
          optionsRef.current.enabled &&
          optionsRef.current.revisionKey === gesture.revisionKey &&
          gesture.origin.isConnected
        ) {
          gesture.origin.focus({ preventScroll: true });
        }
      },
    };
  };

  const isCurrent =
    active && options.enabled && gestureRef.current?.revisionKey === options.revisionKey;
  return {
    getSourceProps,
    getTargetProps,
    preview: isCurrent ? preview : null,
    message,
    active: isCurrent,
    refreshTarget,
    isCurrentPreview,
    cancel,
  };
}
