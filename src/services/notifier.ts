import { writeFileSync } from "node:fs";
import { env, hasTelegram } from "../config/env.js";
import { getAllDealsOrdered } from "./database.js";
import type { Deal } from "../types/deal.js";
import { escapeMarkdown, formatEur, scoreBadge, todayIsoDate } from "../utils/format.js";

function formatTelegramMessage(deals: Deal[]): string {
  const header = `🎯 *Biz Radar FR* — ${deals.length} pépite(s) (score ≥ ${env.alertScoreThreshold})\n`;

  const body = deals
    .map((d, i) => {
      const lines = [
        `*${i + 1}. ${escapeMarkdown(d.title)}* ${scoreBadge(d.score)}`,
        `Score: *${d.score}/100* · ${escapeMarkdown(d.thesis_name)}`,
        `Prix: ${formatEur(d.asking_price)} · CA: ${formatEur(d.revenue)} · EBE: ${formatEur(d.ebitda_ebe)}`,
        `📝 ${escapeMarkdown(d.ai_summary)}`,
        `🚀 ${escapeMarkdown(d.ai_upside)}`,
        `⚠️ ${escapeMarkdown(d.ai_red_flags)}`,
        `[Voir l'annonce](${d.url})`,
      ];
      return lines.join("\n");
    })
    .join("\n\n---\n\n");

  return `${header}\n${body}`;
}

/**
 * Envoie une alerte Telegram Bot API (si credentials configurés).
 */
export async function sendTelegramAlert(deals: Deal[]): Promise<boolean> {
  if (!hasTelegram()) {
    console.log("  ℹ️ Telegram non configuré — alerte console uniquement.");
    return false;
  }

  if (deals.length === 0) {
    console.log("  ℹ️ Aucun deal au-dessus du seuil — pas d'alerte Telegram.");
    return false;
  }

  const text = formatTelegramMessage(deals);
  const endpoint = `https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: env.telegramChatId,
      text,
      parse_mode: "Markdown",
      disable_web_page_preview: false,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Telegram API ${response.status}: ${errBody}`);
  }

  console.log(`  📬 Alerte Telegram envoyée (${deals.length} deal(s)).`);
  return true;
}

function dealMarkdownBlock(deal: Deal, rank: number): string {
  return `### ${rank}. ${scoreBadge(deal.score)} [${deal.title}](${deal.url})

| Champ | Valeur |
|-------|--------|
| **Score** | **${deal.score}/100** |
| **Thèse** | ${deal.thesis_name} |
| **Plateforme** | ${deal.source_platform} |
| **Prix demandé** | ${formatEur(deal.asking_price)} |
| **CA** | ${formatEur(deal.revenue)} |
| **EBE / EBITDA** | ${formatEur(deal.ebitda_ebe)} |
| **Statut** | ${deal.status} |
| **Détecté le** | ${deal.created_at} |

> ${deal.ai_summary}

- **Levier IA / digital :** ${deal.ai_upside}
- **Points de vigilance :** ${deal.ai_red_flags}
`;
}

/**
 * Régénère DEALS_REPORT.md à la racine (classement par score décroissant).
 */
export function writeDealsReport(minScoreForHighlight = env.alertScoreThreshold): string {
  const deals = getAllDealsOrdered();
  const hot = deals.filter((d) => d.score >= minScoreForHighlight);
  const rest = deals.filter((d) => d.score < minScoreForHighlight);

  const lines: string[] = [
    "# Biz Radar FR — Rapport des opportunités",
    "",
    `> Dernière mise à jour : **${todayIsoDate()}** · ${deals.length} annonce(s) en base · seuil d'alerte : **${minScoreForHighlight}/100**`,
    "",
    "## Pépites (score ≥ " + minScoreForHighlight + ")",
    "",
  ];

  if (hot.length === 0) {
    lines.push("_Aucune pépite au-dessus du seuil pour le moment._", "");
  } else {
    hot.forEach((d, i) => lines.push(dealMarkdownBlock(d, i + 1), ""));
  }

  lines.push("## Autres opportunités suivies", "");

  if (rest.length === 0) {
    lines.push("_Aucune autre annonce._", "");
  } else {
    rest.forEach((d, i) => lines.push(dealMarkdownBlock(d, i + 1), ""));
  }

  lines.push(
    "---",
    "",
    "_Généré automatiquement par [biz-radar-fr](./README.md). Ne pas éditer à la main._",
    "",
  );

  const content = lines.join("\n");
  writeFileSync(env.reportPath, content, "utf8");
  console.log(`  📄 Rapport écrit → ${env.reportPath}`);
  return content;
}

/**
 * Log console lisible des nouveaux deals hot.
 */
export function logConsoleAlert(deals: Deal[]): void {
  if (deals.length === 0) {
    console.log("\n✓ Aucune nouvelle pépite aujourd'hui.");
    return;
  }

  console.log(`\n═══ ${deals.length} NOUVELLE(S) PÉPITE(S) ═══`);
  for (const d of deals) {
    console.log(
      [
        `${scoreBadge(d.score)} [${d.score}] ${d.title}`,
        `   ${d.url}`,
        `   Prix ${formatEur(d.asking_price)} | CA ${formatEur(d.revenue)} | EBE ${formatEur(d.ebitda_ebe)}`,
        `   ${d.ai_summary}`,
      ].join("\n"),
    );
  }
  console.log("═══════════════════════════════════\n");
}
