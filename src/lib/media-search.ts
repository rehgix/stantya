import type { MediaType } from "./collection";
import { searchMediaRemote, type NormalizedResult } from "./media-search.functions";

export interface SearchResult {
  externalId: string | null;
  mediaType: MediaType;
  title: string;
  creator: string | null;
  releaseYear: number | null;
  coverUrl: string | null;
  platform: string | null;
  synopsis: string | null;
  publisher: string | null;
  isbn: string | null;
  edition: string | null;
  sources: string[];
  altCovers: string[];
  language: string | null;
  international: boolean;
  needsFallback: boolean;
}


const ISBN_RE = /^(97(8|9))?\d{9}(\d|X)$/i;

export function looksLikeBarcode(value: string): boolean {
  const cleaned = value.replace(/[\s-]/g, "");
  return ISBN_RE.test(cleaned) || /^\d{12,13}$/.test(cleaned);
}

function toSearchResult(row: NormalizedResult): SearchResult {
  return {
    externalId: row.external_id,
    mediaType: row.media_type,
    title: row.title,
    creator: row.creator,
    releaseYear: row.release_year,
    coverUrl: row.cover_url,
    platform: row.platform,
    synopsis: row.summary,
    publisher: row.publisher,
    isbn: row.isbn,
    edition: row.edition,
    sources: row.sources ?? [],
    altCovers: row.alt_covers ?? [],
    language: row.language ?? null,
    international: row.international ?? false,
    needsFallback: row.needs_fallback ?? false,
  };
}


/** Consulta la función de servidor segura que habla con Google Books, Open Library, TMDB y TheGamesDB. */
export async function searchMedia(mediaType: MediaType, query: string): Promise<SearchResult[]> {
  const term = query.trim();
  if (term.length < 2) return [];
  const { results, error } = await searchMediaRemote({ data: { query: term, type: mediaType } });
  if (error) throw new Error(error);
  return results.map(toSearchResult);
}

export function searchBooks(query: string): Promise<SearchResult[]> {
  return searchMedia("book", query);
}

export function searchGames(query: string): Promise<SearchResult[]> {
  return searchMedia("game", query);
}

export function searchMovies(query: string): Promise<SearchResult[]> {
  return searchMedia("movie", query);
}
