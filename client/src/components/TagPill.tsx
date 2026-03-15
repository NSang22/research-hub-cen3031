import React from 'react';

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2 py-1 text-sm',
} as const;

type TagPillSize = keyof typeof sizeStyles;

interface TagPillProps {
  children: React.ReactNode;
  /** sm = list cards; md = detail pages */
  size?: TagPillSize;
  className?: string;
}

/** Skill / meta pill: orange fill, black label (readable on blue cards). */
export function TagPill({ children, size = 'sm', className = '' }: TagPillProps) {
  return (
    <span
      data-tag-pill
      className={`inline-flex items-center rounded-full font-medium bg-orange-400 text-black ${sizeStyles[size]} ${className}`.trim()}
    >
      {children}
    </span>
  );
}
