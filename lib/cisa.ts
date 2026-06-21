import { XMLParser } from 'fast-xml-parser';
import type { KevEntry, Advisory } from './types';

const KEV_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
const ADVISORIES_RSS_URL = 'https://www.cisa.gov/cybersecurity-advisories/all.xml';

interface KevCatalog {
  vulnerabilities: {
    cveID: string;
    vendorProject: string;
    product: string;
    vulnerabilityName: string;
    dateAdded: string;
    requiredAction: string;
  }[];
}

export async function fetchKev(): Promise<{ kevIds: Set<string>; recentEntries: KevEntry[] }> {
  const res = await fetch(KEV_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`CISA KEV returned ${res.status}`);

  const data: KevCatalog = await res.json();
  const vulns = data.vulnerabilities ?? [];

  const kevIds = new Set(vulns.map((v) => v.cveID));

  const sorted = [...vulns].sort(
    (a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
  );

  const recentEntries: KevEntry[] = sorted.slice(0, 5).map((v) => ({
    cveId: v.cveID,
    vendorProject: v.vendorProject,
    product: v.product,
    vulnerabilityName: v.vulnerabilityName,
    dateAdded: v.dateAdded,
    requiredAction: v.requiredAction,
  }));

  return { kevIds, recentEntries };
}

export async function fetchAdvisories(): Promise<Advisory[]> {
  const res = await fetch(ADVISORIES_RSS_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`CISA Advisories RSS returned ${res.status}`);

  const xml = await res.text();

  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const parsed = parser.parse(xml);

  const channel = parsed?.rss?.channel ?? parsed?.feed ?? {};
  const rawItems: Record<string, unknown>[] = Array.isArray(channel.item)
    ? channel.item
    : channel.item
    ? [channel.item]
    : Array.isArray(channel.entry)
    ? channel.entry
    : channel.entry
    ? [channel.entry]
    : [];

  return rawItems.slice(0, 5).map((item) => {
    const title = String(item.title ?? '');
    const link = String(item.link ?? item.guid ?? '');
    const published = String(item.pubDate ?? item.published ?? item.updated ?? '');
    const rawDesc = String(item.description ?? item.summary ?? item.content ?? '');
    const summary = rawDesc.replace(/<[^>]+>/g, '').slice(0, 300);

    return { title, link, published, summary };
  });
}
