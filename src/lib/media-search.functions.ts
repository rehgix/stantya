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
  /** Editorial (libros) o estudio/distribuidora */
  publisher: string | null;
  /** ISBN-13/10 de la edición física concreta */
  isbn: string | null;
  /** Etiqueta corta de la edición física ("Tapa dura", "PS5", …) */
  edition: string | null;
  /** Fuentes que aportaron datos a este resultado ("OpenLib", "Google Books", …) */
  sources: string[];
  /** Carátulas alternativas encontradas en otras fuentes */
  alt_covers: string[];
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
  if (/zoom=\d/.test(url)) url = url.replace(/zoom=\d/, "zoom=3");
  else if (url.includes("books.google")) url += (url.includes("?") ? "&" : "?") + "zoom=3";
  return url;
}

/** fetch con timeout: ninguna API puede bloquear el agregador. */
async function fetchSafe(input: string | URL, init?: RequestInit & { timeoutMs?: number }): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init?.timeoutMs ?? 8000);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function isFallbackCover(url: string | null): boolean {
  return !url || url.includes("placehold.co");
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
    publisher?: string;
    publishedDate?: string;
    description?: string;
    printType?: string;
    pageCount?: number;
    industryIdentifiers?: { type?: string; identifier?: string }[];
    imageLinks?: Record<string, string>;
  };
}

async function fetchGoogleBooks(q: string, key: string | undefined, lang?: string): Promise<GoogleVolume[]> {
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", q);
  url.searchParams.set("maxResults", "40");
  url.searchParams.set("printType", "books");
  url.searchParams.set("country", "ES");
  if (lang) url.searchParams.set("langRestrict", lang);
  if (key) url.searchParams.set("key", key);

  const res = await fetchSafe(url);
  if (!res.ok) throw new Error("Google Books no respondió correctamente");
  const json = (await res.json()) as { items?: GoogleVolume[] };
  return json.items ?? [];
}

/** Deduce el formato físico probable de la edición a partir de los datos de Google Books. */
function bookEdition(info: NonNullable<GoogleVolume["volumeInfo"]>): string | null {
  const pages = info.pageCount ?? 0;
  if (info.printType && info.printType !== "BOOK") return "Ilustrado";
  if (pages > 0 && pages < 200) return "Bolsillo";
  if (pages >= 500) return "Tapa dura";
  return "Tapa blanda";
}

interface OpenLibraryDoc {
  key?: string;
  title?: string;
  author_name?: string[];
  publisher?: string[];
  first_publish_year?: number;
  cover_i?: number;
  isbn?: string[];
  number_of_pages_median?: number;
}

