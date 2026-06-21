import type { Advisory } from '@/lib/types';

export function AdvisoryPanel({ advisories }: { advisories: Advisory[] }) {
  if (advisories.length === 0) {
    return <p className="text-sm text-zinc-500">No recent CISA advisories found.</p>;
  }

  return (
    <ul className="space-y-2">
      {advisories.map((advisory, i) => (
        <li key={i} className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
          <a
            href={advisory.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-amber-400 hover:underline leading-snug"
          >
            {advisory.title}
          </a>
          {advisory.published && (
            <p className="mt-0.5 text-xs text-zinc-500">
              {new Date(advisory.published).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          )}
          {advisory.summary && (
            <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{advisory.summary}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
