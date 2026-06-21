import Anthropic from '@anthropic-ai/sdk';
import { fetchCriticalCves } from '@/lib/nvd';
import { fetchKev, fetchAdvisories } from '@/lib/cisa';
import type { BriefingResponse, CveEntry, KevEntry, Advisory } from '@/lib/types';

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a threat intelligence analyst writing a daily briefing for a security operations team. Your output must be concise, actionable, and specific. You have deep knowledge of CVE severity, CISA advisories, and enterprise remediation priorities. Always respond with ONLY valid JSON — no markdown fences, no prose, no commentary outside the JSON structure.`;

function buildUserPrompt(
  cves: CveEntry[],
  kevEntries: KevEntry[],
  advisories: Advisory[]
): string {
  const cveSection =
    cves.length > 0
      ? cves
          .map(
            (c) =>
              `- ${c.id} (Score: ${c.score ?? 'N/A'}) KEV:${c.kevMatch ? 'YES' : 'NO'} | ${c.description.slice(0, 200)}`
          )
          .join('\n')
      : 'No critical CVEs found in the last 7 days.';

  const kevSection =
    kevEntries.length > 0
      ? kevEntries
          .map(
            (k) =>
              `- ${k.cveId} | ${k.vendorProject} ${k.product} | Added: ${k.dateAdded} | Action: ${k.requiredAction}`
          )
          .join('\n')
      : 'No recent KEV entries.';

  const advisorySection =
    advisories.length > 0
      ? advisories
          .map((a) => `- ${a.title} (${a.published}) | ${a.summary}`)
          .join('\n')
      : 'No recent CISA advisories.';

  return `Analyze the following threat intelligence data and return a JSON briefing.

## NVD Critical CVEs (last 7 days, max 20):
${cveSection}

## Recent CISA KEV Additions (last 5):
${kevSection}

## Recent CISA Cybersecurity Advisories (last 5):
${advisorySection}

Return ONLY this JSON structure, no other text:
{
  "summary": "2-3 sentence executive summary of the current threat landscape",
  "topThreats": [
    {
      "cveId": "CVE-XXXX-XXXXX or advisory title",
      "description": "brief description of the threat",
      "action": "specific recommended action",
      "isKevConfirmed": true,
      "source": "NVD or CISA KEV or CISA Advisory"
    }
  ],
  "recommendedActions": ["3-5 prioritized action items for the SOC team"],
  "trendNote": "one observation about the current threat landscape trend",
  "cisaHighlights": "1-2 sentences on the most notable CISA advisories"
}`;
}

export async function GET(): Promise<Response> {
  const errors: BriefingResponse['errors'] = {};

  const [kevResult, advisoriesResult] = await Promise.allSettled([
    fetchKev(),
    fetchAdvisories(),
  ]);

  let kevIds = new Set<string>();
  let kevEntries: KevEntry[] = [];
  if (kevResult.status === 'fulfilled') {
    kevIds = kevResult.value.kevIds;
    kevEntries = kevResult.value.recentEntries;
  } else {
    console.error('KEV fetch failed:', kevResult.reason);
    errors.kev = String(kevResult.reason?.message ?? 'Failed to fetch CISA KEV');
  }

  let advisories: Advisory[] = [];
  if (advisoriesResult.status === 'fulfilled') {
    advisories = advisoriesResult.value;
  } else {
    console.error('Advisories fetch failed:', advisoriesResult.reason);
    errors.advisories = String(advisoriesResult.reason?.message ?? 'Failed to fetch CISA Advisories');
  }

  const [cvesResult] = await Promise.allSettled([fetchCriticalCves(kevIds)]);

  let cves: CveEntry[] = [];
  if (cvesResult.status === 'fulfilled') {
    cves = cvesResult.value;
  } else {
    console.error('NVD fetch failed:', cvesResult.reason);
    errors.nvd = String(cvesResult.reason?.message ?? 'Failed to fetch NVD CVEs');
  }

  let briefing = null;
  try {
    const userMessage = buildUserPrompt(cves, kevEntries, advisories);
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text : '';
    const clean = raw.replace(/```json\n?/, '').replace(/\n?```/, '').trim();
    briefing = JSON.parse(clean);
  } catch (err) {
    console.error('Claude briefing failed:', err);
    errors.claude = err instanceof Error ? err.message : 'Failed to generate briefing';
  }

  const response: BriefingResponse = {
    briefing,
    cves,
    kevEntries,
    advisories,
    updatedAt: new Date().toISOString(),
    errors,
  };

  return Response.json(response);
}