/** Open Library: catálogo abierto de ediciones físicas, sin API key. */
async function searchOpenLibrary(query: string): Promise<NormalizedResult[]> {
  const cleaned = query.replace(/[\s-]/g, "");
  const q = isBarcode(query) ? `isbn:${cleaned}` : query;
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=25`;
  const res = await fetchSafe(url);
  if (!res.ok) throw new Error("Open Library no respondió correctamente");
  const json = (await res.json()) as { docs?: OpenLibraryDoc[] };

  return (json.docs ?? []).map((doc, index) => {
    const title = doc.title || "Sin título";
    const pages = doc.number_of_pages_median ?? 0;
    return {
      external_id: doc.key ?? `ol-${index}-${title}`,
      title,
      creator: doc.author_name?.[0] ?? "Desconocido",
      release_year: doc.first_publish_year ?? null,
      cover_url: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
        : coverFallback(title),
      summary: null,
      media_type: "book" as const,
      platform: doc.publisher?.[0] ?? null,
      publisher: doc.publisher?.[0] ?? null,
      isbn: doc.isbn?.[0] ?? null,
      edition: pages > 0 && pages < 200 ? "Bolsillo" : pages >= 500 ? "Tapa dura" : "Tapa blanda",
      sources: ["OpenLib"],
      alt_covers: [],
    };
  });
}

async function searchBooks(query: string): Promise<NormalizedResult[]> {
  const [openLibrary, google] = await Promise.all([
    searchOpenLibrary(query).catch(() => [] as NormalizedResult[]),
    searchGoogleBooksResults(query).catch(() => [] as NormalizedResult[]),
  ]);
  const seen = new Set<string>();
  const merged: NormalizedResult[] = [];
  for (const result of [...openLibrary, ...google]) {
    const fingerprint = `${result.title.toLowerCase()}|${result.publisher?.toLowerCase() ?? ""}|${result.release_year ?? ""}`;
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    merged.push(result);
  }
  if (merged.length === 0) throw new Error("No se encontraron libros para esa búsqueda");
  return merged;
}

async function searchGoogleBooksResults(query: string): Promise<NormalizedResult[]> {
  const key = process.env["GOOGLE_BOOKS_API_KEY"];
  const cleaned = query.replace(/[\s-]/g, "");
  const barcode = isBarcode(query);
  const q = barcode ? `isbn:${cleaned}` : query;

  let items = await fetchGoogleBooks(q, key, barcode ? undefined : "es");
  // Fallback sin langRestrict si la búsqueda en español devuelve pocos resultados.
  if (items.length < 5) {
    const global = await fetchGoogleBooks(q, key);
    const seen = new Set(items.map((item) => item.id));
    for (const volume of global) if (!seen.has(volume.id)) items.push(volume);
  }
  if (!barcode) {
    // Segunda pasada por título exacto: trae otras ediciones físicas del mismo libro.
    try {
      const extra = await fetchGoogleBooks(`intitle:"${query}"`, key);
      const seen = new Set(items.map((item) => item.id));
      for (const volume of extra) if (!seen.has(volume.id)) items.push(volume);
    } catch {
      /* la primera pasada ya basta */
    }
  }

  return items.map((volume) => {
    const info = volume.volumeInfo ?? {};
    const links = info.imageLinks ?? {};
    const title = [info.title, info.subtitle].filter(Boolean).join(": ") || "Sin título";
    const cover =
      cleanBookCover(
        links["extraLarge"] ?? links["large"] ?? links["medium"] ?? links["thumbnail"] ?? links["smallThumbnail"],
      ) ?? coverFallback(title);
    const identifiers = info.industryIdentifiers ?? [];
    const isbn =
      identifiers.find((entry) => entry.type === "ISBN_13")?.identifier ??
      identifiers.find((entry) => entry.type === "ISBN_10")?.identifier ??
      null;
    return {
      external_id: volume.id,
      title,
      creator: info.authors?.join(", ") ?? null,
      release_year: year(info.publishedDate),
      cover_url: cover,
      summary: info.description ?? null,
      media_type: "book" as const,
      platform: info.publisher ?? null,
      publisher: info.publisher ?? null,
      isbn,
      edition: bookEdition(info),
      sources: ["Google Books"],
      alt_covers: [],
    };
  });

}


interface TmdbMovie {
  id: number;
  title?: string;
  original_title?: string;
  release_date?: string;
  overview?: string;
  poster_path?: string | null;
}

async function searchMovies(query: string): Promise<NormalizedResult[]> {
  const key = process.env["TMDB_API_KEY"];
  if (!key) throw new Error("Falta la clave TMDB_API_KEY en el backend");
  const isV4Token = key.split(".").length === 3;
  const headers = isV4Token ? { Authorization: `Bearer ${key}` } : {};

  const fetchPage = async (language: string): Promise<TmdbMovie[]> => {
    const url = new URL("https://api.themoviedb.org/3/search/movie");
    url.searchParams.set("query", query);
    url.searchParams.set("language", language);
    url.searchParams.set("include_adult", "false");
    url.searchParams.set("page", "1");
    if (!isV4Token) url.searchParams.set("api_key", key);
    const res = await fetchSafe(url, { headers });
    if (!res.ok) throw new Error("TMDB no respondió correctamente");
    const json = (await res.json()) as { results?: TmdbMovie[] };
    return json.results ?? [];
  };

  let movies = await fetchPage("es-ES");
  if (movies.length === 0) movies = await fetchPage("en-US");

  return Promise.all(
    movies.slice(0, 20).map(async (movie) => {
      let director: string | null = null;
      try {
        const creditsUrl = new URL(`https://api.themoviedb.org/3/movie/${movie.id}/credits`);
        if (!isV4Token) creditsUrl.searchParams.set("api_key", key);
        const creditsRes = await fetchSafe(creditsUrl, { headers });
        if (creditsRes.ok) {
          const credits = (await creditsRes.json()) as { crew?: { job?: string; name?: string }[] };
          director = credits.crew?.find((member) => member.job === "Director")?.name ?? null;
        }
      } catch {
        director = null;
      }
      const title = movie.title || movie.original_title || "Sin título";
      return {
        external_id: `tmdb-${movie.id}`,
        title,
        creator: director,
        release_year: year(movie.release_date),
        // Solo póster vertical: nunca backdrop_path.
        cover_url: movie.poster_path
          ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
          : coverFallback(title),
        summary: movie.overview || null,
        media_type: "movie" as const,
        platform: null,
        publisher: null,
        isbn: null,
        edition: null,
        sources: ["TMDB"],
        alt_covers: [],
      };
    }),
  );
}

