# Biz Radar FR

Veille automatisée d'entreprises à racheter en France — cessions pour départ à la retraite et reprises à la barre du tribunal.

Le pipeline combine **Google X-Ray Search** (SerpAPI), un **scoring LBO PME par LLM** (Gemini Flash / GPT-4o-mini), une base **SQLite** anti-doublons, et des alertes **Telegram** + rapport Markdown, le tout exécutable chaque matin via **GitHub Actions**.

## Architecture

```
src/
├── config/
│   ├── env.ts          # Variables d'environnement
│   └── theses.ts       # Thèses d'investissement (radars)
├── services/
│   ├── xraySearch.ts   # Requêtes Google X-Ray via SerpAPI
│   ├── database.ts     # SQLite anti-doublons + historique
│   ├── aiScorer.ts     # Extraction + score 0–100 (structured outputs)
│   └── notifier.ts     # Telegram + DEALS_REPORT.md
├── types/deal.ts
├── utils/
└── index.ts            # Entrypoint `npm run radar`
```

| Couche | Techno |
|--------|--------|
| Runtime | Node.js 20+, TypeScript, `tsx` |
| Collecte | SerpAPI (`engine: google`, `gl=fr`) |
| Scoring | `@google/genai` (Gemini Flash) ou `openai` (GPT-4o-mini) |
| Persist | `better-sqlite3` → `data/deals.db` |
| Alertes | Telegram Bot API + `DEALS_REPORT.md` |
| CI | `.github/workflows/daily-radar.yml` (cron 08h CET) |

## Thèses par défaut (PACA : 06 / 83 / 13)

1. **Services B2B Récurrents** — nettoyage, extincteurs, CVC  
2. **Niches industrielles** — bennes, recyclage, assainissement  
3. **Marques artisanales** — fabricants locaux à digitaliser  
4. **Reprises judiciaires** — actify / ajrs / a-reprendre  

Personnalisez-les dans [`src/config/theses.ts`](src/config/theses.ts).

## Démarrage local

```bash
git clone https://github.com/<vous>/biz-radar-fr.git
cd biz-radar-fr
npm install
cp .env.example .env
# Éditer .env : SERPAPI_KEY + GEMINI_API_KEY (ou OPENAI_API_KEY)
npm run radar
```

Options utiles :

```bash
npm run radar:dry   # collecte seule, pas de scoring / insert / Telegram
npm run db:init     # crée data/deals.db vide
npm run typecheck
```

## Secrets GitHub Actions

Settings → Secrets and variables → Actions :

| Secret | Obligatoire | Description |
|--------|-------------|-------------|
| `SERPAPI_KEY` | ✅ | Clé [SerpAPI](https://serpapi.com/) |
| `GEMINI_API_KEY` | ✅* | Clé [Google AI Studio](https://aistudio.google.com/apikey) |
| `OPENAI_API_KEY` | ✅* | Alternative / fallback GPT-4o-mini |
| `AI_PROVIDER` | ❌ | `gemini` ou `openai` (auto sinon) |
| `TELEGRAM_BOT_TOKEN` | ❌ | Token @BotFather |
| `TELEGRAM_CHAT_ID` | ❌ | ID du chat / canal |

\* Au moins une clé LLM est requise.

Le workflow [`.github/workflows/daily-radar.yml`](.github/workflows/daily-radar.yml) :

1. Checkout + Node 20 + `npm ci`
2. Exécute `npm run radar` avec les secrets
3. Commit / push `data/deals.db` et `DEALS_REPORT.md` sur `main`

Déclenchement manuel : Actions → **Daily Biz Radar** → *Run workflow*.

## Scoring LBO PME

| Points | Critère |
|--------|---------|
| +30 | Revenus récurrents / B2B / obligations légales |
| +25 | Multiple Prix/EBE &lt; 3.5x ou reprise à la barre |
| +25 | Potentiel optimisation IA / marketing digital |
| +20 | Départ à la retraite explicite |
| −40 | Restau, dropshipping, franchise, dépendance dirigeant |

Seuil d'alerte Telegram / section « Pépites » : **score ≥ 70** (`ALERT_SCORE_THRESHOLD`).

## Rapport

Consultez [`DEALS_REPORT.md`](DEALS_REPORT.md) directement sur GitHub — classé par score décroissant, régénéré à chaque run.

## Licence

MIT
