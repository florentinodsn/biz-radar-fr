import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { env } from "../config/env.js";
import type { AiScoreResult, RawSearchResult } from "../types/deal.js";

const SCORING_SYSTEM = `Tu es un analyste M&A spécialisé LBO PME en France (région PACA).
Tu évalues des annonces de cession / reprise à partir du titre et du snippet Google uniquement.

Grille de notation (score 0–100, somme des points applicables, bornée à [0, 100]) :
- +30 : revenus récurrents / contrats B2B / obligations légales (nettoyage, extincteurs, CVC, assainissement…)
- +25 : multiple Prix/EBE attractif (< 3.5x) OU reprise à la barre / judiciaire sans dettes mentionnées
- +25 : fort potentiel d'optimisation IA ou marketing digital (devis manuels, pas de site/e-commerce, process artisanaux)
- +20 : départ à la retraite explicite (crédit vendeur négociable)
- −40 : restauration traditionnelle, dropshipping pur, franchise contraignante, ou dépendance totale au dirigeant

Règles :
- Extrais les montants en EUR (nombres entiers). Si absent / ambigu → null.
- CA = chiffre d'affaires annuel. EBE/EBITDA = résultat d'exploitation approximatif.
- Motif : retraite, redressement judiciaire, liquidation, cession classique, inconnu…
- ai_upside : 1 phrase actionnable sur le levier de croissance (IA / digital / ops).
- ai_red_flags : 1 phrase sur les points de vigilance.
- ai_summary : 1–2 phrases synthétiques pour un investisseur pressé.
- Sois réaliste : un snippet flou ne mérite pas un score > 60.
- Réponds UNIQUEMENT en JSON valide conforme au schéma.`;

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    asking_price: { type: ["number", "null"] },
    revenue: { type: ["number", "null"] },
    ebitda_ebe: { type: ["number", "null"] },
    location: { type: ["string", "null"] },
    motif: { type: ["string", "null"] },
    score: { type: "integer", minimum: 0, maximum: 100 },
    summary: { type: "string" },
    red_flags: { type: "string" },
    upside: { type: "string" },
  },
  required: [
    "asking_price",
    "revenue",
    "ebitda_ebe",
    "location",
    "motif",
    "score",
    "summary",
    "red_flags",
    "upside",
  ],
} as const;

function buildUserPrompt(deal: RawSearchResult): string {
  return `Thèse d'investissement : ${deal.thesisName}
Plateforme : ${deal.sourcePlatform}
Titre : ${deal.title}
URL : ${deal.url}
Snippet : ${deal.snippet || "(aucun snippet)"}

Analyse cette opportunité selon la grille LBO PME.`;
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function parseAiJson(raw: string): AiScoreResult {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned) as Record<string, unknown>;

  return {
    askingPrice: typeof parsed.asking_price === "number" ? parsed.asking_price : null,
    revenue: typeof parsed.revenue === "number" ? parsed.revenue : null,
    ebitdaEbe: typeof parsed.ebitda_ebe === "number" ? parsed.ebitda_ebe : null,
    location: typeof parsed.location === "string" ? parsed.location : null,
    motif: typeof parsed.motif === "string" ? parsed.motif : null,
    score: clampScore(Number(parsed.score)),
    summary: String(parsed.summary ?? ""),
    redFlags: String(parsed.red_flags ?? ""),
    upside: String(parsed.upside ?? ""),
  };
}

async function scoreWithGemini(deal: RawSearchResult): Promise<AiScoreResult> {
  const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: buildUserPrompt(deal),
    config: {
      systemInstruction: SCORING_SYSTEM,
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Réponse Gemini vide");
  }
  return parseAiJson(text);
}

async function scoreWithOpenAI(deal: RawSearchResult): Promise<AiScoreResult> {
  const client = new OpenAI({ apiKey: env.openaiApiKey });

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "deal_score",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            asking_price: { type: ["number", "null"] },
            revenue: { type: ["number", "null"] },
            ebitda_ebe: { type: ["number", "null"] },
            location: { type: ["string", "null"] },
            motif: { type: ["string", "null"] },
            score: { type: "integer", minimum: 0, maximum: 100 },
            summary: { type: "string" },
            red_flags: { type: "string" },
            upside: { type: "string" },
          },
          required: [
            "asking_price",
            "revenue",
            "ebitda_ebe",
            "location",
            "motif",
            "score",
            "summary",
            "red_flags",
            "upside",
          ],
        },
      },
    },
    messages: [
      { role: "system", content: SCORING_SYSTEM },
      { role: "user", content: buildUserPrompt(deal) },
    ],
  });

  const text = completion.choices[0]?.message?.content;
  if (!text) {
    throw new Error("Réponse OpenAI vide");
  }
  return parseAiJson(text);
}

const FALLBACK_SCORE: AiScoreResult = {
  askingPrice: null,
  revenue: null,
  ebitdaEbe: null,
  location: null,
  motif: null,
  score: 40,
  summary: "Analyse IA indisponible — scoring par défaut appliqué.",
  redFlags: "Vérifier manuellement l'annonce (échec LLM).",
  upside: "À qualifier après lecture complète de la fiche.",
};

/**
 * Score une annonce via Gemini Flash ou GPT-4o-mini (sortie JSON structurée).
 */
export async function scoreDeal(deal: RawSearchResult): Promise<AiScoreResult> {
  try {
    if (env.aiProvider === "openai") {
      return await scoreWithOpenAI(deal);
    }
    return await scoreWithGemini(deal);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  ⚠️ Scoring IA échoué pour ${deal.url}: ${message}`);

    // Tentative de bascule sur l'autre provider si les deux clés sont présentes
    try {
      if (env.aiProvider === "gemini" && env.openaiApiKey) {
        console.log("  ↻ Fallback OpenAI…");
        return await scoreWithOpenAI(deal);
      }
      if (env.aiProvider === "openai" && env.geminiApiKey) {
        console.log("  ↻ Fallback Gemini…");
        return await scoreWithGemini(deal);
      }
    } catch (fallbackErr) {
      const fb = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      console.error(`  ⚠️ Fallback IA échoué: ${fb}`);
    }

    return { ...FALLBACK_SCORE };
  }
}

export async function scoreDeals(
  deals: RawSearchResult[],
): Promise<Map<string, AiScoreResult>> {
  const scores = new Map<string, AiScoreResult>();

  for (const deal of deals) {
    console.log(`  🧠 Scoring: ${deal.title.slice(0, 80)}`);
    const result = await scoreDeal(deal);
    scores.set(deal.urlHash, result);
    console.log(`     → score ${result.score}/100`);
  }

  return scores;
}
