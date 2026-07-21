import type { ReactNode } from 'react';
import {
  Button,
  WorkbenchPropertyCard,
  WorkbenchPropertyGrid,
  WorkbenchPropertyHint,
  WorkbenchPropertySection,
  WorkbenchPropertyStack,
} from '../../primitives/index';

type IntegrationSettingsDensity = 'compact' | 'default';
type IntegrationSettingsInset = 'default' | 'flush';
type IntegrationBodyTextSize = 'compact' | 'default';

interface IntegrationPathEditorRow {
  actions?: ReactNode;
  description?: ReactNode;
  editor: ReactNode;
  id: string;
  label: ReactNode;
}

interface IntegrationAccountEditorField {
  field: ReactNode;
  id: string;
  label: ReactNode;
}

export interface IntegrationSettingsSectionProps {
  actions?: ReactNode;
  children: ReactNode;
  density?: IntegrationSettingsDensity;
  description?: string;
  inset?: IntegrationSettingsInset;
  title?: string;
}

export interface IntegrationAddListActionProps {
  children: ReactNode;
  onClick: () => void;
}

export interface IntegrationSinglePathEditorProps {
  actions?: ReactNode;
  description?: ReactNode;
  field: ReactNode;
  fieldDescription?: ReactNode;
  label: ReactNode;
  title?: ReactNode;
}

export interface IntegrationPathListEditorProps {
  addAction?: ReactNode;
  description?: ReactNode;
  emptyState?: ReactNode;
  rows: ReadonlyArray<IntegrationPathEditorRow>;
  title?: ReactNode;
}

export interface IntegrationListEditorEmptyStateProps {
  action?: ReactNode;
  description: ReactNode;
}

export interface IntegrationAccountRowEditorProps {
  actions?: ReactNode;
  description?: ReactNode;
  fields: ReadonlyArray<IntegrationAccountEditorField>;
  footer?: ReactNode;
  title?: ReactNode;
}

export interface IntegrationBodyTextProps {
  children: ReactNode;
  size?: IntegrationBodyTextSize;
}

export function IntegrationSettingsSection({
  actions,
  children,
  density = 'default',
  description,
  inset = 'default',
  title,
}: IntegrationSettingsSectionProps) {
  return (
    <WorkbenchPropertySection
      className={inset === 'flush' ? 'rounded-none' : undefined}
      data-density={density}
      data-inset={inset}
      {...(actions === undefined ? {} : { actions })}
      {...(title === undefined ? {} : { title })}
    >
      {description === undefined ? null : (
        <WorkbenchPropertyHint className="block">{description}</WorkbenchPropertyHint>
      )}
      <WorkbenchPropertyStack gap={density === 'compact' ? 'sm' : 'md'}>
        {children}
      </WorkbenchPropertyStack>
    </WorkbenchPropertySection>
  );
}

export function IntegrationAddListAction({ children, onClick }: IntegrationAddListActionProps) {
  return (
    <Button compact icon="add" onClick={onClick} variant="default">
      {children}
    </Button>
  );
}

export function IntegrationSinglePathEditor({
  actions,
  description,
  field,
  fieldDescription,
  label,
  title,
}: IntegrationSinglePathEditorProps) {
  return (
    <IntegrationEditorRow
      actions={actions}
      description={description}
      editor={
        <WorkbenchPropertyStack gap="xs">
          {field}
          <IntegrationEditorDescription>{fieldDescription}</IntegrationEditorDescription>
        </WorkbenchPropertyStack>
      }
      label={label}
      title={title}
    />
  );
}

export function IntegrationPathListEditor({
  addAction,
  description,
  emptyState,
  rows,
  title,
}: IntegrationPathListEditorProps) {
  return (
    <WorkbenchPropertyStack gap="sm">
      <IntegrationListHeader actions={addAction} description={description} title={title} />
      {rows.length === 0 ? (
        emptyState
      ) : (
        <WorkbenchPropertyStack gap="xs">
          {rows.map((row) => (
            <IntegrationEditorRow
              key={row.id}
              actions={row.actions}
              description={row.description}
              editor={row.editor}
              label={row.label}
            />
          ))}
        </WorkbenchPropertyStack>
      )}
    </WorkbenchPropertyStack>
  );
}

export function IntegrationListEditorEmptyState({
  action,
  description,
}: IntegrationListEditorEmptyStateProps) {
  return (
    <WorkbenchPropertyCard className="border-dashed" data-empty="true">
      <IntegrationBodyText size="compact">{description}</IntegrationBodyText>
      {hasRenderableNode(action) ? <div className="mt-2">{action}</div> : null}
    </WorkbenchPropertyCard>
  );
}

export function IntegrationAccountRowEditor({
  actions,
  description,
  fields,
  footer,
  title,
}: IntegrationAccountRowEditorProps) {
  return (
    <IntegrationEditorRow
      actions={actions}
      description={description}
      editor={
        <>
          <WorkbenchPropertyGrid columns={2} gap="md">
            {fields.map((field) => (
              <div className="min-w-0" key={field.id}>
                <div className="text-xs font-semibold">{field.label}</div>
                {field.field}
              </div>
            ))}
          </WorkbenchPropertyGrid>
          {hasRenderableNode(footer) ? <div className="mt-2">{footer}</div> : null}
        </>
      }
      label={title}
    />
  );
}

export function IntegrationBodyText({ children, size = 'default' }: IntegrationBodyTextProps) {
  return (
    <WorkbenchPropertyHint
      className={joinClasses('block', size === 'compact' ? 'text-xs' : undefined)}
      data-size={size}
    >
      {children}
    </WorkbenchPropertyHint>
  );
}

function IntegrationListHeader({
  actions,
  description,
  title,
}: {
  actions?: ReactNode;
  description?: ReactNode;
  title?: ReactNode;
}) {
  if (!hasRenderableNode(actions) && !hasRenderableNode(description) && !hasRenderableNode(title)) {
    return null;
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
      <div className="min-w-0">
        {hasRenderableNode(title) ? <div className="text-xs font-semibold">{title}</div> : null}
        <IntegrationEditorDescription>{description}</IntegrationEditorDescription>
      </div>
      {hasRenderableNode(actions) ? (
        <div className="flex min-w-0 justify-end">{actions}</div>
      ) : null}
    </div>
  );
}

function IntegrationEditorRow({
  actions,
  description,
  editor,
  label,
  title,
}: {
  actions?: ReactNode;
  description?: ReactNode;
  editor: ReactNode;
  label?: ReactNode;
  title?: ReactNode;
}) {
  const resolvedTitle = hasRenderableNode(title) ? title : label;

  return (
    <WorkbenchPropertyCard className="grid gap-2">
      {hasRenderableNode(resolvedTitle) || hasRenderableNode(actions) ? (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          {hasRenderableNode(resolvedTitle) ? (
            <div className="text-xs font-semibold">{resolvedTitle}</div>
          ) : null}
          {hasRenderableNode(actions) ? (
            <div className="flex min-w-0 justify-end">{actions}</div>
          ) : null}
        </div>
      ) : null}
      <IntegrationEditorDescription>{description}</IntegrationEditorDescription>
      <div className="min-w-0">{editor}</div>
    </WorkbenchPropertyCard>
  );
}

function IntegrationEditorDescription({ children }: { children?: ReactNode }) {
  if (!hasRenderableNode(children)) {
    return null;
  }

  return <WorkbenchPropertyHint className="block">{children}</WorkbenchPropertyHint>;
}

function hasRenderableNode(node: ReactNode | undefined): boolean {
  return node !== undefined && node !== null && node !== false;
}

function joinClasses(...classes: Array<string | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
