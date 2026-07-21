export type DateParts = { readonly year: string; readonly month: string; readonly day: string };

const FORMAT_TOKEN_RE = /YYYY|MM|DD/g;

/** Parse a date string with a simple token format (YYYY/MM/DD only). */
export function parseDateParts(value: string, inputFormat: string): DateParts | undefined {
  const format = inputFormat.trim();
  const raw = value.trim();
  if (!format || !raw) {
    return undefined;
  }

  let year = '';
  let month = '';
  let day = '';
  let cursor = 0;

  for (let i = 0; i < format.length;) {
    if (format.startsWith('YYYY', i)) {
      year = raw.slice(cursor, cursor + 4);
      if (!/^\d{4}$/.test(year)) {
        return undefined;
      }
      cursor += 4;
      i += 4;
      continue;
    }
    if (format.startsWith('MM', i)) {
      month = raw.slice(cursor, cursor + 2);
      if (!/^\d{2}$/.test(month)) {
        return undefined;
      }
      cursor += 2;
      i += 2;
      continue;
    }
    if (format.startsWith('DD', i)) {
      day = raw.slice(cursor, cursor + 2);
      if (!/^\d{2}$/.test(day)) {
        return undefined;
      }
      cursor += 2;
      i += 2;
      continue;
    }
    if (raw[cursor] !== format[i]) {
      return undefined;
    }
    cursor += 1;
    i += 1;
  }

  if (cursor !== raw.length || !year || !month || !day) {
    return undefined;
  }
  return { year, month, day };
}

export function formatDateParts(parts: DateParts, outputFormat: string): string {
  return outputFormat.replace(FORMAT_TOKEN_RE, (token) => {
    if (token === 'YYYY') {
      return parts.year;
    }
    if (token === 'MM') {
      return parts.month;
    }
    return parts.day;
  });
}

export function reformatDateString(
  value: string,
  inputFormat: string,
  outputFormat: string,
): string | undefined {
  const parts = parseDateParts(value, inputFormat);
  if (!parts) {
    return undefined;
  }
  return formatDateParts(parts, outputFormat);
}

/** Split `YYYY-MM-DDTHH:mm:ss` / `YYYY-MM-DD HH:mm:ss` / date-only. */
export function splitDateTimeString(value: string): { date: string; time: string } | undefined {
  const raw = value.trim();
  if (!raw) {
    return undefined;
  }
  const tIndex = raw.indexOf('T');
  const spaceIndex = raw.indexOf(' ');
  const splitAt = tIndex >= 0 ? tIndex : spaceIndex;
  if (splitAt < 0) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw) || /^\d{8}$/.test(raw)) {
      return { date: raw, time: '' };
    }
    return undefined;
  }
  return {
    date: raw.slice(0, splitAt),
    time: raw.slice(splitAt + 1),
  };
}
