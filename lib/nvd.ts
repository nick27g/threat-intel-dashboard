import type { CveEntry } from './types';

const NVD_BASE = 'https://services.nvd.nist.gov/rest/json/cves/2.0';

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, { cache: 'no-store' });
    if (res.status === 503 && i < retries - 1) {
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
      continue;
    }
    return res;
  }
  throw new Error('NVD API unavailable after retries');
}

export async function fetchCriticalCves(kevIds: Set<string>): Promise<CveEntry[]> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    pubStartDate: sevenDaysAgo.toISOString().replace(/\.\d{3}Z$/, '.000 UTC+00:00'),
    pubEndDate: now.toISOString().replace(/\.\d{3}Z$/, '.000 UTC+00:00'),
    cvssV3Severity: 'CRITICAL',
    resultsPerPage: '20',
  });

  const res = await fetchWithRetry(`${NVD_BASE}?${params}`);

  if (!res.ok) {
    throw new Error(`NVD API returned ${res.status}`);
  }

  const data = await res.json();
  const vulnerabilities = data.vulnerabilities ?? [];

  return vulnerabilities.slice(0, 20).map((item: Record<string, unknown>) => {
    const cve = item.cve as Record<string, unknown>;
    const id = cve.id as string;

    const descriptions = (cve.descriptions as { lang: string; value: string }[]) ?? [];
    const description =
      descriptions.find((d) => d.lang === 'en')?.value ?? 'No description available';

    const metrics = cve.metrics as Record<string, unknown> | undefined;
    let score: number | null = null;
    if (metrics) {
      const v31 = (metrics.cvssMetricV31 as { cvssData: { baseScore: number } }[])?.[0];
      const v30 = (metrics.cvssMetricV30 as { cvssData: { baseScore: number } }[])?.[0];
      score = v31?.cvssData?.baseScore ?? v30?.cvssData?.baseScore ?? null;
    }

    const configurations = cve.configurations as { nodes: { cpeMatch: { criteria: string }[] }[] }[] | undefined;
    let affected = 'unknown';
    if (configurations && configurations.length > 0) {
      const firstNode = configurations[0]?.nodes?.[0];
      const firstMatch = firstNode?.cpeMatch?.[0];
      if (firstMatch?.criteria) {
        affected = firstMatch.criteria;
      }
    }

    return { id, description, score, affected, kevMatch: kevIds.has(id) };
  });
}
