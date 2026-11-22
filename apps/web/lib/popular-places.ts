/**
 * Resorts UK families book most, counted ahead of time overnight by the job (api/cron/places) so
 * Visit before you book answers from a saved count instead of waiting on busy map servers.
 * A family's search within 600 m of one of these uses the same count, whatever name they type.
 * Add places freely: each costs one map lookup a month.
 */
export const POPULAR_PLACES: readonly string[] = [
  // Spain: mainland
  "Benidorm, Spain",
  "Salou, Spain",
  "Lloret de Mar, Spain",
  "Torremolinos, Spain",
  "Benalmádena, Spain",
  "Fuengirola, Spain",
  "Marbella, Spain",
  "Barcelona, Spain",
  // Balearic Islands
  "Alcúdia, Mallorca",
  "Magaluf, Mallorca",
  "Palmanova, Mallorca",
  "Santa Ponsa, Mallorca",
  "Port de Pollença, Mallorca",
  "Cala d'Or, Mallorca",
  "Sant Antoni de Portmany, Ibiza",
  "Santa Eulària des Riu, Ibiza",
  "Cala en Bosc, Menorca",
  // Canary Islands
  "Costa Adeje, Tenerife",
  "Playa de las Américas, Tenerife",
  "Los Cristianos, Tenerife",
  "Puerto de la Cruz, Tenerife",
  "Puerto del Carmen, Lanzarote",
  "Playa Blanca, Lanzarote",
  "Costa Teguise, Lanzarote",
  "Corralejo, Fuerteventura",
  "Caleta de Fuste, Fuerteventura",
  "Playa del Inglés, Gran Canaria",
  "Puerto Rico, Gran Canaria",
  // Portugal
  "Albufeira, Portugal",
  "Vilamoura, Portugal",
  "Lagos, Portugal",
  "Praia da Rocha, Portugal",
  "Funchal, Madeira",
  // Greece
  "Kavos, Corfu",
  "Kassiopi, Corfu",
  "Laganas, Zakynthos",
  "Tsilivi, Zakynthos",
  "Malia, Crete",
  "Hersonissos, Crete",
  "Chania, Crete",
  "Faliraki, Rhodes",
  "Lindos, Rhodes",
  "Kardamena, Kos",
  // Cyprus
  "Ayia Napa, Cyprus",
  "Protaras, Cyprus",
  "Paphos, Cyprus",
  // Turkey
  "Marmaris, Turkey",
  "İçmeler, Marmaris",
  "Bodrum, Turkey",
  "Side, Turkey",
  "Alanya, Turkey",
  "Ölüdeniz, Turkey",
  // Elsewhere
  "St Julian's, Malta",
  "Sliema, Malta",
  "Sharm el-Sheikh, Egypt",
  "Hurghada, Egypt",
  "Dubrovnik, Croatia",
];
