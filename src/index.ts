import { assertRequiredEnv, env } from "./config/env.js";
import { INVESTMENT_THESES } from "./config/theses.js";
import {
  closeDatabase,
  dealExists,
  getDealsByMinScore,
  initDatabase,
  insertDeal,
} from "./services/database.js";
import { scoreDeal } from "./services/aiScorer.js";
import {
  logConsoleAlert,
  sendTelegramAlert,
  writeDealsReport,
} from "./services/notifier.js";
import { searchAllTheses } from "./services/xraySearch.js";
import type { Deal } from "./types/deal.js";

async function runRadar(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  console.log("═══════════════════════════════════════");
  console.log("  Biz Radar FR — veille cessions PME");
  console.log(`  Provider IA : ${env.aiProvider}`);
  console.log(`  Seuil alerte : ${env.alertScoreThreshold}`);
  console.log(`  Mode : ${dryRun ? "dry-run" : "production"}`);
  console.log("═══════════════════════════════════════\n");

  assertRequiredEnv();
  initDatabase();

  console.log(`📡 ${INVESTMENT_THESES.length} thèse(s) actives\n`);

  const rawResults = await searchAllTheses(INVESTMENT_THESES);
  console.log(`\n📦 ${rawResults.length} résultat(s) bruts après dédoublonnage inter-thèses`);

  const fresh = rawResults.filter((r) => !dealExists(r.urlHash));
  console.log(`✨ ${fresh.length} nouvelle(s) annonce(s) à scorér\n`);

  if (fresh.length === 0) {
    writeDealsReport();
    logConsoleAlert([]);
    return;
  }

  if (dryRun) {
    console.log("Dry-run : scoring / insert / Telegram ignorés. Annonces candidates :");
    for (const r of fresh) {
      console.log(`  - [${r.thesisName}] ${r.title}\n    ${r.url}`);
    }
    writeDealsReport();
    return;
  }

  const hotNew: Deal[] = [];

  for (const raw of fresh) {
    const ai = await scoreDeal(raw);
    const deal = insertDeal({
      urlHash: raw.urlHash,
      title: raw.title,
      url: raw.url,
      sourcePlatform: raw.sourcePlatform,
      thesisName: raw.thesisName,
      rawSnippet: raw.snippet,
      askingPrice: ai.askingPrice,
      revenue: ai.revenue,
      ebitdaEbe: ai.ebitdaEbe,
      score: ai.score,
      aiSummary: ai.summary,
      aiRedFlags: ai.redFlags,
      aiUpside: ai.upside,
    });

    if (deal.score >= env.alertScoreThreshold) {
      hotNew.push(deal);
    }
  }

  writeDealsReport();
  logConsoleAlert(hotNew);

  // Alertes = nouvelles pépites du run (évite de re-spammer l'historique)
  try {
    await sendTelegramAlert(hotNew);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`⚠️ Échec Telegram: ${message}`);
  }

  const allHot = getDealsByMinScore(env.alertScoreThreshold);
  console.log(
    `✓ Run terminé — ${fresh.length} inséré(s), ${hotNew.length} nouvelle(s) pépite(s), ${allHot.length} pépite(s) totales en base.`,
  );
}

runRadar()
  .catch((err) => {
    console.error("💥 Radar en échec:", err);
    process.exitCode = 1;
  })
  .finally(() => {
    closeDatabase();
  });
