export interface CveEntry {
  id: string;
  description: string;
  score: number | null;
  affected: string;
  kevMatch: boolean;
}

export interface KevEntry {
  cveId: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  requiredAction: string;
}

export interface Advisory {
  title: string;
  link: string;
  published: string;
  summary: string;
}

export interface TopThreat {
  cveId: string;
  description: string;
  action: string;
  isKevConfirmed: boolean;
  source: string;
}

export interface Briefing {
  summary: string;
  topThreats: TopThreat[];
  recommendedActions: string[];
  trendNote: string;
  cisaHighlights: string;
}

export interface BriefingResponse {
  briefing: Briefing | null;
  cves: CveEntry[];
  kevEntries: KevEntry[];
  advisories: Advisory[];
  updatedAt: string;
  errors: {
    nvd?: string;
    kev?: string;
    advisories?: string;
    claude?: string;
  };
}
