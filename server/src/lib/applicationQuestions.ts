export type ApplicationQuestionType = 'text' | 'number' | 'dropdown' | 'choice';

export interface ApplicationQuestion {
  id: string;
  type: ApplicationQuestionType;
  label: string;
  required?: boolean;
  options?: string[];
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

export function parseApplicationQuestions(raw: unknown): ApplicationQuestion[] {
  if (!Array.isArray(raw)) return [];
  const out: ApplicationQuestion[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : null;
    const type = o.type;
    const label = typeof o.label === 'string' ? o.label.trim() : '';
    if (!id || !label) continue;
    if (type !== 'text' && type !== 'number' && type !== 'dropdown' && type !== 'choice') continue;
    const required = Boolean(o.required);
    let options: string[] | undefined;
    if (type === 'dropdown' || type === 'choice') {
      if (!Array.isArray(o.options)) continue;
      options = o.options
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        .map((x) => x.trim());
      if (options.length === 0) continue;
    }
    out.push({ id, type, label, required, options });
  }
  return out;
}

/** Returns error message or null if valid */
export function validateQuestionAnswers(
  questions: ApplicationQuestion[],
  answers: Record<string, unknown>
): string | null {
  for (const q of questions) {
    const raw = answers[q.id];
    const missing =
      raw === undefined ||
      raw === null ||
      (typeof raw === 'string' && !raw.trim()) ||
      (typeof raw === 'number' && Number.isNaN(raw));

    if (q.required && missing) {
      return `Answer required: ${q.label}`;
    }
    if (missing) continue;

    if (q.type === 'number') {
      const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
      if (Number.isNaN(n)) {
        return `Invalid number for: ${q.label}`;
      }
    }
    if (q.type === 'dropdown' || q.type === 'choice') {
      const s = String(raw).trim();
      const opts = q.options || [];
      if (!opts.includes(s)) {
        return `Invalid choice for: ${q.label}`;
      }
    }
  }
  return null;
}

export function normalizeAnswersForStore(
  questions: ApplicationQuestion[],
  answers: Record<string, unknown>
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const q of questions) {
    const raw = answers[q.id];
    if (raw === undefined || raw === null) continue;
    if (q.type === 'number') {
      const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
      if (!Number.isNaN(n)) out[q.id] = n;
      continue;
    }
    if (isNonEmptyString(raw)) {
      out[q.id] = raw.trim();
    }
  }
  return out;
}
