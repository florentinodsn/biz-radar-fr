import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { env } from "../config/env.js";
import type { Deal, NewDealInput } from "../types/deal.js";

let dbInstance: Database.Database | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS deals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url_hash TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  source_platform TEXT NOT NULL,
  thesis_name TEXT NOT NULL,
  raw_snippet TEXT NOT NULL DEFAULT '',
  asking_price REAL,
  revenue REAL,
  ebitda_ebe REAL,
  score INTEGER NOT NULL DEFAULT 0,
  ai_summary TEXT NOT NULL DEFAULT '',
  ai_red_flags TEXT NOT NULL DEFAULT '',
  ai_upside TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'NEW' CHECK(status IN ('NEW', 'CONTACTED', 'IGNORED')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_deals_score ON deals(score DESC);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at DESC);
`;

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  mkdirSync(dirname(env.dbPath), { recursive: true });
  dbInstance = new Database(env.dbPath);
  dbInstance.pragma("journal_mode = WAL");
  dbInstance.pragma("foreign_keys = ON");
  dbInstance.exec(SCHEMA);
  return dbInstance;
}

export function initDatabase(): void {
  getDb();
}

export function dealExists(urlHash: string): boolean {
  const row = getDb()
    .prepare("SELECT 1 AS ok FROM deals WHERE url_hash = ? LIMIT 1")
    .get(urlHash) as { ok: number } | undefined;
  return Boolean(row);
}

export function insertDeal(input: NewDealInput): Deal {
  const result = getDb()
    .prepare(
      `INSERT INTO deals (
        url_hash, title, url, source_platform, thesis_name, raw_snippet,
        asking_price, revenue, ebitda_ebe, score,
        ai_summary, ai_red_flags, ai_upside, status
      ) VALUES (
        @urlHash, @title, @url, @sourcePlatform, @thesisName, @rawSnippet,
        @askingPrice, @revenue, @ebitdaEbe, @score,
        @aiSummary, @aiRedFlags, @aiUpside, 'NEW'
      )`,
    )
    .run({
      urlHash: input.urlHash,
      title: input.title,
      url: input.url,
      sourcePlatform: input.sourcePlatform,
      thesisName: input.thesisName,
      rawSnippet: input.rawSnippet,
      askingPrice: input.askingPrice,
      revenue: input.revenue,
      ebitdaEbe: input.ebitdaEbe,
      score: input.score,
      aiSummary: input.aiSummary,
      aiRedFlags: input.aiRedFlags,
      aiUpside: input.aiUpside,
    });

  const deal = getDb()
    .prepare("SELECT * FROM deals WHERE id = ?")
    .get(result.lastInsertRowid) as Deal;

  return deal;
}

export function getDealsByMinScore(minScore: number): Deal[] {
  return getDb()
    .prepare(
      `SELECT * FROM deals
       WHERE score >= ?
       ORDER BY score DESC, created_at DESC`,
    )
    .all(minScore) as Deal[];
}

export function getAllDealsOrdered(): Deal[] {
  return getDb()
    .prepare(
      `SELECT * FROM deals
       ORDER BY score DESC, created_at DESC`,
    )
    .all() as Deal[];
}

export function getRecentDeals(limit = 50): Deal[] {
  return getDb()
    .prepare(
      `SELECT * FROM deals
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(limit) as Deal[];
}

export function countDeals(): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS c FROM deals")
    .get() as { c: number };
  return row.c;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
