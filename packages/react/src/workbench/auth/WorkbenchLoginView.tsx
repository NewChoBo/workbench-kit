import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '../../primitives/Button';
import { TextInput } from '../../primitives/TextInput';
import { cx } from '../../utils/cx';

export interface WorkbenchLoginCredentials {
  identifier: string;
  password: string;
}

export interface WorkbenchLoginSubmitContext {
  credentials: WorkbenchLoginCredentials;
  event: FormEvent<HTMLFormElement>;
}

export interface WorkbenchSignUpCredentials {
  displayName: string;
  identifier: string;
  password: string;
  passwordConfirmation: string;
}

export interface WorkbenchSignUpSubmitContext {
  credentials: WorkbenchSignUpCredentials;
  event: FormEvent<HTMLFormElement>;
}

export interface WorkbenchPasswordResetCredentials {
  identifier: string;
}

export interface WorkbenchPasswordResetSubmitContext {
  credentials: WorkbenchPasswordResetCredentials;
  event: FormEvent<HTMLFormElement>;
}

interface WorkbenchAuthFrameProps {
  children: ReactNode;
  formLabel: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitDisabled: boolean;
  actions?: ReactNode;
  brandMark?: ReactNode;
  busy?: boolean;
  busyLabel?: ReactNode;
  className?: string;
  error?: ReactNode;
  footerBrand?: ReactNode;
  productName?: ReactNode;
  secondaryActions?: ReactNode;
  statusLabel?: ReactNode;
  submitLabel?: ReactNode;
}

interface WorkbenchAuthTextFieldProps {
  id: string;
  label: ReactNode;
  autoComplete?: string;
  disabled?: boolean;
  placeholder?: string;
  type?: string;
  value: string;
  onValueChange: (value: string) => void;
}

export interface WorkbenchLoginViewProps {
  actions?: ReactNode;
  brandMark?: ReactNode;
  busy?: boolean;
  busyLabel?: ReactNode;
  className?: string;
  defaultIdentifier?: string;
  defaultPassword?: string;
  disabled?: boolean;
  error?: ReactNode;
  footerBrand?: ReactNode;
  identifier?: string;
  identifierAutoComplete?: string;
  identifierLabel?: ReactNode;
  identifierPlaceholder?: string;
  loginLabel?: string;
  onIdentifierChange?: (value: string) => void;
  onPasswordChange?: (value: string) => void;
  onSubmit?: (context: WorkbenchLoginSubmitContext) => void;
  password?: string;
  passwordAutoComplete?: string;
  passwordLabel?: ReactNode;
  passwordPlaceholder?: string;
  productName?: ReactNode;
  requireCredentials?: boolean;
  secondaryActions?: ReactNode;
  statusLabel?: ReactNode;
  submitLabel?: ReactNode;
}

export interface WorkbenchSignUpViewProps {
  actions?: ReactNode;
  brandMark?: ReactNode;
  busy?: boolean;
  busyLabel?: ReactNode;
  className?: string;
  defaultDisplayName?: string;
  defaultIdentifier?: string;
  defaultPassword?: string;
  defaultPasswordConfirmation?: string;
  disabled?: boolean;
  displayName?: string;
  displayNameAutoComplete?: string;
  displayNameLabel?: ReactNode;
  displayNamePlaceholder?: string;
  error?: ReactNode;
  footerBrand?: ReactNode;
  identifier?: string;
  identifierAutoComplete?: string;
  identifierLabel?: ReactNode;
  identifierPlaceholder?: string;
  onDisplayNameChange?: (value: string) => void;
  onIdentifierChange?: (value: string) => void;
  onPasswordChange?: (value: string) => void;
  onPasswordConfirmationChange?: (value: string) => void;
  onSubmit?: (context: WorkbenchSignUpSubmitContext) => void;
  password?: string;
  passwordAutoComplete?: string;
  passwordConfirmation?: string;
  passwordConfirmationAutoComplete?: string;
  passwordConfirmationLabel?: ReactNode;
  passwordConfirmationPlaceholder?: string;
  passwordLabel?: ReactNode;
  passwordMismatchLabel?: ReactNode;
  passwordPlaceholder?: string;
  productName?: ReactNode;
  requireCredentials?: boolean;
  requirePasswordConfirmation?: boolean;
  secondaryActions?: ReactNode;
  signUpLabel?: string;
  statusLabel?: ReactNode;
  submitLabel?: ReactNode;
}

