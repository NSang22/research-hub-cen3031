import type { ApplicationStatus } from '../types';

interface StatusBadgeProps {
  status: ApplicationStatus;
}

/** Application status pill: orange fill, black label (used in lists, tables, and blue cards). */
export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      data-status-badge
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-orange-400 text-black"
    >
      {status}
    </span>
  );
}
