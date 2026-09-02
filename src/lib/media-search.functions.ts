import { createServerFn } from "@tanstack/react-start";

export type SearchMediaType = "book" | "game" | "movie";

export interface NormalizedResult {
  external_id: string;
  title: string;
  creator: string | null;
  release_year: number | null;
  cover_url: string | null;
  summary: string | null;
  media_type: SearchMediaType;
  platform: string | null;
}

interface Input {
  query: string;
  type: SearchMediaType;
}

const ISBN_RE = /^(97(8|9))?\d{9}(\d|X)$/i;

function isBarcode(value: string): boolean {
  const cleaned = value.replace(/[\s-]/g, "");
  return ISBN_RE.test(cleaned) || /^\d{12,13}$/.test(cleaned);
}

function year(value?: string | null): number | null {
  if (!value) return null;
  const parsed = Number(String(value).slice(0, 4));
  return Number.isFinite(parsed) && parsed > 1200 ? parsed : null;
}

function cleanBookCover(raw?: string): string | null {
  if (!raw) return null;
  let url = raw.replace(/^http:\/\//, "https://").replace(/&edge=curl/g, "");
  if (/zoom=\d/.test(url)) url = url.replace(/zoom=\d/, "zoom=2");
  return url;
}

function coverFallback(title: string): string {
  return `https://placehold.co/400x600/1A1D26/6366F1/png?text=${encodeURIComponent(title.slice(0, 40))}`;
}

interface GoogleVolume {
  id: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publishedDate?: string;
    description?: string;
    imageLinks?: Record<string, string>;
  };
}

async function fetchGoogleBooks(q: string, key: string | undefined, lang?: string): Promise<GoogleVolume[]> {
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", q);
  url.searchParams.set("maxResults", "20");
  url.searchParams.set("printType", "books");
  if (lang) url.searchParams.set("langRestrict", lang);
  if (key) url.searchParams.set("key", key);

  const res = await fetch(url);
  if (!res.ok) throw new Error("Google Books no respondió correctamente");
  const json = (await res.json()) as { items?: GoogleVolume[] };
  return json.items ?? [];
}

async function searchBooks(query: string): Promise<NormalizedResult[]> {
  const key = process.env["GOOGLE_BOOKS_API_KEY"];
  const cleaned = query.replace(/[\s-]/g, "");
  const barcode = isBarcode(query);
  const q = barcode ? `isbn:${cleaned}` : query;

  let items = await fetchGoogleBooks(q, key, barcode ? undefined : "es");
  if (items.length === 0) items = await fetchGoogleBooks(q, key);

  return items.map((volume) => {
    const info = volume.volumeInfo ?? {};
    const links = info.imageLinks ?? {};
    const title = [info.title, info.subtitle].filter(Boolean).join(": ") || "Sin título";
    const cover =
      cleanBookCover(
        links["extraLarge"] ?? links["large"] ?? links["medium"] ?? links["thumbnail"] ?? links["smallThumbnail"],
      ) ?? coverFallback(title);
    return {
      external_id: volume.id,
      title,
      creator: info.authors?.join(", ") ?? null,
      release_year: year(info.publishedDate),
      cover_url: cover,
      summary: info.description ?? null,
      media_type: "book" as const,
      platform: null,
    };
  });
}


async function searchMovies(query: string): Promise<NormalizedResult[]> {
  const key = process.env["TMDB_API_KEY"];
  if (!key) throw new Error("Falta la clave TMDB_API_KEY en el backend");

  const url = new URL("https://api.themoviedb.org/3/search/movie");
  url.searchParams.set("query", query);
  url.searchParams.set("language", "es-ES");
  url.searchParams.set("include_adult", "false");

  const isV4Token = key.split(".").length === 3;
  if (!isV4Token) url.searchParams.set("api_key", key);

  const res = await fetch(url, {
    headers: isV4Token ? { Authorization: `Bearer ${key}` } : {},
  });
  if (!res.ok) throw new Error("TMDB no respondió correctamente");
  const json = (await res.json()) as {
    results?: {
      id: number;
      title?: string;
      original_title?: string;
      release_date?: string;
      overview?: string;
      poster_path?: string | null;
    }[];
  };

  const movies = json.results ?? [];
  const detailed = await Promise.all(
    movies.slice(0, 12).map(async (movie) => {
      let director: string | null = null;
      try {
        const creditsUrl = new URL(`https://api.themoviedb.org/3/movie/${movie.id}/credits`);
        if (!isV4Token) creditsUrl.searchParams.set("api_key", key);
        const creditsRes = await fetch(creditsUrl, {
          headers: isV4Token ? { Authorization: `Bearer ${key}` } : {},
        });
        if (creditsRes.ok) {
          const credits = (await creditsRes.json()) as { crew?: { job?: string; name?: string }[] };
          director = credits.crew?.find((member) => member.job === "Director")?.name ?? null;
        }
      } catch {
        director = null;
      }
      return {
        external_id: `tmdb-${movie.id}`,
        title: movie.title || movie.original_title || "Sin título",
        creator: director,
        release_year: year(movie.release_date),
        cover_url: movie.poster_path ? `https://image.tmdb.org/t/p/w780${movie.poster_path}` : null,
        summary: movie.overview || null,
        media_type: "movie" as const,
        platform: null,
      };
    }),
  );
  return detailed;
}

async function searchGames(query: string): Promise<NormalizedResult[]> {
  const key = process.env["RAWG_API_KEY"];
  if (!key) throw new Error("Falta la clave RAWG_API_KEY en el backend");

  const url = new URL("https://api.rawg.io/api/games");
  url.searchParams.set("key", key);
  url.searchParams.set("search", query);
  url.searchParams.set("page_size", "12");

  const res = await fetch(url);
  if (!res.ok) throw new Error("RAWG no respondió correctamente");
  const json = (await res.json()) as {
    results?: {
      id: number;
      name?: string;
      released?: string;
      background_image?: string | null;
      platforms?: { platform?: { name?: string } }[];
      developers?: { name?: string }[];
      publishers?: { name?: string }[];
    }[];
  };

  return (json.results ?? []).map((game) => ({
    external_id: `rawg-${game.id}`,
    title: game.name || "Sin título",
    creator: game.developers?.[0]?.name ?? game.publishers?.[0]?.name ?? null,
    release_year: year(game.released),
    cover_url: game.background_image ?? null,
    summary: null,
    media_type: "game" as const,
    platform: game.platforms?.[0]?.platform?.name ?? null,
  }));
}

export const searchMediaRemote = createServerFn({ method: "POST" })
  .inputValidator((input: Input) => {
    const query = String(input?.query ?? "").trim();
    const type = input?.type;
    if (!query) throw new Error("La búsqueda no puede estar vacía");
    if (type !== "book" && type !== "game" && type !== "movie") throw new Error("Tipo no soportado");
    return { query, type };
  })
  .handler(async ({ data }): Promise<{ results: NormalizedResult[]; error: string | null }> => {
    try {
      if (data.type === "book") return { results: await searchBooks(data.query), error: null };
      if (data.type === "movie") return { results: await searchMovies(data.query), error: null };
      return { results: await searchGames(data.query), error: null };
    } catch (error) {
      return {
        results: [],
        error: error instanceof Error ? error.message : "No se pudo completar la búsqueda",
      };
    }
  });
