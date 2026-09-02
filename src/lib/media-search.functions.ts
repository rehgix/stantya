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
  if (lang) url.searchParams.set("langRestrict", lang);
  if (key) url.searchParams.set("key", key);

  const res = await fetch(url);
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

async function searchBooks(query: string): Promise<NormalizedResult[]> {
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
    const res = await fetch(url, { headers });
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
        const creditsRes = await fetch(creditsUrl, { headers });
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
      };
    }),
  );
}

/** Normaliza el nombre de plataforma de RAWG a las etiquetas físicas de la app. */
const PLATFORM_ALIASES: [RegExp, string][] = [
  [/playstation 5/i, "PS5"],
  [/playstation 4/i, "PS4"],
  [/playstation 3/i, "PS3"],
  [/playstation 2/i, "PS2"],
  [/playstation$|playstation 1|psx/i, "PS1"],
  [/psp|playstation vita/i, "PS Vita"],
  [/nintendo switch/i, "Nintendo Switch"],
  [/wii u/i, "Wii U"],
  [/^wii/i, "Wii"],
  [/gamecube/i, "GameCube"],
  [/nintendo 64/i, "Nintendo 64"],
  [/nintendo 3ds/i, "Nintendo 3DS"],
  [/nintendo ds/i, "Nintendo DS"],
  [/snes|super nintendo/i, "SNES"],
  [/game boy/i, "Game Boy"],
  [/nes|nintendo entertainment/i, "NES"],
  [/xbox series/i, "Xbox Series"],
  [/xbox one/i, "Xbox One"],
  [/xbox 360/i, "Xbox 360"],
  [/^xbox$/i, "Xbox"],
  [/genesis|mega drive/i, "Mega Drive"],
  [/dreamcast/i, "Dreamcast"],
  [/saturn/i, "Saturn"],
  [/pc|windows|linux|macos/i, "PC"],
];

function canonicalPlatform(name: string): string | null {
  for (const [pattern, label] of PLATFORM_ALIASES) if (pattern.test(name)) return label;
  return null;
}

/** Recorta la imagen de RAWG a una proporción cercana a una carátula frontal. */
function gameBoxArt(raw: string | null | undefined, title: string): string {
  if (!raw) return coverFallback(title);
  const url = raw.replace(/^http:\/\//, "https://");
  return url.replace("/media/games/", "/media/crop/600/400/games/");
}

async function searchGames(query: string): Promise<NormalizedResult[]> {
  const key = process.env["RAWG_API_KEY"];
  if (!key) throw new Error("Falta la clave RAWG_API_KEY en el backend");

  const url = new URL("https://api.rawg.io/api/games");
  url.searchParams.set("key", key);
  url.searchParams.set("search", query);
  url.searchParams.set("search_precise", "false");
  url.searchParams.set("page_size", "25");
  url.searchParams.set("ordering", "-added");

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

  const results: NormalizedResult[] = [];
  for (const game of json.results ?? []) {
    const title = game.name || "Sin título";
    const cover = gameBoxArt(game.background_image, title);
    const base = {
      title,
      creator: game.developers?.[0]?.name ?? game.publishers?.[0]?.name ?? null,
      release_year: year(game.released),
      cover_url: cover,
      summary: null,
      media_type: "game" as const,
      publisher: game.publishers?.[0]?.name ?? null,
      isbn: null,
    };

    // Una entrada por edición física de consola, para elegir la versión concreta.
    const platforms: string[] = [];
    for (const entry of game.platforms ?? []) {
      const label = canonicalPlatform(entry.platform?.name ?? "");
      if (label && !platforms.includes(label)) platforms.push(label);
    }

    if (platforms.length === 0) {
      results.push({ ...base, external_id: `rawg-${game.id}`, platform: null, edition: null });
      continue;
    }
    for (const platform of platforms.slice(0, 6)) {
      results.push({
        ...base,
        external_id: `rawg-${game.id}-${platform.toLowerCase().replace(/\s+/g, "-")}`,
        platform,
        edition: platform,
      });
    }
  }
  return results.slice(0, 60);
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

