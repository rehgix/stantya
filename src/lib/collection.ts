export type MediaType = "book" | "game" | "movie";
export type Condition = "nuevo" | "muy_bueno" | "bueno" | "aceptable";

export const MEDIA_LABEL: Record<MediaType, string> = {
  book: "Libro",
  game: "Videojuego",
  movie: "Película",
};

export const CONDITIONS: { value: Condition; label: string; factor: number }[] = [
  { value: "nuevo", label: "Nuevo", factor: 1 },
  { value: "muy_bueno", label: "Muy bueno", factor: 0.82 },
  { value: "bueno", label: "Bueno", factor: 0.65 },
  { value: "aceptable", label: "Aceptable", factor: 0.45 },
];

export const CONDITION_LABEL: Record<Condition, string> = {
  nuevo: "Nuevo",
  muy_bueno: "Muy bueno",
  bueno: "Bueno",
  aceptable: "Aceptable",
};

export interface ItemRow {
  id: string;
  media_type: MediaType;
  title: string;
  creator: string | null;
  release_year: number | null;
  cover_url: string | null;
  platform: string | null;
  external_id: string | null;
  base_value_eur: number | null;
}

export interface InventoryRow {
  id: string;
  item_id: string;
  condition: Condition;
  purchase_price_eur: number;
  market_value_eur: number;
  is_wishlist: boolean;
  items: ItemRow | null;
}

const euro = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

export function formatEur(value: number): string {
  return euro.format(value);
}

export function formatDelta(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${euro.format(Math.abs(value))}`;
}

/**
 * Estimación de precio de mercado: valor base de referencia del artículo,
 * ajustado por estado de conservación y por una prima de antigüedad
 * (los formatos físicos antiguos y descatalogados se revalorizan).
 */
export function estimateMarketValue(input: {
  mediaType: MediaType;
  releaseYear?: number | null;
  condition: Condition;
  baseValue?: number | null;
  purchasePrice?: number | null;
}): number {
  const defaults: Record<MediaType, number> = { book: 16, game: 45, movie: 18 };
  const base =
    input.baseValue && input.baseValue > 0
      ? input.baseValue
      : input.purchasePrice && input.purchasePrice > 0
        ? input.purchasePrice
        : defaults[input.mediaType];

  const currentYear = new Date().getFullYear();
  const age = input.releaseYear ? Math.max(0, currentYear - input.releaseYear) : 0;
  const vintagePremium = Math.min(1.6, 1 + (age > 12 ? (age - 12) * 0.035 : 0));

  const factor = CONDITIONS.find((c) => c.value === input.condition)?.factor ?? 0.65;

  return Math.round(base * vintagePremium * factor * 100) / 100;
}
