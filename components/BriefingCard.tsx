import type { ReactNode } from 'react';

interface BriefingCardProps {
  title: string;
  icon?: string;
  children: ReactNode;
  className?: string;
}

export function BriefingCard({ title, icon, children, className = '' }: BriefingCardProps) {
  return (
    <div className={`rounded-xl border border-zinc-700 bg-zinc-900 p-5 ${className}`}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
        {icon && <span>{icon}</span>}
        {title}
      </h2>
      {children}
    </div>
  );
}
