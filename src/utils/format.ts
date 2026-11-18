export function formatEur(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "N/C";
  }
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function escapeMarkdown(text: string): string {
  return text.replace(/([_*`\[\]])/g, "\\$1");
}

export function scoreBadge(score: number): string {
  if (score >= 85) return "🔥";
  if (score >= 70) return "✅";
  if (score >= 50) return "👀";
  return "❄️";
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
