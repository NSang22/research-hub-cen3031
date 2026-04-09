import type { ApplicationQuestion, ApplicationQuestionType } from '../types/applicationQuestions';

const TYPES: { value: ApplicationQuestionType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'choice', label: 'Multiple choice (one)' },
];

function newQuestion(): ApplicationQuestion {
  return {
    id: crypto.randomUUID(),
    type: 'text',
    label: '',
    required: false,
  };
}

interface Props {
  value: ApplicationQuestion[];
  onChange: (q: ApplicationQuestion[]) => void;
}

export function ApplicationQuestionsEditor({ value, onChange }: Props) {
  const updateAt = (index: number, patch: Partial<ApplicationQuestion>) => {
    const next = value.map((q, i) => (i === index ? { ...q, ...patch } : q));
    const merged = next[index];
    if (merged && (patch.type === 'text' || patch.type === 'number')) {
      next[index] = { ...merged, options: undefined };
    }
    onChange(next);
  };

  const setOptionsFromText = (index: number, text: string) => {
    const options = text
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    updateAt(index, { options });
  };

  return (
    <div className="space-y-4 border border-slate-200 rounded-lg p-4 bg-slate-50/50">
      <div>
        <h2 className="text-lg font-semibold text-inherit">Application questions</h2>
        <p className="text-sm text-slate-600 mt-1">
          Optional extra questions students answer when they apply. Dropdown and multiple choice need one option per line.
        </p>
      </div>
      {value.map((q, index) => (
        <div key={q.id} className="p-3 border border-slate-200 rounded-lg bg-white space-y-2">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-medium text-slate-600 mb-0.5">Type</label>
              <select
                value={q.type}
                onChange={(e) => updateAt(index, { type: e.target.value as ApplicationQuestionType })}
                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium text-slate-600 mb-0.5">Label</label>
              <input
                type="text"
                value={q.label}
                onChange={(e) => updateAt(index, { label: e.target.value })}
                placeholder="Question text"
                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
              />
            </div>
            <label className="flex items-center gap-1.5 text-sm pb-1">
              <input
                type="checkbox"
                checked={!!q.required}
                onChange={(e) => updateAt(index, { required: e.target.checked })}
              />
              Required
            </label>
            <button
              type="button"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              className="text-sm text-red-600 hover:underline pb-1"
            >
              Remove
            </button>
          </div>
          {(q.type === 'dropdown' || q.type === 'choice') && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-0.5">Options (one per line)</label>
              <textarea
                value={(q.options || []).join('\n')}
                onChange={(e) => setOptionsFromText(index, e.target.value)}
                rows={3}
                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm font-mono"
              />
            </div>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...value, newQuestion()])}
        className="text-sm font-medium text-teal-700 hover:underline"
      >
        + Add question
      </button>
    </div>
  );
}
