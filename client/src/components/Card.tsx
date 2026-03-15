import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      data-card-blue
      onClick={onClick}
      className={`rounded-lg border border-white/25 text-white [&_a]:font-medium [&_a]:text-white [&_a]:hover:underline [&_a]:hover:opacity-95 ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
