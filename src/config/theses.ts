import type { InvestmentThesis } from "../types/deal.js";

/** Région PACA cible (06 / 83 / 13) */
export const PACA_REGIONS = [
  "06",
  "Alpes-Maritimes",
  "Nice",
  "Cannes",
  "Antibes",
  "83",
  "Var",
  "Toulon",
  "Fréjus",
  "Draguignan",
  "13",
  "Bouches-du-Rhône",
  "Marseille",
  "Aix-en-Provence",
  "PACA",
  "Provence",
] as const;

const MARKETPLACE_SOURCES = [
  "transentreprise.com",
  "cessionpme.com",
  "fusacq.com",
] as const;

const DEFAULT_EXCLUSIONS = [
  "franchise",
  "location",
  "louer",
  "emploi",
  "recrutement",
  "offre d'emploi",
] as const;

/**
 * Thèses d'investissement (radars) — personnalisez librement ce fichier.
 */
export const INVESTMENT_THESES: InvestmentThesis[] = [
  {
    id: "b2b-recurrent",
    name: "Services B2B Récurrents",
    description:
      "Nettoyage de bureaux, sécurité incendie / extincteurs, entretien chaudières / CVC — revenus récurrents et obligations légales.",
    sources: [...MARKETPLACE_SOURCES],
    keywords: [
      "nettoyage",
      "extincteurs",
      "sécurité incendie",
      "chauffage",
      "climatisation",
      "CVC",
      "chaudière",
      "retraite",
      "cession",
    ],
    regions: [...PACA_REGIONS],
    exclusions: [...DEFAULT_EXCLUSIONS],
  },
  {
    id: "niches-industrielles",
    name: 'Niches "Ennuyeuses" & Industrielles',
    description:
      "Location de bennes, recyclage, assainissement, maintenance industrielle — niches peu sexy, cash-flow solide.",
    sources: [...MARKETPLACE_SOURCES],
    keywords: [
      "bennes",
      "location de bennes",
      "recyclage",
      "assainissement",
      "maintenance industrielle",
      "déchets",
      "curage",
      "fosse septique",
      "retraite",
      "cession",
    ],
    regions: [...PACA_REGIONS],
    exclusions: [...DEFAULT_EXCLUSIONS],
  },
  {
    id: "marques-artisanales",
    name: "Marques Artisanales à Réveiller",
    description:
      "Petits fabricants locaux (alimentaire, cosmétique, produits physiques) avec fort savoir-faire et faible présence digitale.",
    sources: ["transentreprise.com", "cessionpme.com"],
    keywords: [
      "fabrication",
      "artisanal",
      "alimentaire",
      "cosmétique",
      "producteur",
      "confiserie",
      "fromage",
      "savon",
      "e-commerce",
      "retraite",
      "cession",
    ],
    regions: [...PACA_REGIONS],
    exclusions: [...DEFAULT_EXCLUSIONS, "dropshipping", "franchise"],
  },
  {
    id: "reprises-judiciaires",
    name: "Reprises Judiciaires (Barre du tribunal)",
    description:
      "Fonds de commerce et appels d'offres de cession issus de procédures collectives / liquidations.",
    sources: ["actify.fr", "ajrs.fr", "a-reprendre.com"],
    keywords: [
      "fonds de commerce",
      "cession",
      "appel d'offres",
      "liquidation",
      "redressement judiciaire",
      "à la barre",
      "06",
      "83",
      "PACA",
    ],
    regions: [...PACA_REGIONS],
    exclusions: ["emploi", "recrutement"],
    judicial: true,
  },
];

export function getThesisById(id: string): InvestmentThesis | undefined {
  return INVESTMENT_THESES.find((t) => t.id === id);
}
