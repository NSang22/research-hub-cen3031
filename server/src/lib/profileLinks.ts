export interface ProfileLink {
  id: string;
  label: string;
  url: string;
}

/**
 * Returns true if the string is a valid http:// or https:// URL.
 */
export function isValidUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Parses a raw value into a sanitized array of ProfileLinks.
 * Validates each entry, strips whitespace, and enforces the 5-link cap.
 */
export function parseProfileLinks(raw: unknown): ProfileLink[] {
  if (!Array.isArray(raw)) return [];
  const out: ProfileLink[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : null;
    const label = typeof o.label === 'string' ? o.label.trim() : '';
    const url = typeof o.url === 'string' ? o.url.trim() : '';
    if (!id || !label || !url) continue;
    if (!isValidUrl(url)) continue;
    out.push({ id, label, url });
  }
  return out.slice(0, 5);
}

/**
 * Validates a raw links value for use in profile update requests.
 * Returns null if valid, or an error message string describing the problem.
 */
export function validateProfileLinks(links: unknown): string | null {
  if (!Array.isArray(links)) return 'Links must be an array';
  if (links.length > 5) return 'Maximum 5 links allowed';
  for (let i = 0; i < links.length; i++) {
    const item = links[i];
    if (!item || typeof item !== 'object') return `Link ${i + 1} is invalid`;
    const o = item as Record<string, unknown>;
    if (typeof o.label !== 'string' || !o.label.trim()) {
      return `Link ${i + 1} missing label`;
    }
    if (typeof o.url !== 'string' || !o.url.trim()) {
      return `Link ${i + 1} missing URL`;
    }
    if (!isValidUrl(o.url)) {
      return `Link ${i + 1} has invalid URL (must be http:// or https://)`;
    }
  }
  return null;
}
