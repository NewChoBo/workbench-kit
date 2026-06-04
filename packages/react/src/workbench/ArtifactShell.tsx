import { useState, type ComponentPropsWithRef, type ReactNode } from 'react';
import { EmptyState } from '../primitives/EmptyState';
import { IconButton } from '../primitives/IconButton';
import { cx } from '../utils/cx';
import { SplitView } from './SplitView';

export type WorkbenchArtifactMode = 'code' | 'preview' | 'split';

export interface WorkbenchArtifactDescriptor {
  artifactKind?: string;
  content?: unknown;
  extension?: string;
  id: string;
  metadata?: Record<string, unknown>;
  mimeType?: string;
  name?: string;
  path?: string;
  title?: ReactNode;
}

export type WorkbenchPreviewRendererMatchReason =
  | 'artifact-kind'
  | 'custom'
  | 'extension'
  | 'fallback'
  | 'mime-type';

export interface WorkbenchPreviewRendererMatch {
  priority: number;
  reason: WorkbenchPreviewRendererMatchReason;
  renderer: WorkbenchPreviewRenderer;
  score: number;
}

export interface WorkbenchPreviewRendererContext {
  artifact: WorkbenchArtifactDescriptor;
  match?: WorkbenchPreviewRendererMatch;
  renderer?: WorkbenchPreviewRenderer;
}

export interface WorkbenchPreviewRenderer {
  artifactKinds?: readonly string[];
  canRender?: (artifact: WorkbenchArtifactDescriptor) => boolean;
  extensions?: readonly string[];
  fallback?: boolean;
  id: string;
  label?: string;
  mimeTypes?: readonly string[];
  priority?: number;
  render: (
    artifact: WorkbenchArtifactDescriptor,
    context: WorkbenchPreviewRendererContext,
  ) => ReactNode;
}

export type WorkbenchArtifactShellRenderCode = (artifact: WorkbenchArtifactDescriptor) => ReactNode;

export type WorkbenchArtifactShellRenderPreview = (
  artifact: WorkbenchArtifactDescriptor,
  context: WorkbenchPreviewRendererContext,
) => ReactNode;

function normalizeToken(value: string | undefined) {
  return value?.trim().toLocaleLowerCase() ?? '';
}

function normalizeExtension(value: string | undefined) {
  const normalized = normalizeToken(value);
  return normalized.startsWith('.') ? normalized.slice(1) : normalized;
}

function extensionFromPath(path: string | undefined) {
  const fileName = path?.split(/[\\/]/).pop() ?? '';
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex > 0 ? fileName.slice(dotIndex + 1) : '';
}

function matchesMimeType(candidate: string, mimeType: string) {
  const normalizedCandidate = normalizeToken(candidate);
  const normalizedMimeType = normalizeToken(mimeType);
  if (!normalizedCandidate || !normalizedMimeType) return false;
  if (normalizedCandidate === normalizedMimeType) return true;
  if (!normalizedCandidate.endsWith('/*')) return false;

  return normalizedMimeType.startsWith(normalizedCandidate.slice(0, -1));
}

export function getWorkbenchArtifactExtension(artifact: WorkbenchArtifactDescriptor) {
  return (
    normalizeExtension(artifact.extension) || normalizeExtension(extensionFromPath(artifact.path))
  );
}

export function getWorkbenchArtifactTitle(artifact: WorkbenchArtifactDescriptor): ReactNode {
  return artifact.title ?? artifact.name ?? artifact.path ?? artifact.id;
}

export function formatWorkbenchArtifactContent(content: unknown): string {
  if (content === undefined || content === null) return '';
  if (typeof content === 'string') return content;

  try {
    return JSON.stringify(content, null, 2);
  } catch {
    return String(content);
  }
}

