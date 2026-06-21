# CLAUDE.md — Threat Intel Briefing Dashboard

## What This Project Is
A Next.js dashboard that fetches recent threat intelligence from multiple
real sources, sends them to Claude, and renders a structured daily security
briefing. Card-based UI. All external calls happen server-side.

Portfolio project for Nick Agin (github.com/nick27g), targeting an
AI-Enabled Solutions Developer role at HII Mission Technologies.

---

## Current Goal
Build the multi-source intel fetch → Claude briefing → dashboard card render
pipeline. Deploy to Vercel.

Three intel sources feed into one unified Claude briefing:
1. NVD API — critical CVEs from the last 7 days
2. CISA KEV — Known Exploited Vulnerabilities catalog (cross-reference)
3. CISA Advisories RSS — recent cybersecurity advisories

---

## Stack
| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | Next.js App Router | Vercel-native, SSR for initial data load |
| AI | Anthropic API, claude-sonnet-4-6 | Core feature |
| Data | NVD CVE API + CISA KEV + CISA Advisories RSS | Real multi-source threat intel |
| Styling | Tailwind CSS | Card layout, clean dashboard |
| Deploy | Vercel | Auto-deploy, free tier |

---

## Project Structure
threat-intel-dashboard/

├── app/

│   ├── api/

│   │   └── briefing/

│   │       └── route.ts        # Fetches all sources + calls Claude + returns briefing

│   ├── page.tsx                # Dashboard UI

│   └── layout.tsx

├── components/

│   ├── BriefingCard.tsx        # Single briefing section card

│   ├── CvePanel.tsx            # Raw CVE list with scores and NVD links

│   ├── AdvisoryPanel.tsx       # CISA advisories list

│   ├── SourceBadge.tsx         # "NVD" / "CISA KEV" / "CISA Advisory" badge

│   ├── RefreshButton.tsx       # Manual refresh trigger

│   └── LoadingState.tsx        # Skeleton or spinner

├── lib/

│   ├── nvd.ts                  # NVD API fetch + data shaping

│   ├── cisa.ts                 # CISA KEV + Advisories RSS fetch + data shaping

│   └── types.ts                # TypeScript types for all sources and briefing

├── .env

├── .env.example

├── .gitignore

└── package.json

---

## Environment Variables
ANTHROPIC_API_KEY=your_key_here
NVD and CISA APIs require no key.

---

## Data Sources

### 1. NVD CVE API
Base URL: https://services.nvd.nist.gov/rest/json/cves/2.0

Params:

pubStartDate=<7 days ago ISO 8601>

pubEndDate=<now ISO 8601>

cvssV3Severity=CRITICAL

Rate limit: 5 req/30s (no key). Fine for portfolio use.

Add retry logic if NVD returns 503.

Limit to 20 CVEs sent to Claude.

Shape each CVE to:
```ts
{
  id: string           // e.g. "CVE-2026-1234"
  description: string  // English description
  score: number | null // CVSS v3.1 base score
  affected: string     // CPE match string or "unknown"
  kevMatch: boolean    // true if this CVE ID appears in CISA KEV catalog
}
```

### 2. CISA KEV (Known Exploited Vulnerabilities)
URL: https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json

No rate limit. Full catalog as a single JSON file.

Fetch the full KEV catalog and extract just the CVE IDs into a Set<string>.
Use this Set to mark kevMatch=true on any NVD CVE that appears in it.
Also extract the 5 most recently added KEV entries to include as a separate
data point for Claude.

Shape recent KEV entries to:
```ts
{
  cveId: string
  vendorProject: string
  product: string
  vulnerabilityName: string
  dateAdded: string
  requiredAction: string
}
```

### 3. CISA Advisories RSS
URL: https://www.cisa.gov/cybersecurity-advisories/all.xml

RSS/Atom feed. Parse server-side. No rate limit.

Fetch and parse the RSS XML. Extract the 5 most recent advisories.

Shape each advisory to:
```ts
{
  title: string
  link: string
  published: string
  summary: string  // first 300 chars of description
}
```

Use the built-in DOMParser is not available server-side. Parse RSS XML
using string manipulation or a lightweight XML parser.
Install fast-xml-parser for RSS parsing: npm install fast-xml-parser

---

