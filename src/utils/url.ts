import { createHash } from "node:crypto";

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "gclid",
  "fbclid",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_src",
  "si",
]);

/**
 * Normalise une URL : strip fragment, UTM / tracking params, trailing slash.
 */
export function normalizeUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return rawUrl.trim();
  }

  parsed.hash = "";

  const kept = new URLSearchParams();
  for (const [key, value] of parsed.searchParams.entries()) {
    if (!TRACKING_PARAMS.has(key.toLowerCase())) {
      kept.append(key, value);
    }
  }
  parsed.search = kept.toString();

  let href = parsed.toString();
  if (href.endsWith("/") && parsed.pathname !== "/") {
    href = href.slice(0, -1);
  }
  return href;
}

export function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function urlHash(rawUrl: string): string {
  return sha256(normalizeUrl(rawUrl));
}

export function extractHostname(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}
