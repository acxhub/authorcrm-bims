/** Manila (GMT+8, no DST) — used for attendance date keys and display. */
export const MANILA_TZ = 'Asia/Manila';

/** Inclusive Manila calendar day bounds as UTC ISO strings for `timestamptz` queries on `clock_in_at`. */
export function manilaDateRangeToUtcIsoRange(fromYmd: string, toYmd: string): { startIso: string; endIso: string } {
  const startIso = new Date(`${fromYmd}T00:00:00+08:00`).toISOString();
  const endIso = new Date(`${toYmd}T23:59:59.999+08:00`).toISOString();
  return { startIso, endIso };
}

/** Today as YYYY-MM-DD in Manila. */
export function manilaTodayYmd(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: MANILA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Manila calendar date (YYYY-MM-DD) for an instant. */
export function toManilaYmd(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: MANILA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Format instant in Manila for UI (date + time). */
export function formatManilaDateTime(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: MANILA_TZ,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

/** Format time only in Manila. */
export function formatManilaTime(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: MANILA_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(d);
}

/** Start of "today" in Manila as Date (local JS Date representing that instant). */
export function manilaStartOfToday(now: Date = new Date()): Date {
  const ymd = manilaTodayYmd(now);
  return new Date(`${ymd}T00:00:00+08:00`);
}