## API Route Design

```ts
// app/api/briefing/route.ts
// 1. Fetch all three sources in parallel using Promise.allSettled
// 2. Shape data from each source
// 3. Cross-reference NVD CVEs against KEV catalog
// 4. Send shaped data from all three sources to Claude
// 5. Parse Claude's JSON response
// 6. Return { briefing, cves, kevEntries, advisories, updatedAt }

// Use Promise.allSettled so one failing source never crashes the whole briefing.
// If a source fails, log the error and pass an empty array for that source.
// Claude's prompt should handle missing data gracefully.
```

---

## Claude Prompt Design

System prompt persona: threat intelligence analyst writing a daily briefing
for a security operations team. Concise, actionable, specific.

The user message should include all three shaped data sets clearly labeled:
- NVD Critical CVEs (with KEV match flags)
- Recent CISA KEV additions
- Recent CISA Advisories

Claude must return ONLY valid JSON matching this exact schema, no other text:

```ts
interface Briefing {
  summary: string                    // 2-3 sentence executive summary
  topThreats: {
    cveId: string
    description: string
    action: string
    isKevConfirmed: boolean          // true if in CISA KEV catalog
    source: string                   // "NVD" | "CISA KEV" | "CISA Advisory"
  }[]
  recommendedActions: string[]       // 3-5 prioritized actions for the SOC team
  trendNote: string                  // one observation about the threat landscape
  cisaHighlights: string             // 1-2 sentences on notable CISA advisories
}
```

Strip markdown fences before JSON.parse:
```ts
const clean = text.replace(/```json\n?/, '').replace(/\n?```/, '').trim()
```

---

## UI Layout

Dark theme. Professional dashboard aesthetic.

Header:
- Title: "Threat Intel Briefing Dashboard"
- Subtitle: "Powered by NVD · CISA KEV · CISA Advisories"
- Source badges: three pill badges showing data sources
- Last updated timestamp
- Refresh button

Main grid (two columns on desktop, single column mobile):
Left column (wider):
- Summary card
- Top Threats cards (one per threat, KEV-confirmed threats get a red "⚠ KEV Confirmed" badge)
- CISA Highlights card

Right column:
- Recommended Actions card
- CVE List panel (id, score, KEV badge if confirmed, link to nvd.nist.gov/vuln/detail/{id})
- CISA Advisories panel (title, date, link)

Loading state: skeleton cards while fetching
Error state: error card per failed source, rest of dashboard still renders

---

## Key Rules
- All external calls (NVD + CISA + Anthropic) in the API route only. Never
  from the browser.
- API key server-side only. Never in the browser bundle.
- Promise.allSettled for all three source fetches — one failure must not
  crash the briefing.
- Parse Claude's JSON inside try/catch. Show error card if parsing fails.
- Limit to 20 CVEs sent to Claude to stay within token budget.
- KEV cross-reference is a key differentiator — make it visually prominent in the UI.
- If NVD returns no results (quiet week), handle gracefully.
- Add retry logic or clear error message if NVD returns 503.

---

## Local Dev
```bash
npm install
npm run dev
# App at http://localhost:3000
# API route at http://localhost:3000/api/briefing
```

---

## Deploy
```bash
vercel
```
Add ANTHROPIC_API_KEY in Vercel dashboard. NVD and CISA need no keys.

---

## Gotchas
- Claude sometimes wraps JSON in ```json ... ``` fences even when told not to.
  Always strip fences before JSON.parse.
- NVD API occasionally returns 503 -- add retry or fallback message.
- CISA KEV JSON is a large file (~1MB). Fetch it once per request, do not
  cache between requests for this portfolio project.
- RSS XML must be parsed server-side. Use fast-xml-parser, not DOMParser.
- model string: claude-sonnet-4-6 (not claude-sonnet-4-20250514)
- Do not explain code as you go. Give a summary at the end.
- At the end: git add . && git commit -m "initial build" && git push

---

## README Checklist (produce at end of session)
- [ ] What it does + live URL
- [ ] Why three sources (NVD + CISA KEV + CISA Advisories)
- [ ] What the KEV cross-reference means and why it matters
- [ ] Claude analyst persona and structured JSON output approach
- [ ] How to run locally
- [ ] Known limitations
