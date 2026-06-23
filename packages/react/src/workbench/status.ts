export type WorkbenchStatus =
  | 'idle'
  | 'running'
  | 'completed'
  | 'failed'
  | 'warning'
  | 'waiting'
  | 'cancelled'
  | 'disabled'
  | 'unavailable';

export type WorkbenchStatusVariant =
  | 'accent'
  | 'danger'
  | 'muted'
  | 'neutral'
  | 'success'
  | 'warning';

export interface WorkbenchStatusDescriptor {
  busy: boolean;
  disabled: boolean;
  label: string;
  status: WorkbenchStatus;
  unavailable: boolean;
  variant: WorkbenchStatusVariant;
}

const workbenchStatusDescriptors: Record<WorkbenchStatus, WorkbenchStatusDescriptor> = {
  cancelled: {
    busy: false,
    disabled: false,
    label: 'Cancelled',
    status: 'cancelled',
    unavailable: false,
    variant: 'muted',
  },
  completed: {
    busy: false,
    disabled: false,
    label: 'Completed',
    status: 'completed',
    unavailable: false,
    variant: 'success',
  },
  disabled: {
    busy: false,
    disabled: true,
    label: 'Disabled',
    status: 'disabled',
    unavailable: false,
    variant: 'muted',
  },
  failed: {
    busy: false,
    disabled: false,
    label: 'Failed',
    status: 'failed',
    unavailable: false,
    variant: 'danger',
  },
  warning: {
    busy: false,
    disabled: false,
    label: 'Warning',
    status: 'warning',
    unavailable: false,
    variant: 'warning',
  },
  idle: {
    busy: false,
    disabled: false,
    label: 'Idle',
    status: 'idle',
    unavailable: false,
    variant: 'neutral',
  },
  running: {
    busy: true,
    disabled: false,
    label: 'Running',
    status: 'running',
    unavailable: false,
    variant: 'accent',
  },
  unavailable: {
    busy: false,
    disabled: true,
    label: 'Unavailable',
    status: 'unavailable',
    unavailable: true,
    variant: 'muted',
  },
  waiting: {
    busy: false,
    disabled: false,
    label: 'Waiting',
    status: 'waiting',
    unavailable: false,
    variant: 'warning',
  },
};

export function getWorkbenchStatusDescriptor(status: WorkbenchStatus): WorkbenchStatusDescriptor {
  return workbenchStatusDescriptors[status];
}

export function getWorkbenchStatusLabel(status: WorkbenchStatus) {
  return getWorkbenchStatusDescriptor(status).label;
}

export function getWorkbenchStatusVariant(status: WorkbenchStatus) {
  return getWorkbenchStatusDescriptor(status).variant;
}

export function isWorkbenchStatusBusy(status: WorkbenchStatus) {
  return getWorkbenchStatusDescriptor(status).busy;
}

export function isWorkbenchStatusDisabled(status: WorkbenchStatus) {
  return getWorkbenchStatusDescriptor(status).disabled;
}

export function isWorkbenchStatusUnavailable(status: WorkbenchStatus) {
  return getWorkbenchStatusDescriptor(status).unavailable;
}

export function isWorkbenchStatus(status: string): status is WorkbenchStatus {
  return Object.prototype.hasOwnProperty.call(workbenchStatusDescriptors, status);
}

export function workbenchStatusFromLifecycleStatus(status: string): WorkbenchStatus {
  if (isWorkbenchStatus(status)) return status;
  if (status === 'error') return 'failed';
  if (status === 'pending') return 'waiting';
  if (status === 'done' || status === 'success') return 'completed';
  return 'idle';
}