export function getWorkbenchPreviewRendererMatch(
  artifact: WorkbenchArtifactDescriptor,
  renderer: WorkbenchPreviewRenderer,
): WorkbenchPreviewRendererMatch | undefined {
  const customMatch = renderer.canRender?.(artifact);
  if (customMatch === false) return undefined;

  const priority = renderer.priority ?? 0;
  const artifactKind = normalizeToken(artifact.artifactKind);
  const mimeType = normalizeToken(artifact.mimeType);
  const extension = getWorkbenchArtifactExtension(artifact);

  if (customMatch) {
    return { priority, reason: 'custom', renderer, score: 100 };
  }

  if (
    artifactKind &&
    renderer.artifactKinds?.some((candidate) => normalizeToken(candidate) === artifactKind)
  ) {
    return { priority, reason: 'artifact-kind', renderer, score: 80 };
  }

  if (mimeType && renderer.mimeTypes?.some((candidate) => matchesMimeType(candidate, mimeType))) {
    return { priority, reason: 'mime-type', renderer, score: 70 };
  }

  if (
    extension &&
    renderer.extensions?.some((candidate) => normalizeExtension(candidate) === extension)
  ) {
    return { priority, reason: 'extension', renderer, score: 60 };
  }

  if (renderer.fallback) {
    return { priority, reason: 'fallback', renderer, score: 1 };
  }

  return undefined;
}

export function selectWorkbenchPreviewRenderer(
  artifact: WorkbenchArtifactDescriptor,
  renderers: readonly WorkbenchPreviewRenderer[],
): WorkbenchPreviewRendererMatch | undefined {
  return renderers
    .map((renderer) => getWorkbenchPreviewRendererMatch(artifact, renderer))
    .filter((match): match is WorkbenchPreviewRendererMatch => Boolean(match))
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.priority - left.priority ||
        left.renderer.id.localeCompare(right.renderer.id),
    )[0];
}

export function getWorkbenchPreviewRenderer(
  artifact: WorkbenchArtifactDescriptor,
  renderers: readonly WorkbenchPreviewRenderer[],
) {
  return selectWorkbenchPreviewRenderer(artifact, renderers)?.renderer;
}

function defaultCodePane(artifact: WorkbenchArtifactDescriptor) {
  return (
    <pre className="ui-workbench-artifact-shell__code">
      <code>{formatWorkbenchArtifactContent(artifact.content)}</code>
    </pre>
  );
}

export interface WorkbenchArtifactPreviewProps extends ComponentPropsWithRef<'div'> {
  artifact: WorkbenchArtifactDescriptor;
  renderPreview?: WorkbenchArtifactShellRenderPreview;
  renderers?: readonly WorkbenchPreviewRenderer[];
  unsupportedLabel?: ReactNode;
}

export function WorkbenchArtifactPreview({
  artifact,
  className,
  renderPreview,
  renderers = [],
  unsupportedLabel = 'Preview is not available for this artifact',
  ...props
}: WorkbenchArtifactPreviewProps) {
  const match = selectWorkbenchPreviewRenderer(artifact, renderers);
  const context: WorkbenchPreviewRendererContext = {
    artifact,
    match,
    renderer: match?.renderer,
  };
  const preview =
    renderPreview !== undefined
      ? renderPreview(artifact, context)
      : match?.renderer.render(artifact, context);

  return (
    <div className={cx('ui-workbench-artifact-preview', className)} {...props}>
      {preview !== undefined && preview !== null ? (
        preview
      ) : (
        <EmptyState compact icon="codicon-open-preview">
          {unsupportedLabel}
        </EmptyState>
      )}
    </div>
  );
}

export interface WorkbenchArtifactShellProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children'
> {
  artifact?: WorkbenchArtifactDescriptor;
  codeLabel?: string;
  defaultMode?: WorkbenchArtifactMode;
  emptyLabel?: ReactNode;
  mode?: WorkbenchArtifactMode;
  onModeChange?: (mode: WorkbenchArtifactMode) => void;
  previewLabel?: string;
  previewRenderers?: readonly WorkbenchPreviewRenderer[];
  renderCode?: WorkbenchArtifactShellRenderCode;
  renderPreview?: WorkbenchArtifactShellRenderPreview;
  splitLabel?: string;
  unsupportedPreviewLabel?: ReactNode;
}

