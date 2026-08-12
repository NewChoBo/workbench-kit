export interface PrivilegedAssetProtocolScheme {
  readonly scheme: string;
  readonly privileges: {
    readonly corsEnabled: boolean;
    readonly secure: true;
    readonly standard: true;
    readonly stream: true;
    readonly supportFetchAPI: true;
  };
}

export interface PrivilegedAssetProtocolRegistrar {
  registerSchemesAsPrivileged(schemes: PrivilegedAssetProtocolScheme[]): void;
}

export interface RegisterPrivilegedAssetProtocolSchemeOptions {
  /** Enable CORS only when the host's protocol response must cross origins. */
  readonly corsEnabled?: boolean;
}

/**
 * Registers an asset scheme with Electron's standard secure/fetch/stream privileges.
 * Call this before app readiness; the host owns request parsing, response policy,
 * and the later `protocol.handle` registration.
 */
export function registerPrivilegedAssetProtocolScheme(
  protocol: PrivilegedAssetProtocolRegistrar,
  scheme: string,
  options: RegisterPrivilegedAssetProtocolSchemeOptions = {},
): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme,
      privileges: {
        corsEnabled: options.corsEnabled ?? false,
        secure: true,
        standard: true,
        stream: true,
        supportFetchAPI: true,
      },
    },
  ]);
}
