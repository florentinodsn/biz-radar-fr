export type DealStatus = "NEW" | "CONTACTED" | "IGNORED";

export interface InvestmentThesis {
  id: string;
  name: string;
  description: string;
  sources: string[];
  keywords: string[];
  regions: string[];
  exclusions: string[];
  /** Reprises judiciaires / barre du tribunal */
  judicial?: boolean;
}

export interface RawSearchResult {
  title: string;
  url: string;
  urlHash: string;
  snippet: string;
  sourcePlatform: string;
  thesisId: string;
  thesisName: string;
}

export interface AiScoreResult {
  askingPrice: number | null;
  revenue: number | null;
  ebitdaEbe: number | null;
  location: string | null;
  motif: string | null;
  score: number;
  summary: string;
  redFlags: string;
  upside: string;
}

export interface Deal {
  id: number;
  url_hash: string;
  title: string;
  url: string;
  source_platform: string;
  thesis_name: string;
  raw_snippet: string;
  asking_price: number | null;
  revenue: number | null;
  ebitda_ebe: number | null;
  score: number;
  ai_summary: string;
  ai_red_flags: string;
  ai_upside: string;
  status: DealStatus;
  created_at: string;
}

export interface NewDealInput {
  urlHash: string;
  title: string;
  url: string;
  sourcePlatform: string;
  thesisName: string;
  rawSnippet: string;
  askingPrice: number | null;
  revenue: number | null;
  ebitdaEbe: number | null;
  score: number;
  aiSummary: string;
  aiRedFlags: string;
  aiUpside: string;
}
