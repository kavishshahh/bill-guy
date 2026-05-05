/** DD-MM-YYYY string from parts */
export function padDateParts(dd: number, mm: number, yyyy: number): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(dd)}-${p(mm)}-${yyyy}`;
}

function startOfCalendarDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** ISO date yyyy-mm-dd to local midnight */
export function parseIsoLocal(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return startOfCalendarDay(new Date(y, m - 1, d));
}

/**
 * If input is exactly 4 digits DDMM (or pasted with separators), infer year so the
 * date falls inside [fyStart, fyEnd] inclusive (local calendar days).
 */
export function expandDdmmInFy(
  raw: string,
  fyStartIso: string,
  fyEndIso: string
): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 4) return null;
  const dd = parseInt(digits.slice(0, 2), 10);
  const mm = parseInt(digits.slice(2, 4), 10);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

  const fyStart = parseIsoLocal(fyStartIso);
  const fyEnd = parseIsoLocal(fyEndIso);
  const yMin = fyStart.getFullYear() - 1;
  const yMax = fyEnd.getFullYear() + 1;

  for (let y = yMin; y <= yMax; y++) {
    const candidate = startOfCalendarDay(new Date(y, mm - 1, dd));
    if (candidate.getDate() !== dd) continue;
    if (candidate >= fyStart && candidate <= fyEnd) {
      return padDateParts(dd, mm, y);
    }
  }
  return null;
}

/**
 * Normalize typed dates to yyyy-mm-dd for APIs.
 * Accepts YYYY-MM-DD, DD-MM-YYYY, or DD/MM/YYYY (day and month may be 1–2 digits).
 */
export function toApiDate(displayOrIso: string): string | null {
  const s = displayOrIso.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(s);
  if (!m) return null;

  const dd = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const yyyy = parseInt(m[3], 10);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

  const cal = new Date(yyyy, mm - 1, dd);
  if (
    cal.getFullYear() !== yyyy ||
    cal.getMonth() !== mm - 1 ||
    cal.getDate() !== dd
  ) {
    return null;
  }

  const p = (n: number) => String(n).padStart(2, "0");
  return `${yyyy}-${p(mm)}-${p(dd)}`;
}
