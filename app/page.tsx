'use client';

import { useState, useEffect, useCallback } from 'react';
import { BriefingCard } from '@/components/BriefingCard';
import { CvePanel } from '@/components/CvePanel';
import { AdvisoryPanel } from '@/components/AdvisoryPanel';
import { SourceBadge } from '@/components/SourceBadge';
import { RefreshButton } from '@/components/RefreshButton';
import { LoadingState } from '@/components/LoadingState';
import type { BriefingResponse } from '@/lib/types';

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

export default function Dashboard() {
  const [data, setData] = useState<BriefingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/briefing');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: BriefingResponse = await res.json();
      setData(json);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load briefing');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 px-6 py-4 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-50">
                Threat Intel Briefing Dashboard
              </h1>
              <p className="mt-0.5 text-xs text-zinc-500">
                Powered by NVD · CISA KEV · CISA Advisories
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SourceBadge source="NVD" />
              <SourceBadge source="CISA KEV" />
              <SourceBadge source="CISA Advisory" />
              {data?.updatedAt && !loading && (
                <span className="text-xs text-zinc-500 ml-1">
                  Updated {formatTimestamp(data.updatedAt)}
                </span>
              )}
              <RefreshButton onClick={load} loading={loading} />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {loading && <LoadingState />}

        {fetchError && !loading && (
          <div className="rounded-xl border border-red-800 bg-red-950/40 p-5 text-red-300">
            <p className="font-semibold">Failed to load dashboard</p>
            <p className="mt-1 text-sm">{fetchError}</p>
          </div>
        )}

        {data && !loading && (
          <>
            {/* Source-level error banners */}
            {Object.entries(data.errors).length > 0 && (
              <div className="mb-4 space-y-2">
                {data.errors.nvd && (
                  <div className="rounded-lg border border-red-800 bg-red-950/30 px-4 py-2 text-sm text-red-300">
                    NVD source error: {data.errors.nvd}
                  </div>
                )}
                {data.errors.kev && (
                  <div className="rounded-lg border border-red-800 bg-red-950/30 px-4 py-2 text-sm text-red-300">
                    CISA KEV source error: {data.errors.kev}
                  </div>
                )}
                {data.errors.advisories && (
                  <div className="rounded-lg border border-red-800 bg-red-950/30 px-4 py-2 text-sm text-red-300">
                    CISA Advisories source error: {data.errors.advisories}
                  </div>
                )}
                {data.errors.claude && (
                  <div className="rounded-lg border border-amber-800 bg-amber-950/30 px-4 py-2 text-sm text-amber-300">
                    AI briefing error: {data.errors.claude}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              {/* Left column — wider */}
              <div className="space-y-5 lg:col-span-2">
                {/* Summary */}
                {data.briefing?.summary && (
                  <BriefingCard title="Executive Summary" icon="🛡">
                    <p className="text-sm leading-relaxed text-zinc-300">{data.briefing.summary}</p>
                  </BriefingCard>
                )}

                {/* Top Threats */}
                {data.briefing?.topThreats && data.briefing.topThreats.length > 0 && (
                  <BriefingCard title="Top Threats" icon="⚠">
                    <div className="space-y-3">
                      {data.briefing.topThreats.map((threat, i) => (
                        <div
                          key={i}
                          className={`rounded-lg border p-4 ${
                            threat.isKevConfirmed
                              ? 'border-red-800 bg-red-950/30'
                              : 'border-zinc-700 bg-zinc-800/50'
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-mono text-sm font-semibold text-zinc-100">
                              {threat.cveId}
                            </span>
                            {threat.isKevConfirmed && (
                              <span className="rounded-full bg-red-900/70 px-2.5 py-0.5 text-xs font-bold text-red-300 border border-red-700">
                                ⚠ KEV Confirmed
                              </span>
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${
                              threat.source === 'CISA KEV'
                                ? 'border-red-700 text-red-300 bg-red-900/40'
                                : threat.source === 'CISA Advisory'
                                ? 'border-amber-700 text-amber-300 bg-amber-900/40'
                                : 'border-blue-700 text-blue-300 bg-blue-900/40'
                            }`}>
                              {threat.source}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-300">{threat.description}</p>
                          <p className="mt-1.5 text-xs text-zinc-400">
                            <span className="font-medium text-zinc-300">Action:</span>{' '}
                            {threat.action}
                          </p>
                        </div>
                      ))}
                    </div>
                  </BriefingCard>
                )}

                {/* Trend Note */}
                {data.briefing?.trendNote && (
                  <BriefingCard title="Trend Observation" icon="📈">
                    <p className="text-sm leading-relaxed text-zinc-300">{data.briefing.trendNote}</p>
                  </BriefingCard>
                )}

                {/* CISA Highlights */}
                {data.briefing?.cisaHighlights && (
                  <BriefingCard title="CISA Highlights" icon="🏛">
                    <p className="text-sm leading-relaxed text-zinc-300">{data.briefing.cisaHighlights}</p>
                  </BriefingCard>
                )}

                {!data.briefing && (
                  <div className="rounded-xl border border-amber-800 bg-amber-950/20 p-5">
                    <p className="text-sm text-amber-300">
                      AI briefing unavailable. Raw data is shown in the right panel.
                    </p>
                  </div>
                )}
              </div>

              {/* Right column */}
              <div className="space-y-5">
                {/* Recommended Actions */}
                {data.briefing?.recommendedActions && data.briefing.recommendedActions.length > 0 && (
                  <BriefingCard title="Recommended Actions" icon="✅">
                    <ol className="space-y-2">
                      {data.briefing.recommendedActions.map((action, i) => (
                        <li key={i} className="flex gap-3 text-sm">
                          <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-zinc-300">
                            {i + 1}
                          </span>
                          <span className="text-zinc-300 leading-snug">{action}</span>
                        </li>
                      ))}
                    </ol>
                  </BriefingCard>
                )}

                {/* CVE List */}
                <BriefingCard title={`CVE List (${data.cves.length})`} icon="🔍">
                  <CvePanel cves={data.cves} />
                </BriefingCard>

                {/* CISA Advisories */}
                <BriefingCard title="CISA Advisories" icon="📋">
                  <AdvisoryPanel advisories={data.advisories} />
                </BriefingCard>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
