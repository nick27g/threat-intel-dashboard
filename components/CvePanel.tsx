import type { CveEntry } from '@/lib/types';

function scoreColor(score: number | null): string {
  if (score === null) return 'text-zinc-400';
  if (score >= 9.0) return 'text-red-400 font-bold';
  if (score >= 7.0) return 'text-orange-400 font-semibold';
  return 'text-yellow-400';
}

export function CvePanel({ cves }: { cves: CveEntry[] }) {
  if (cves.length === 0) {
    return <p className="text-sm text-zinc-500">No critical CVEs found in the last 7 days.</p>;
  }

  return (
    <ul className="space-y-2">
      {cves.map((cve) => (
        <li key={cve.id} className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`https://nvd.nist.gov/vuln/detail/${cve.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm font-semibold text-blue-400 hover:underline"
            >
              {cve.id}
            </a>
            {cve.score !== null && (
              <span className={`text-sm ${scoreColor(cve.score)}`}>
                CVSS {cve.score.toFixed(1)}
              </span>
            )}
            {cve.kevMatch && (
              <span className="rounded-full bg-red-900/70 px-2 py-0.5 text-xs font-medium text-red-300 border border-red-700">
                ⚠ KEV
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{cve.description}</p>
        </li>
      ))}
    </ul>
  );
}