export interface WorkbenchPasswordResetViewProps {
  actions?: ReactNode;
  brandMark?: ReactNode;
  busy?: boolean;
  busyLabel?: ReactNode;
  className?: string;
  defaultIdentifier?: string;
  disabled?: boolean;
  error?: ReactNode;
  findPasswordLabel?: string;
  footerBrand?: ReactNode;
  identifier?: string;
  identifierAutoComplete?: string;
  identifierLabel?: ReactNode;
  identifierPlaceholder?: string;
  onIdentifierChange?: (value: string) => void;
  onSubmit?: (context: WorkbenchPasswordResetSubmitContext) => void;
  productName?: ReactNode;
  requireCredentials?: boolean;
  secondaryActions?: ReactNode;
  statusLabel?: ReactNode;
  submitLabel?: ReactNode;
}

export function WorkbenchLoginBrandMark() {
  return (
    <div className="workbench-login-brand-mark" aria-hidden>
      <span className="workbench-login-brand-mark__ring workbench-login-brand-mark__ring--primary" />
      <span className="workbench-login-brand-mark__ring workbench-login-brand-mark__ring--secondary" />
      <span className="workbench-login-brand-mark__ring workbench-login-brand-mark__ring--tertiary" />
      <span className="workbench-login-brand-mark__ring workbench-login-brand-mark__ring--small" />
    </div>
  );
}

export function WorkbenchLoginView({
  actions,
  brandMark,
  busy = false,
  busyLabel = 'Signing in...',
  className,
  defaultIdentifier = '',
  defaultPassword = '',
  disabled = false,
  error,
  footerBrand,
  identifier,
  identifierAutoComplete = 'username',
  identifierLabel = 'Email',
  identifierPlaceholder,
  loginLabel = 'Sign in',
  onIdentifierChange,
  onPasswordChange,
  onSubmit,
  password,
  passwordAutoComplete = 'current-password',
  passwordLabel = 'Password',
  passwordPlaceholder,
  productName = 'Sign in',
  requireCredentials = true,
  secondaryActions,
  statusLabel,
  submitLabel = 'Sign in',
}: WorkbenchLoginViewProps) {
  const generatedId = useId().replace(/:/g, '');
  const identifierId = `${generatedId}-signin-identifier`;
  const passwordId = `${generatedId}-signin-password`;
  const [uncontrolledIdentifier, setUncontrolledIdentifier] = useState(defaultIdentifier);
  const [uncontrolledPassword, setUncontrolledPassword] = useState(defaultPassword);
  const resolvedIdentifier = identifier ?? uncontrolledIdentifier;
  const resolvedPassword = password ?? uncontrolledPassword;
  const isLocked = disabled || busy;
  const hasCredentials = Boolean(resolvedIdentifier.trim()) && Boolean(resolvedPassword);
  const isSubmitDisabled = isLocked || (requireCredentials && !hasCredentials);

  const handleIdentifierChange = (value: string) => {
    if (identifier === undefined) {
      setUncontrolledIdentifier(value);
    }

    onIdentifierChange?.(value);
  };

  const handlePasswordChange = (value: string) => {
    if (password === undefined) {
      setUncontrolledPassword(value);
    }

    onPasswordChange?.(value);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitDisabled) return;

    onSubmit?.({
      credentials: {
        identifier: resolvedIdentifier,
        password: resolvedPassword,
      },
      event,
    });
  };

  return (
    <WorkbenchAuthFrame
      actions={actions}
      brandMark={brandMark}
      busy={busy}
      busyLabel={busyLabel}
      className={className}
      error={error}
      footerBrand={footerBrand}
      formLabel={loginLabel}
      productName={productName}
      secondaryActions={secondaryActions}
      statusLabel={statusLabel}
      submitDisabled={isSubmitDisabled}
      submitLabel={submitLabel}
      onSubmit={handleSubmit}
    >
      <WorkbenchAuthTextField
        id={identifierId}
        autoComplete={identifierAutoComplete}
        disabled={isLocked}
        label={identifierLabel}
        placeholder={identifierPlaceholder}
        value={resolvedIdentifier}
        onValueChange={handleIdentifierChange}
      />
      <WorkbenchAuthTextField
        id={passwordId}
        autoComplete={passwordAutoComplete}
        disabled={isLocked}
        label={passwordLabel}
        placeholder={passwordPlaceholder}
        type="password"
        value={resolvedPassword}
        onValueChange={handlePasswordChange}
      />
    </WorkbenchAuthFrame>
  );
}

