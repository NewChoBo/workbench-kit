/** Shared text algorithms; coercion belongs to the legacy adapter only. */
export function trimText(value: string): string {
  return value.trim();
}

export function uppercaseText(value: string): string {
  return value.toUpperCase();
}

export function lowercaseText(value: string): string {
  return value.toLowerCase();
}
