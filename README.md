# Threat Intel Briefing Dashboard

**Live:** https://threat-intel-dashboard-beta.vercel.app

A security operations dashboard that pulls real threat intelligence from three authoritative sources, cross-references them, and uses Claude to synthesize a structured daily briefing — rendered as a card-based UI. All external calls happen server-side; the browser never touches an API key or a raw data feed.

---

## What It Does

On each request, the API route fetches critical CVEs from NVD, the full CISA Known Exploited Vulnerabilities catalog, and the CISA cybersecurity advisories RSS feed in parallel. It cross-references the CVE list against the KEV catalog, then sends the combined dataset to Claude with an analyst persona prompt. Claude returns a structured JSON briefing — executive summary, prioritized threats, recommended SOC actions, trend note, and CISA highlights — which the dashboard renders as typed React components.

The result is a single-page view that shows both the raw data (CVE scores, advisory titles, KEV entries) and the synthesized analysis side by side, so a security analyst can read the AI summary and drill into the underlying sources without switching tools.

---

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 16 (App Router) | Server components and API routes keep all external calls server-side; Vercel deployment is zero-config |
| AI | Anthropic API (`claude-sonnet-4-6`) | Instruction-following fidelity needed for strict JSON output; analyst persona produces actionable rather than generic summaries |
| Data | NVD CVE API, CISA KEV JSON, CISA Advisories RSS | Three authoritative, public, no-key-required government feeds |
| Styling | Tailwind CSS v4 | Utility-first; dark theme and card layout without a component library dependency |
| Deploy | Vercel | Matches the Next.js App Router's expectations; preview URLs on every push |

---

## Data Sources and How They Work Together

### NVD CVE API

The National Vulnerability Database API is queried for CVEs published in the last seven days with a CVSS v3 severity of CRITICAL. The response is shaped into a flat list — CVE ID, English description, base score, and the first CPE match string as a proxy for affected product — capped at 20 entries to stay within token budget. The NVD endpoint occasionally returns 503 under load, so the fetch is wrapped in a retry loop with exponential backoff.

### CISA Known Exploited Vulnerabilities

The KEV catalog is a list maintained by CISA of vulnerabilities with confirmed active exploitation in the wild. It is fetched as a single JSON file (~1 MB) and serves two purposes simultaneously: the full set of CVE IDs is extracted into a `Set<string>` used to flag NVD results (`kevMatch: true`), and the five most recently added entries are passed to Claude as a separate data point.

The KEV flag is the most operationally significant signal on the dashboard. A CVE with a high CVSS score is a theoretical risk; a CVE that also appears in the KEV catalog has confirmed exploitation evidence, which changes the remediation priority entirely. SOC teams routinely treat KEV entries as mandatory patching regardless of internal risk scoring.

### CISA Advisories RSS

The CISA cybersecurity advisories feed covers a broader surface than CVEs — ICS vulnerabilities, nation-state activity, joint advisories with CISA partners (NSA, FBI, foreign CERTs), and sector-specific alerts. The five most recent entries are extracted from the RSS XML using `fast-xml-parser` (DOMParser is not available in the Node.js runtime) and passed to Claude as context for the `cisaHighlights` field.

### Cross-referencing

The three sources address different layers of the threat landscape and are designed to be read together. NVD gives the raw vulnerability signal. KEV tells you which of those vulnerabilities adversaries are actively using. CISA advisories give the campaign-level and sector-level context that neither CVE feed captures. Claude's role is to synthesize across all three rather than summarize each one independently.

---

## Claude Integration

### Analyst Persona

The system prompt frames Claude as a threat intelligence analyst writing for a security operations team. This framing consistently produces tighter, more actionable output than a generic summarize-this-data prompt — it suppresses hedging language, keeps descriptions focused on impact and remediation rather than technical mechanism, and prioritizes entries the way an analyst would (KEV-confirmed > high score > advisory severity).

### Structured JSON Output

Claude is instructed to return only a JSON object matching a defined TypeScript interface — no prose, no markdown, no preamble. The schema is embedded in the user message alongside the data:

```ts
interface Briefing {
  summary: string
  topThreats: { cveId: string; description: string; action: string; isKevConfirmed: boolean; source: string }[]
  recommendedActions: string[]
  trendNote: string
  cisaHighlights: string
}
```

This matters for rendering because the dashboard doesn't parse narrative text — it maps typed fields directly to components. `topThreats` renders as individual threat cards with conditional KEV badges. `recommendedActions` renders as a numbered list. If Claude returns freeform prose, the JSON parse fails and an error card is shown instead. Claude occasionally wraps output in triple-backtick fences despite instructions; the response is stripped of markdown fences before `JSON.parse`.

---

## API Key Security

`ANTHROPIC_API_KEY` is set as a server-side environment variable in Vercel and is never included in the client bundle. The API route (`app/api/briefing/route.ts`) is the only file that imports the Anthropic SDK. Next.js App Router server components and route handlers run exclusively in the Node.js environment — there is no path by which the key reaches the browser. NVD and CISA require no authentication.

---

## Running Locally

```bash
git clone https://github.com/nick27g/threat-intel-dashboard.git
cd threat-intel-dashboard
npm install
```

Create a `.env` file in the project root:

```
ANTHROPIC_API_KEY=your_key_here
```

```bash
npm run dev
```

The dashboard is at `http://localhost:3000`. The API route is at `http://localhost:3000/api/briefing` and can be called directly to inspect the raw JSON payload.

---

## Known Limitations

**NVD rate limiting.** Without an API key, NVD enforces 5 requests per 30 seconds. This is fine for a dashboard with manual refresh but would break under concurrent load. The fetch includes retry logic for 503 responses; a 404 is treated as an empty result (NVD returns 404 on date ranges with no matching CVEs).

**KEV file size.** The KEV catalog is fetched fresh on every API call (~1 MB). For a low-traffic portfolio project this is acceptable; a production deployment would cache it with a short TTL.

**Claude JSON reliability.** Structured JSON output from an LLM is not guaranteed. The parse is wrapped in a try/catch — if it fails, the dashboard shows an error card for the briefing section while still rendering the raw CVE and advisory data from the other sources.

**CISA Highlights are not linked.** The `cisaHighlights` field is free-form prose generated by Claude. Unlike the `AdvisoryPanel` component (which links each title to its CISA URL), the highlights card cannot link to specific advisories because the field contains no structured URL data.

**No persistence.** There is no database or cache layer. Every page load triggers a fresh fetch from all three sources and a new Claude call. On a slow NVD response this can take 10–15 seconds.

---

## Author

Nick Agin — [github.com/nick27g](https://github.com/nick27g)