export function WorkbenchSignUpView({
  actions,
  brandMark,
  busy = false,
  busyLabel = 'Creating account...',
  className,
  defaultDisplayName = '',
  defaultIdentifier = '',
  defaultPassword = '',
  defaultPasswordConfirmation = '',
  disabled = false,
  displayName,
  displayNameAutoComplete = 'name',
  displayNameLabel = 'Name',
  displayNamePlaceholder,
  error,
  footerBrand,
  identifier,
  identifierAutoComplete = 'email',
  identifierLabel = 'Email',
  identifierPlaceholder,
  onDisplayNameChange,
  onIdentifierChange,
  onPasswordChange,
  onPasswordConfirmationChange,
  onSubmit,
  password,
  passwordAutoComplete = 'new-password',
  passwordConfirmation,
  passwordConfirmationAutoComplete = 'new-password',
  passwordConfirmationLabel = 'Confirm password',
  passwordConfirmationPlaceholder,
  passwordLabel = 'Password',
  passwordMismatchLabel = 'Passwords do not match.',
  passwordPlaceholder,
  productName = 'Create account',
  requireCredentials = true,
  requirePasswordConfirmation = true,
  secondaryActions,
  signUpLabel = 'Create account',
  statusLabel,
  submitLabel = 'Create account',
}: WorkbenchSignUpViewProps) {
  const generatedId = useId().replace(/:/g, '');
  const displayNameId = `${generatedId}-signup-display-name`;
  const identifierId = `${generatedId}-signup-identifier`;
  const passwordId = `${generatedId}-signup-password`;
  const passwordConfirmationId = `${generatedId}-signup-password-confirmation`;
  const [uncontrolledDisplayName, setUncontrolledDisplayName] = useState(defaultDisplayName);
  const [uncontrolledIdentifier, setUncontrolledIdentifier] = useState(defaultIdentifier);
  const [uncontrolledPassword, setUncontrolledPassword] = useState(defaultPassword);
  const [uncontrolledPasswordConfirmation, setUncontrolledPasswordConfirmation] = useState(
    defaultPasswordConfirmation,
  );
  const resolvedDisplayName = displayName ?? uncontrolledDisplayName;
  const resolvedIdentifier = identifier ?? uncontrolledIdentifier;
  const resolvedPassword = password ?? uncontrolledPassword;
  const resolvedPasswordConfirmation = passwordConfirmation ?? uncontrolledPasswordConfirmation;
  const isLocked = disabled || busy;
  const passwordsAreComparable = Boolean(resolvedPassword && resolvedPasswordConfirmation);
  const hasPasswordMismatch =
    requirePasswordConfirmation &&
    passwordsAreComparable &&
    resolvedPassword !== resolvedPasswordConfirmation;
  const hasCredentials =
    Boolean(resolvedDisplayName.trim()) &&
    Boolean(resolvedIdentifier.trim()) &&
    Boolean(resolvedPassword) &&
    (!requirePasswordConfirmation || Boolean(resolvedPasswordConfirmation));
  const isSubmitDisabled =
    isLocked || hasPasswordMismatch || (requireCredentials && !hasCredentials);
  const resolvedError = error ?? (hasPasswordMismatch ? passwordMismatchLabel : undefined);

  const handleDisplayNameChange = (value: string) => {
    if (displayName === undefined) {
      setUncontrolledDisplayName(value);
    }

    onDisplayNameChange?.(value);
  };

  const handleIdentifierChange = (value: string) => {
    if (identifier === undefined) {
      setUncontrolledIdentifier(value);
    }

    onIdentifierChange?.(value);
  };

  const handlePasswordChange = (value: string) => {
    if (password === undefined) {
      setUncontrolledPassword(value);
    }

    onPasswordChange?.(value);
  };

  const handlePasswordConfirmationChange = (value: string) => {
    if (passwordConfirmation === undefined) {
      setUncontrolledPasswordConfirmation(value);
    }

    onPasswordConfirmationChange?.(value);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitDisabled) return;

    onSubmit?.({
      credentials: {
        displayName: resolvedDisplayName,
        identifier: resolvedIdentifier,
        password: resolvedPassword,
        passwordConfirmation: resolvedPasswordConfirmation,
      },
      event,
    });
  };

  return (
    <WorkbenchAuthFrame
      actions={actions}
      brandMark={brandMark}
      busy={busy}
      busyLabel={busyLabel}
      className={className}
      error={resolvedError}
      footerBrand={footerBrand}
      formLabel={signUpLabel}
      productName={productName}
      secondaryActions={secondaryActions}
      statusLabel={statusLabel}
      submitDisabled={isSubmitDisabled}
      submitLabel={submitLabel}
      onSubmit={handleSubmit}
    >
      <WorkbenchAuthTextField
        id={displayNameId}
        autoComplete={displayNameAutoComplete}
        disabled={isLocked}
        label={displayNameLabel}
        placeholder={displayNamePlaceholder}
        value={resolvedDisplayName}
        onValueChange={handleDisplayNameChange}
      />
      <WorkbenchAuthTextField
        id={identifierId}
        autoComplete={identifierAutoComplete}
        disabled={isLocked}
        label={identifierLabel}
        placeholder={identifierPlaceholder}
        value={resolvedIdentifier}
        onValueChange={handleIdentifierChange}
      />
      <WorkbenchAuthTextField
        id={passwordId}
        autoComplete={passwordAutoComplete}
        disabled={isLocked}
        label={passwordLabel}
        placeholder={passwordPlaceholder}
        type="password"
        value={resolvedPassword}
        onValueChange={handlePasswordChange}
      />
      {requirePasswordConfirmation ? (
        <WorkbenchAuthTextField
          id={passwordConfirmationId}
          autoComplete={passwordConfirmationAutoComplete}
          disabled={isLocked}
          label={passwordConfirmationLabel}
          placeholder={passwordConfirmationPlaceholder}
          type="password"
          value={resolvedPasswordConfirmation}
          onValueChange={handlePasswordConfirmationChange}
        />
      ) : null}
    </WorkbenchAuthFrame>
  );
}