export function WorkbenchArtifactShell({
  artifact,
  className,
  codeLabel = 'Code',
  defaultMode = 'code',
  emptyLabel = 'No artifact selected',
  mode,
  onModeChange,
  previewLabel = 'Preview',
  previewRenderers,
  renderCode,
  renderPreview,
  splitLabel = 'Split',
  unsupportedPreviewLabel,
  ...props
}: WorkbenchArtifactShellProps) {
  const [uncontrolledMode, setUncontrolledMode] = useState(defaultMode);
  const resolvedMode = mode ?? uncontrolledMode;

  const setMode = (nextMode: WorkbenchArtifactMode) => {
    if (mode === undefined) {
      setUncontrolledMode(nextMode);
    }
    onModeChange?.(nextMode);
  };

  if (!artifact) {
    return (
      <div className={cx('ui-workbench-artifact-shell', className)} {...props}>
        <EmptyState icon="codicon-open-preview">{emptyLabel}</EmptyState>
      </div>
    );
  }

  const codePane = renderCode ? renderCode(artifact) : defaultCodePane(artifact);
  const previewPane = (
    <WorkbenchArtifactPreview
      artifact={artifact}
      renderPreview={renderPreview}
      renderers={previewRenderers}
      unsupportedLabel={unsupportedPreviewLabel}
    />
  );
  const title = getWorkbenchArtifactTitle(artifact);
  const meta =
    artifact.mimeType ?? artifact.artifactKind ?? getWorkbenchArtifactExtension(artifact);

  return (
    <div
      className={cx('ui-workbench-artifact-shell', className)}
      data-mode={resolvedMode}
      {...props}
    >
      <div className="ui-workbench-artifact-shell__header">
        <div className="ui-workbench-artifact-shell__title-group">
          <span className="ui-workbench-artifact-shell__title">{title}</span>
          {artifact.path ? (
            <span className="ui-workbench-artifact-shell__path">{artifact.path}</span>
          ) : null}
        </div>
        <div className="ui-workbench-artifact-shell__meta">
          {meta ? <span className="ui-workbench-artifact-shell__chip">{meta}</span> : null}
          <div className="ui-workbench-artifact-shell__modes">
            <IconButton
              aria-pressed={resolvedMode === 'code'}
              className={cx(
                'ui-workbench-artifact-shell__mode',
                resolvedMode === 'code' && 'ui-workbench-artifact-shell__mode--active',
              )}
              icon="codicon-code"
              label={codeLabel}
              onClick={() => setMode('code')}
            />
            <IconButton
              aria-pressed={resolvedMode === 'preview'}
              className={cx(
                'ui-workbench-artifact-shell__mode',
                resolvedMode === 'preview' && 'ui-workbench-artifact-shell__mode--active',
              )}
              icon="codicon-open-preview"
              label={previewLabel}
              onClick={() => setMode('preview')}
            />
            <IconButton
              aria-pressed={resolvedMode === 'split'}
              className={cx(
                'ui-workbench-artifact-shell__mode',
                resolvedMode === 'split' && 'ui-workbench-artifact-shell__mode--active',
              )}
              icon="codicon-split"
              label={splitLabel}
              onClick={() => setMode('split')}
            />
          </div>
        </div>
      </div>
      <div className="ui-workbench-artifact-shell__body">
        {resolvedMode === 'code' ? (
          <section className="ui-workbench-artifact-shell__pane" aria-label={codeLabel}>
            {codePane}
          </section>
        ) : null}
        {resolvedMode === 'preview' ? (
          <section className="ui-workbench-artifact-shell__pane" aria-label={previewLabel}>
            {previewPane}
          </section>
        ) : null}
        {resolvedMode === 'split' ? (
          <SplitView
            className="ui-workbench-artifact-shell__split"
            defaultPrimarySizePercent={50}
            minPrimarySizePercent={20}
            primary={
              <section className="ui-workbench-artifact-shell__pane" aria-label={codeLabel}>
                {codePane}
              </section>
            }
            secondary={
              <section className="ui-workbench-artifact-shell__pane" aria-label={previewLabel}>
                {previewPane}
              </section>
            }
          />
        ) : null}
      </div>
    </div>
  );
}
