export function normalizeErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  if (error instanceof Error) {
    return error.message.trim() || fallback;
  }

  if (typeof error === 'string') {
    return error.trim() || fallback;
  }

  if (error === null || error === undefined) {
    return fallback;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return fallback;
  }
}

export function isNetworkTransportError(message: string): boolean {
  const lower = message.toLowerCase();

  return (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('load failed')
  );
}