export function WorkbenchPasswordResetView({
  actions,
  brandMark,
  busy = false,
  busyLabel = 'Sending...',
  className,
  defaultIdentifier = '',
  disabled = false,
  error,
  findPasswordLabel = 'Find password',
  footerBrand,
  identifier,
  identifierAutoComplete = 'email',
  identifierLabel = 'Email',
  identifierPlaceholder,
  onIdentifierChange,
  onSubmit,
  productName = 'Find password',
  requireCredentials = true,
  secondaryActions,
  statusLabel,
  submitLabel = 'Send reset link',
}: WorkbenchPasswordResetViewProps) {
  const generatedId = useId().replace(/:/g, '');
  const identifierId = `${generatedId}-password-reset-identifier`;
  const [uncontrolledIdentifier, setUncontrolledIdentifier] = useState(defaultIdentifier);
  const resolvedIdentifier = identifier ?? uncontrolledIdentifier;
  const isLocked = disabled || busy;
  const hasCredentials = Boolean(resolvedIdentifier.trim());
  const isSubmitDisabled = isLocked || (requireCredentials && !hasCredentials);

  const handleIdentifierChange = (value: string) => {
    if (identifier === undefined) {
      setUncontrolledIdentifier(value);
    }

    onIdentifierChange?.(value);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitDisabled) return;

    onSubmit?.({
      credentials: {
        identifier: resolvedIdentifier,
      },
      event,
    });
  };

  return (
    <WorkbenchAuthFrame
      actions={actions}
      brandMark={brandMark}
      busy={busy}
      busyLabel={busyLabel}
      className={className}
      error={error}
      footerBrand={footerBrand}
      formLabel={findPasswordLabel}
      productName={productName}
      secondaryActions={secondaryActions}
      statusLabel={statusLabel}
      submitDisabled={isSubmitDisabled}
      submitLabel={submitLabel}
      onSubmit={handleSubmit}
    >
      <WorkbenchAuthTextField
        id={identifierId}
        autoComplete={identifierAutoComplete}
        disabled={isLocked}
        label={identifierLabel}
        placeholder={identifierPlaceholder}
        value={resolvedIdentifier}
        onValueChange={handleIdentifierChange}
      />
    </WorkbenchAuthFrame>
  );
}

