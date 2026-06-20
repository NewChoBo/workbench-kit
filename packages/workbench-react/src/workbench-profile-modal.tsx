import { Modal } from '@workbench-kit/react/modal';
import { Badge, Button } from '@workbench-kit/react/primitives';
import type { ReactNode } from 'react';

export interface WorkbenchProfileDetail {
  readonly label: string;
  readonly value: ReactNode;
}

export interface WorkbenchProfileInput {
  readonly accountId?: string | undefined;
  readonly displayName: string;
  readonly email?: string | undefined;
  readonly providerLabel?: string | undefined;
  readonly roleLabel?: string | undefined;
  readonly sessionLabel?: string | undefined;
  readonly statusLabel?: string | undefined;
  readonly workspaceLabel?: string | undefined;
  readonly details?: readonly WorkbenchProfileDetail[] | undefined;
  readonly onSignOut?: (() => void) | undefined;
}

export interface WorkbenchProfileModalProps {
  profile: WorkbenchProfileInput;
  onClose: () => void;
}

export function WorkbenchProfileModal({ profile, onClose }: WorkbenchProfileModalProps) {
  const initials = getProfileInitials(profile.displayName);
  const details = createProfileDetails(profile);

  return (
    <Modal
      bodyLayout="stack"
      bodyPadding="lg"
      bodyScroll="auto"
      className="workbench-profile-modal"
      closeLabel="Close profile"
      footer={
        <>
          {profile.onSignOut ? (
            <Button type="button" variant="danger" onClick={profile.onSignOut}>
              Sign out
            </Button>
          ) : null}
          <span className="workbench-profile-modal__footer-spacer" />
          <Button type="button" onClick={onClose}>
            Close
          </Button>
        </>
      }
      title="Profile"
      titleSuffix={
        profile.statusLabel ? <Badge variant="accent">{profile.statusLabel}</Badge> : null
      }
      onClose={onClose}
    >
      <section className="workbench-profile-card" aria-label="Workbench profile">
        <div className="workbench-profile-card__avatar" aria-hidden="true">
          {initials}
        </div>
        <div className="workbench-profile-card__identity">
          <h2>{profile.displayName}</h2>
          {profile.email ? <p>{profile.email}</p> : null}
        </div>
      </section>

      {profile.sessionLabel ? (
        <p className="workbench-profile-session" role="status">
          {profile.sessionLabel}
        </p>
      ) : null}

      <section className="workbench-profile-section" aria-label="Account details">
        <h3>Account</h3>
        <dl className="workbench-profile-detail-grid">
          {details.map((detail) => (
            <div key={detail.label}>
              <dt>{detail.label}</dt>
              <dd>{detail.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </Modal>
  );
}

function createProfileDetails(profile: WorkbenchProfileInput): WorkbenchProfileDetail[] {
  return [
    ...(profile.providerLabel ? [{ label: 'Provider', value: profile.providerLabel }] : []),
    ...(profile.roleLabel ? [{ label: 'Role', value: profile.roleLabel }] : []),
    ...(profile.workspaceLabel ? [{ label: 'Workspace', value: profile.workspaceLabel }] : []),
    ...(profile.accountId
      ? [{ label: 'Account ID', value: <code>{profile.accountId}</code> }]
      : []),
    ...(profile.details ?? []),
  ];
}

function getProfileInitials(displayName: string): string {
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return initials || 'U';
}
