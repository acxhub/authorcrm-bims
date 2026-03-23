/** Minimal lead fields needed for author display (list cards, pipeline, etc.) */
export type LeadDisplayFields = {
  author_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  pen_name?: string | null;
};

/** Legal / primary author name without pen name suffix */
export function getLeadAuthorBaseName(lead: LeadDisplayFields): string {
  const fromAuthor = lead.author_name?.trim();
  if (fromAuthor) return fromAuthor;
  const first = lead.first_name?.trim() || '';
  const last = lead.last_name?.trim() || '';
  const combined = `${first} ${last}`.trim();
  return combined || 'Unknown';
}

/** e.g. "Jane Doe (J.D. Writer)" when pen_name is set */
export function getLeadDisplayName(lead: LeadDisplayFields): string {
  const base = getLeadAuthorBaseName(lead);
  const pen = lead.pen_name?.trim();
  if (pen && pen.toLowerCase() !== base.toLowerCase()) {
    return `${base} (${pen})`;
  }
  return base;
}
