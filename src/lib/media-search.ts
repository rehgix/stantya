import type { MediaType } from "./collection";

export interface SearchResult {
  externalId: string | null;
  mediaType: MediaType;
  title: string;
  creator: string | null;
  releaseYear: number | null;
  coverUrl: string | null;
  platform: string | null;
  baseValue: number | null;
}

interface GoogleBooksVolume {
  id: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publishedDate?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    industryIdentifiers?: { identifier: string }[];
  };
  saleInfo?: { listPrice?: { amount?: number; currencyCode?: string } };
}

const ISBN_RE = /^(97(8|9))?\d{9}(\d|X)$/i;

/** Busca libros en la API gratuita de Google Books por título o ISBN. */
export async function searchBooks(query: string): Promise<SearchResult[]> {
  const term = query.trim();
  if (term.length < 3) return [];

  const cleaned = term.replace(/[\s-]/g, "");
  const q = ISBN_RE.test(cleaned) ? `isbn:${cleaned}` : term;

  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=12&printType=books&langRestrict=es`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("No se pudo consultar Google Books");

  const json = (await res.json()) as { items?: GoogleBooksVolume[] };
  return (json.items ?? []).map((volume) => {
    const info = volume.volumeInfo ?? {};
    const year = info.publishedDate ? Number(info.publishedDate.slice(0, 4)) : null;
    const price =
      info && volume.saleInfo?.listPrice?.currencyCode === "EUR"
        ? (volume.saleInfo.listPrice.amount ?? null)
        : null;
    return {
      externalId: volume.id,
      mediaType: "book" as MediaType,
      title: info.title ?? "Sin título",
      creator: info.authors?.join(", ") ?? null,
      releaseYear: Number.isFinite(year) ? year : null,
      coverUrl:
        info.imageLinks?.thumbnail?.replace("http://", "https://") ??
        info.imageLinks?.smallThumbnail?.replace("http://", "https://") ??
        null,
      platform: null,
      baseValue: price,
    };
  });
}

export const GAME_PLATFORMS = [
  "PS5",
  "PS4",
  "PS3",
  "PS2",
  "PS1",
  "Nintendo Switch",
  "Nintendo 64",
  "SNES",
  "Game Boy",
  "Xbox Series",
  "Xbox 360",
  "Mega Drive",
  "PC",
];

export const MOVIE_FORMATS = ["4K UHD", "Blu-ray", "DVD", "VHS", "LaserDisc", "Steelbook"];