function WorkbenchAuthFrame({
  actions,
  brandMark,
  busy = false,
  busyLabel,
  children,
  className,
  error,
  footerBrand,
  formLabel,
  onSubmit,
  productName,
  secondaryActions,
  statusLabel,
  submitDisabled,
  submitLabel,
}: WorkbenchAuthFrameProps) {
  return (
    <section
      className={cx('workbench-login-view', className)}
      aria-label={formLabel}
      aria-busy={busy || undefined}
    >
      <div className="workbench-login-view__brand-pane">
        <div className="workbench-login-view__mark">{brandMark ?? <WorkbenchLoginBrandMark />}</div>
        {footerBrand ? (
          <div className="workbench-login-view__footer-brand">{footerBrand}</div>
        ) : null}
      </div>

      <form className="workbench-login-view__form" onSubmit={onSubmit}>
        <div className="workbench-login-view__heading">
          <h1 className="workbench-login-view__title">{productName}</h1>
          {statusLabel ? <p className="workbench-login-view__status">{statusLabel}</p> : null}
        </div>

        <div className="workbench-login-view__fields">{children}</div>

        {error ? (
          <div className="workbench-login-view__error" role="alert">
            {error}
          </div>
        ) : null}

        <div className="workbench-login-view__actions">
          {actions}
          <Button disabled={submitDisabled} variant="primary" type="submit">
            {busy ? busyLabel : submitLabel}
          </Button>
        </div>

        {secondaryActions ? (
          <div className="workbench-login-view__secondary-actions">{secondaryActions}</div>
        ) : null}
      </form>
    </section>
  );
}

function WorkbenchAuthTextField({
  id,
  autoComplete,
  disabled,
  label,
  placeholder,
  type,
  value,
  onValueChange,
}: WorkbenchAuthTextFieldProps) {
  return (
    <div className="workbench-login-view__field">
      <label className="workbench-login-view__label" htmlFor={id}>
        {label}
      </label>
      <TextInput
        id={id}
        autoComplete={autoComplete}
        controlWidth="full"
        disabled={disabled}
        placeholder={placeholder}
        type={type}
        value={value}
        onValueChange={onValueChange}
      />
    </div>
  );
}
