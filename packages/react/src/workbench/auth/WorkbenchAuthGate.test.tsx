import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WorkbenchAuthGate } from './WorkbenchAuthGate';
import {
  WorkbenchLoginView,
  WorkbenchPasswordResetView,
  WorkbenchSignUpView,
} from './WorkbenchLoginView';

describe('WorkbenchLoginView rendering', () => {
  it('renders a branded sign-in form', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchLoginView
        defaultIdentifier="operator"
        defaultPassword="secret"
        footerBrand="Secure workspace access"
        productName="Sign in"
      />,
    );

    expect(markup).toContain('aria-label="Sign in"');
    expect(markup).toContain('Secure workspace access');
    expect(markup).toContain('autoComplete="username"');
    expect(markup).toContain('autoComplete="current-password"');
    expect(markup).not.toContain('disabled=""');
  });

  it('renders matching sign-up and password reset forms', () => {
    const signUpMarkup = renderToStaticMarkup(
      <WorkbenchSignUpView
        defaultDisplayName="Operator"
        defaultIdentifier="operator@example.com"
        defaultPassword="secret"
        defaultPasswordConfirmation="secret"
        footerBrand="Secure workspace access"
      />,
    );
    const resetMarkup = renderToStaticMarkup(
      <WorkbenchPasswordResetView
        defaultIdentifier="operator@example.com"
        footerBrand="Secure workspace access"
      />,
    );

    expect(signUpMarkup).toContain('aria-label="Create account"');
    expect(signUpMarkup).toContain('Confirm password');
    expect(signUpMarkup).toContain('autoComplete="new-password"');
    expect(signUpMarkup).not.toContain('disabled=""');
    expect(resetMarkup).toContain('aria-label="Find password"');
    expect(resetMarkup).toContain('Send reset link');
    expect(resetMarkup).toContain('autoComplete="email"');
  });
});

describe('WorkbenchAuthGate rendering', () => {
  it('renders protected content when authenticated', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchAuthGate authStatus="authenticated">
        <main>Protected workspace</main>
      </WorkbenchAuthGate>,
    );

    expect(markup).toContain('Protected workspace');
    expect(markup).not.toContain('Sign in');
  });

  it('renders login and expired states before access is granted', () => {
    const loginMarkup = renderToStaticMarkup(
      <WorkbenchAuthGate authStatus="unauthenticated" loginViewProps={{ productName: 'Sign in' }}>
        <main>Protected workspace</main>
      </WorkbenchAuthGate>,
    );
    const expiredMarkup = renderToStaticMarkup(
      <WorkbenchAuthGate authStatus="expired">
        <main>Protected workspace</main>
      </WorkbenchAuthGate>,
    );

    expect(loginMarkup).toContain('Sign in');
    expect(loginMarkup).not.toContain('Protected workspace');
    expect(expiredMarkup).toContain('role="alert"');
    expect(expiredMarkup).toContain('Your session expired.');
  });

  it('renders a loading status while the host checks the session', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchAuthGate authStatus="loading">
        <main>Protected workspace</main>
      </WorkbenchAuthGate>,
    );

    expect(markup).toContain('role="status"');
    expect(markup).toContain('Checking session...');
    expect(markup).not.toContain('Protected workspace');
  });
});
