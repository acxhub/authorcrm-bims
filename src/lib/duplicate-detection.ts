/**
 * Duplicate-lead detection helpers — the client-side mirror of the SQL in
 * migration 041 (check_lead_duplicates / check_lead_duplicates_batch and the
 * leads.*_key generated columns). Keep normalization identical on both sides.
 *
 * Core rule: two leads are duplicates when they match on >=2 of
 * {name, book, phone, email} using normalized values. Empty values never match.
 */

export type DuplicatePoint = 'name' | 'book' | 'phone' | 'email';
export type DuplicateTier = 'HIGH' | 'MEDIUM' | 'LOW';

/** Anything with the lead contact fields (form values, parsed import rows, lead rows). */
export interface DuplicateInput {
  author_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  book_title?: string | null;
  phone_number_1?: string | null;
  phone_number_2?: string | null;
  alternative_phone_number?: string | null;
  primary_email?: string | null;
  secondary_email?: string | null;
  alternative_email?: string | null;
}

/** lower + trim + collapse internal whitespace. */
const collapse = (value?: string | null): string =>
  (value ?? '').toString().toLowerCase().trim().replace(/\s+/g, ' ');

export const normalizeName = (input: DuplicateInput): string => {
  const author = collapse(input.author_name);
  if (author) return author;
  return collapse(`${input.first_name ?? ''} ${input.last_name ?? ''}`);
};

export const normalizeBook = (input: DuplicateInput): string => collapse(input.book_title);

/**
 * Digits only; drop a leading US country code '1' on 11-digit numbers so that
 * "+1 555…" matches a stored 10-digit "555…". Mirrors SQL public.dup_phone_key.
 */
export const normalizePhone = (value?: string | null): string => {
  const digits = (value ?? '').toString().replace(/\D/g, '');
  return digits.length === 11 && digits[0] === '1' ? digits.slice(1) : digits;
};

export const normalizeEmail = (value?: string | null): string =>
  (value ?? '').toString().toLowerCase().trim();

const uniqNonEmpty = (values: string[]): string[] =>
  [...new Set(values.filter(Boolean))];

/** All normalized phone keys across the three phone columns. */
export const phoneKeys = (input: DuplicateInput): string[] =>
  uniqNonEmpty(
    [input.phone_number_1, input.phone_number_2, input.alternative_phone_number].map(normalizePhone)
  );

/** All normalized email keys across the three email columns. */
export const emailKeys = (input: DuplicateInput): string[] =>
  uniqNonEmpty(
    [input.primary_email, input.secondary_email, input.alternative_email].map(normalizeEmail)
  );

const overlaps = (a: string[], b: string[]): boolean => a.some((v) => b.includes(v));

/** Which of the 4 identity points two leads share (normalized, empties excluded). */
export const matchedFields = (a: DuplicateInput, b: DuplicateInput): DuplicatePoint[] => {
  const fields: DuplicatePoint[] = [];
  const aName = normalizeName(a);
  const bName = normalizeName(b);
  if (aName && aName === bName) fields.push('name');
  const aBook = normalizeBook(a);
  const bBook = normalizeBook(b);
  if (aBook && aBook === bBook) fields.push('book');
  if (overlaps(phoneKeys(a), phoneKeys(b))) fields.push('phone');
  if (overlaps(emailKeys(a), emailKeys(b))) fields.push('email');
  return fields;
};

export const pointsMatched = (a: DuplicateInput, b: DuplicateInput): number =>
  matchedFields(a, b).length;

export const isDuplicate = (a: DuplicateInput, b: DuplicateInput): boolean =>
  pointsMatched(a, b) >= 2;

const has = (fields: DuplicatePoint[], ...points: DuplicatePoint[]) =>
  points.every((p) => fields.includes(p));

/** Severity tier from the matched points (spec §3). */
export const severityTier = (matchedOn: DuplicatePoint[] | string[]): DuplicateTier => {
  const f = matchedOn as DuplicatePoint[];
  if (has(f, 'phone', 'email') || has(f, 'name', 'email') || has(f, 'name', 'phone')) return 'HIGH';
  if (has(f, 'name', 'book') || has(f, 'phone', 'book') || has(f, 'email', 'book')) return 'MEDIUM';
  return 'LOW';
};

/** Human-friendly field labels for the UI. */
export const FIELD_LABELS: Record<DuplicatePoint, string> = {
  name: 'Name',
  book: 'Book Title',
  phone: 'Phone',
  email: 'Email',
};
