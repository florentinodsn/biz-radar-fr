import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";

loadDotenv({ path: resolve(process.cwd(), ".env") });

export type AiProvider = "gemini" | "openai";

function boolEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function resolveAiProvider(): AiProvider {
  const forced = process.env.AI_PROVIDER?.toLowerCase();
  if (forced === "gemini" || forced === "openai") return forced;
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "gemini";
}

export const env = {
  serpApiKey: process.env.SERPAPI_KEY ?? "",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  aiProvider: resolveAiProvider(),
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID ?? "",
  serpApiWeeklyOnly: boolEnv("SERPAPI_WEEKLY_ONLY", true),
  alertScoreThreshold: intEnv("ALERT_SCORE_THRESHOLD", 70),
  serpApiNumResults: intEnv("SERPAPI_NUM_RESULTS", 10),
  dbPath: resolve(process.cwd(), "data", "deals.db"),
  reportPath: resolve(process.cwd(), "DEALS_REPORT.md"),
};

export function assertRequiredEnv(): void {
  const missing: string[] = [];
  if (!env.serpApiKey) missing.push("SERPAPI_KEY");

  if (env.aiProvider === "gemini" && !env.geminiApiKey) {
    missing.push("GEMINI_API_KEY");
  }
  if (env.aiProvider === "openai" && !env.openaiApiKey) {
    missing.push("OPENAI_API_KEY");
  }
  if (!env.geminiApiKey && !env.openaiApiKey) {
    if (!missing.includes("GEMINI_API_KEY") && !missing.includes("OPENAI_API_KEY")) {
      missing.push("GEMINI_API_KEY ou OPENAI_API_KEY");
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Variables d'environnement manquantes : ${missing.join(", ")}. Copiez .env.example vers .env.`,
    );
  }
}

export function hasTelegram(): boolean {
  return Boolean(env.telegramBotToken && env.telegramChatId);
}
