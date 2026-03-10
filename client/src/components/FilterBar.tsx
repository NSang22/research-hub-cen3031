import React from 'react';

interface FilterBarProps {
  filters: Record<string, React.ReactNode>;
  onReset?: () => void;
}

export function FilterBar({ filters, onReset }: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-4 items-end p-4 bg-slate-50 rounded-lg border border-slate-200">
      {Object.entries(filters).map(([key, node]) => (
        <div key={key} className="flex flex-col gap-1">
          {node}
        </div>
      ))}
      {onReset && (
        <button
          onClick={onReset}
          className="px-4 py-2 text-sm font-medium text-inherit hover:text-inherit"
        >
          Reset
        </button>
      )}
    </div>
  );
}
