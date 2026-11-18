import { getJson } from "serpapi";
import { env } from "../config/env.js";
import type { InvestmentThesis, RawSearchResult } from "../types/deal.js";
import { extractHostname, normalizeUrl, urlHash } from "../utils/url.js";

interface SerpOrganicResult {
  title?: string;
  link?: string;
  snippet?: string;
  displayed_link?: string;
}

interface SerpResponse {
  organic_results?: SerpOrganicResult[];
  error?: string;
}

/**
 * Construit une requête Google X-Ray du type :
 * (site:a.com OR site:b.com) ("kw1" OR "kw2") ("06" OR "Var" OR "PACA") -franchise -location
 */
export function buildXrayQuery(thesis: InvestmentThesis): string {
  const sites = thesis.sources.map((s) => `site:${s}`).join(" OR ");
  const keywords = thesis.keywords.map((k) => `"${k}"`).join(" OR ");
  const regions = thesis.regions
    .slice(0, 8)
    .map((r) => `"${r}"`)
    .join(" OR ");
  const exclusions = thesis.exclusions.map((e) => `-${e}`).join(" ");

  return `(${sites}) (${keywords}) (${regions}) ${exclusions}`.replace(/\s+/g, " ").trim();
}

function matchSourcePlatform(url: string, thesis: InvestmentThesis): string {
  const host = extractHostname(url);
  const matched = thesis.sources.find(
    (s) => host === s || host.endsWith(`.${s}`) || host.includes(s.replace(/^www\./, "")),
  );
  return matched ?? host;
}

/**
 * Interroge SerpAPI (Google FR) pour une thèse donnée.
 */
export async function searchThesis(
  thesis: InvestmentThesis,
  options?: { weeklyOnly?: boolean; num?: number },
): Promise<{ query: string; results: RawSearchResult[] }> {
  const query = buildXrayQuery(thesis);
  const weeklyOnly = options?.weeklyOnly ?? env.serpApiWeeklyOnly;
  const num = options?.num ?? env.serpApiNumResults;

  const params: Record<string, string | number | boolean> = {
    engine: "google",
    q: query,
    api_key: env.serpApiKey,
    location: "France",
    gl: "fr",
    hl: "fr",
    num,
  };

  if (weeklyOnly) {
    params.tbs = "qdr:w";
  }

  console.log(`  🔎 X-Ray [${thesis.name}] → ${query.slice(0, 120)}…`);

  const response = (await getJson(params)) as SerpResponse;

  if (response.error) {
    throw new Error(`SerpAPI error (${thesis.id}): ${response.error}`);
  }

  const organic = response.organic_results ?? [];
  const results: RawSearchResult[] = [];
  const seen = new Set<string>();

  for (const item of organic) {
    if (!item.link || !item.title) continue;

    const normalized = normalizeUrl(item.link);
    const hash = urlHash(normalized);
    if (seen.has(hash)) continue;
    seen.add(hash);

    results.push({
      title: item.title.trim(),
      url: normalized,
      urlHash: hash,
      snippet: (item.snippet ?? "").trim(),
      sourcePlatform: matchSourcePlatform(normalized, thesis),
      thesisId: thesis.id,
      thesisName: thesis.name,
    });
  }

  console.log(`  → ${results.length} résultat(s) normalisé(s)`);
  return { query, results };
}

/**
 * Lance la recherche X-Ray sur toutes les thèses actives.
 */
export async function searchAllTheses(
  theses: InvestmentThesis[],
): Promise<RawSearchResult[]> {
  const all: RawSearchResult[] = [];
  const globalSeen = new Set<string>();

  for (const thesis of theses) {
    try {
      const { results } = await searchThesis(thesis);
      for (const r of results) {
        if (globalSeen.has(r.urlHash)) continue;
        globalSeen.add(r.urlHash);
        all.push(r);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ⚠️ Échec recherche thèse ${thesis.id}: ${message}`);
    }
  }

  return all;
}