/** IDs de plataforma de TheGamesDB → etiquetas físicas de la app. */
const TGDB_PLATFORMS: Record<number, string> = {
  3: "SNES",
  4: "Nintendo 64",
  6: "NES",
  7: "PS1",
  8: "PS2",
  9: "PS3",
  10: "Nintendo Switch",
  11: "Xbox",
  14: "Xbox 360",
  16: "Dreamcast",
  18: "Mega Drive",
  20: "GameCube",
  21: "Game Boy",
  22: "Game Boy Advance",
  23: "Saturn",
  24: "Nintendo DS",
  4912: "Nintendo 3DS",
  4919: "PS4",
  4920: "Xbox One",
  4971: "Nintendo Switch",
  4980: "PS Vita",
  4981: "PS5",
  4912000: "PC",
  1: "PC",
  9999: "Xbox Series",
  4982: "Xbox Series",
  38: "Wii U",
  9998: "Wii",
};

function tgdbPlatformLabel(id: number | undefined, fallbackName?: string | null): string | null {
  if (id && TGDB_PLATFORMS[id]) return TGDB_PLATFORMS[id]!;
  if (fallbackName) return fallbackName;
  return id ? `Plataforma ${id}` : null;
}

interface TgdbBoxart {
  id?: number;
  type?: string;
  side?: string;
  filename?: string;
}

interface TgdbGame {
  id: number;
  game_title?: string;
  platform?: number;
  release_date?: string;
  overview?: string;
  developers?: number[];
  publishers?: number[];
}

/** TheGamesDB: carátula frontal oficial de la caja física por plataforma. */
async function searchGames(query: string): Promise<NormalizedResult[]> {
  const key = process.env["THEGAMESDB_API_KEY"];
  if (!key) throw new Error("Falta la clave THEGAMESDB_API_KEY en el backend");

  const url = `https://api.thegamesdb.net/v1/Games/ByGameName?apikey=${encodeURIComponent(
    key,
  )}&name=${encodeURIComponent(query)}&fields=overview,genres&include=boxart`;

  const res = await fetchSafe(url);
  if (!res.ok) throw new Error("TheGamesDB no respondió correctamente");
  const json = (await res.json()) as {
    data?: { games?: TgdbGame[] };
    include?: {
      boxart?: {
        base_url?: Record<string, string>;
        data?: Record<string, TgdbBoxart[]>;
      };
      platform?: { data?: Record<string, { name?: string }> };
    };
  };

  const games = json.data?.games ?? [];
  const boxartData = json.include?.boxart?.data ?? {};
  const baseUrls = json.include?.boxart?.base_url ?? {};
  const base = baseUrls["large"] ?? baseUrls["medium"] ?? baseUrls["original"] ?? "";
  const platformNames = json.include?.platform?.data ?? {};

  return games.slice(0, 40).map((game) => {
    const title = game.game_title || "Sin título";
    const images = boxartData[String(game.id)] ?? [];
    const front = images.find((image) => image.side === "front") ?? images[0];
    const cover = front?.filename && base ? `${base}${front.filename}` : coverFallback(title);
    const platform = tgdbPlatformLabel(
      game.platform,
      platformNames[String(game.platform)]?.name ?? null,
    );

    return {
      external_id: `tgdb-${game.id}`,
      title,
      creator: null,
      release_year: year(game.release_date),
      cover_url: cover,
      summary: game.overview || null,
      media_type: "game" as const,
      platform,
      publisher: null,
      isbn: null,
      edition: platform,
      sources: ["TheGamesDB"],
      alt_covers: [],
    };
  });
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

