import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  WorkbenchConfirmationFlow,
  getWorkbenchConfirmationButtonVariant,
  getWorkbenchConfirmationConfirmLabel,
  getWorkbenchConfirmationSideEffect,
  getWorkbenchConfirmationStatus,
  getWorkbenchConfirmationVariant,
  isWorkbenchConfirmationActionDisabled,
  type WorkbenchConfirmationAction,
} from './ConfirmationFlow';

const defaultAction: WorkbenchConfirmationAction = {
  detail: <code>draft.md</code>,
  id: 'save-draft',
  message: 'Save this draft before closing?',
  sideEffect: 'workspace-write',
  title: 'Save Draft',
};

describe('WorkbenchConfirmationFlow helpers', () => {
  it('resolves default and danger variants', () => {
    expect(getWorkbenchConfirmationVariant(defaultAction)).toBe('default');
    expect(getWorkbenchConfirmationVariant({ ...defaultAction, danger: true })).toBe('danger');
    expect(getWorkbenchConfirmationButtonVariant(defaultAction)).toBe('primary');
    expect(getWorkbenchConfirmationButtonVariant({ ...defaultAction, variant: 'danger' })).toBe(
      'danger',
    );
  });

  it('resolves status, labels, side effects, and disabled state', () => {
    expect(getWorkbenchConfirmationStatus({ action: defaultAction })).toBe('idle');
    expect(getWorkbenchConfirmationStatus({ action: defaultAction, pending: true })).toBe(
      'running',
    );
    expect(getWorkbenchConfirmationConfirmLabel({ action: defaultAction })).toBe('Confirm');
    expect(
      getWorkbenchConfirmationConfirmLabel({
        action: { ...defaultAction, pendingLabel: 'Saving...' },
        pending: true,
      }),
    ).toBe('Saving...');
    expect(getWorkbenchConfirmationSideEffect(defaultAction)).toBe('workspace-write');
    expect(isWorkbenchConfirmationActionDisabled({ ...defaultAction, status: 'unavailable' })).toBe(
      true,
    );
  });
});

describe('WorkbenchConfirmationFlow rendering', () => {
  it('renders an accessible default confirmation dialog', () => {
    const markup = renderToStaticMarkup(<WorkbenchConfirmationFlow action={defaultAction} />);

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain('Save Draft');
    expect(markup).toContain('Save this draft before closing?');
    expect(markup).toContain('workspace-write');
    expect(markup).toContain('data-variant="primary"');
  });

  it('renders danger, pending, and disabled states', () => {
    const dangerMarkup = renderToStaticMarkup(
      <WorkbenchConfirmationFlow
        action={{
          ...defaultAction,
          confirmLabel: 'Delete',
          danger: true,
          id: 'delete-draft',
          message: 'Delete this item?',
          sideEffect: 'external-write',
          title: 'Delete Item',
        }}
      />,
    );
    const pendingMarkup = renderToStaticMarkup(
      <WorkbenchConfirmationFlow action={defaultAction} pending />,
    );
    const disabledMarkup = renderToStaticMarkup(
      <WorkbenchConfirmationFlow
        action={{
          ...defaultAction,
          disabled: true,
          disabledReason: 'This action is currently unavailable.',
        }}
      />,
    );

    expect(dangerMarkup).toContain('data-variant="danger"');
    expect(dangerMarkup).toContain('Delete this item?');
    expect(pendingMarkup).toContain('aria-busy="true"');
    expect(pendingMarkup).toContain('data-status="running"');
    expect(pendingMarkup).toContain('Working...');
    expect(disabledMarkup).toContain('disabled=""');
    expect(disabledMarkup).toContain('This action is currently unavailable.');
  });

  it('does not render without an action or when closed', () => {
    expect(renderToStaticMarkup(<WorkbenchConfirmationFlow action={null} />)).toBe('');
    expect(
      renderToStaticMarkup(<WorkbenchConfirmationFlow action={defaultAction} open={false} />),
    ).toBe('');
  });
});
