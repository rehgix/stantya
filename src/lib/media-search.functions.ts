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
  /** Idioma detectado de la edición ("es", "en", …) */
  language?: string | null;
  /** La carátula no supera los filtros de calidad/idioma y conviene revisarla */
  needs_fallback?: boolean;
  /** La carátula disponible es la edición internacional (normalmente en inglés) */
  international?: boolean;
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
  language?: string[];
  number_of_pages_median?: number;
}

function mapOpenLibraryDoc(doc: OpenLibraryDoc, index: number): NormalizedResult {
  const title = doc.title || "Sin título";
  const pages = doc.number_of_pages_median ?? 0;
  const languages = doc.language ?? [];
  const spanish = languages.some((code) => code === "spa" || code === "es");
  const cover = doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null;
  return {
    external_id: doc.key ?? `ol-${index}-${title}`,
    title,
    creator: doc.author_name?.[0] ?? "Desconocido",
    release_year: doc.first_publish_year ?? null,
    cover_url: cover ?? coverFallback(title),
    summary: null,
    media_type: "book" as const,
    platform: doc.publisher?.[0] ?? null,
    publisher: doc.publisher?.[0] ?? null,
    isbn: doc.isbn?.[0] ?? null,
    edition: pages > 0 && pages < 200 ? "Bolsillo" : pages >= 500 ? "Tapa dura" : "Tapa blanda",
    sources: ["OpenLib"],
    alt_covers: [],
    language: spanish ? "es" : (languages[0] ?? null),
    international: languages.length > 0 && !spanish,
    needs_fallback: !cover,
  };
}

async function fetchOpenLibrary(params: string): Promise<OpenLibraryDoc[]> {
  const res = await fetchSafe(`https://openlibrary.org/search.json?${params}`);
  if (!res.ok) throw new Error("Open Library no respondió correctamente");
  const json = (await res.json()) as { docs?: OpenLibraryDoc[] };
  return json.docs ?? [];
}

/** Open Library: ediciones físicas, priorizando las publicadas en español. */
async function searchOpenLibrary(query: string): Promise<NormalizedResult[]> {
  const cleaned = query.replace(/[\s-]/g, "");
  const barcode = isBarcode(query);
  const fields = "fields=key,title,author_name,publisher,first_publish_year,cover_i,isbn,language,number_of_pages_median";

  if (barcode) {
    // Búsqueda por ISBN: edición física exacta con su editorial.
    const docs = await fetchOpenLibrary(`q=${encodeURIComponent(`isbn:${cleaned}`)}&limit=25&${fields}`);
    return docs.map(mapOpenLibraryDoc);
  }

  const [spanish, global] = await Promise.all([
    fetchOpenLibrary(`q=${encodeURIComponent(query)}&language=spa&limit=25&${fields}`).catch(() => []),
    fetchOpenLibrary(`q=${encodeURIComponent(query)}&limit=25&${fields}`).catch(() => []),
  ]);

  const seen = new Set(spanish.map((doc) => doc.key));
  const docs = [...spanish, ...global.filter((doc) => !seen.has(doc.key))];
  if (docs.length === 0) throw new Error("Open Library no devolvió resultados");
  return docs.map(mapOpenLibraryDoc);
}


/** Resolución aproximada de una portada, para quedarnos con la mejor de cada fuente. */
function coverScore(url: string | null): number {
  if (isFallbackCover(url)) return 0;
  const value = url!;
  if (value.includes("covers.openlibrary.org") && value.includes("-L.jpg")) return 40;
  if (/zoom=3/.test(value)) return 30;
  if (value.includes("books.google")) return 20;
  return 25;
}

/** Fusiona dos fichas de la misma edición conservando lo mejor de cada fuente. */
function mergeResults(base: NormalizedResult, extra: NormalizedResult): NormalizedResult {
  const covers = new Set([...base.alt_covers, ...extra.alt_covers]);
  const better = coverScore(extra.cover_url) > coverScore(base.cover_url) ? extra : base;
  const worse = better === base ? extra : base;
  if (!isFallbackCover(worse.cover_url)) covers.add(worse.cover_url!);
  covers.delete(better.cover_url ?? "");

  const longest = (a: string | null, b: string | null) =>
    (b?.length ?? 0) > (a?.length ?? 0) ? b : a;

  return {
    ...base,
    cover_url: better.cover_url,
    creator: base.creator && base.creator !== "Desconocido" ? base.creator : extra.creator,
    release_year: base.release_year ?? extra.release_year,
    summary: longest(base.summary, extra.summary),
    publisher: longest(base.publisher, extra.publisher),
    platform: base.platform ?? extra.platform,
    isbn: base.isbn ?? extra.isbn,
    edition: base.edition ?? extra.edition,
    sources: [...new Set([...base.sources, ...extra.sources])],
    alt_covers: [...covers],
  };
}

/** Agrega varias fuentes desduplicando por huella y fusionando las coincidencias. */
function aggregate(
  groups: NormalizedResult[][],
  fingerprint: (result: NormalizedResult) => string,
): NormalizedResult[] {
  const byKey = new Map<string, NormalizedResult>();
  const order: string[] = [];
  for (const group of groups) {
    for (const result of group) {
      const key = fingerprint(result);
      const existing = byKey.get(key);
      if (existing) byKey.set(key, mergeResults(existing, result));
      else {
        byKey.set(key, result);
        order.push(key);
      }
    }
  }
  return order.map((key) => byKey.get(key)!);
}

/** Libros: Open Library (ediciones físicas) + Google Books, en paralelo y tolerante a fallos. */
async function searchBooks(query: string): Promise<NormalizedResult[]> {
  const [openLibrary, google] = await Promise.all([
    searchOpenLibrary(query).catch(() => [] as NormalizedResult[]),
    searchGoogleBooksResults(query).catch(() => [] as NormalizedResult[]),
  ]);
  const merged = aggregate([openLibrary, google], (result) =>
    result.isbn
      ? `isbn:${result.isbn.replace(/[\s-]/g, "")}`
      : `${result.title.toLowerCase().trim()}|${result.publisher?.toLowerCase() ?? ""}|${result.release_year ?? ""}`,
  );
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
    const lang = (info as { language?: string }).language ?? null;
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
      language: lang,
      international: lang !== null && lang !== "es",
      needs_fallback: isFallbackCover(cover),
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

  /** Pósteres verticales del título, priorizando los españoles (include_image_language=es,null). */
  const fetchPosters = async (id: number): Promise<{ es: string[]; other: string[] }> => {
    const out = { es: [] as string[], other: [] as string[] };
    try {
      const url = new URL(`https://api.themoviedb.org/3/movie/${id}/images`);
      url.searchParams.set("include_image_language", "es,null");
      if (!isV4Token) url.searchParams.set("api_key", key);
      const res = await fetchSafe(url, { headers });
      if (!res.ok) return out;
      const json = (await res.json()) as {
        posters?: { file_path?: string; iso_639_1?: string | null; width?: number; height?: number }[];
      };
      for (const poster of json.posters ?? []) {
        if (!poster.file_path) continue;
        // Filtro de ratio físico: solo carátulas verticales de estuche.
        if (!isPhysicalRatio(poster.width, poster.height)) continue;
        const full = `https://image.tmdb.org/t/p/w500${poster.file_path}`;
        if (poster.iso_639_1 === "es") out.es.push(full);
        else out.other.push(full);
      }
    } catch {
      /* sin imágenes extra: se usa poster_path */
    }
    return out;
  };

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
      const posters = await fetchPosters(movie.id);
      const base = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null;
      // Solo póster vertical: nunca backdrop_path.
      const cover = posters.es[0] ?? base ?? posters.other[0] ?? coverFallback(title);
      const alternatives = [...posters.es, ...posters.other, ...(base ? [base] : [])]
        .filter((url) => url !== cover)
        .slice(0, 8);
      return {
        external_id: `tmdb-${movie.id}`,
        title,
        creator: director,
        release_year: year(movie.release_date),
        cover_url: cover,
        summary: movie.overview || null,
        media_type: "movie" as const,
        platform: null,
        publisher: null,
        isbn: null,
        edition: null,
        sources: ["TMDB"],
        alt_covers: [...new Set(alternatives)],
        language: posters.es.length > 0 ? "es" : "en",
        international: posters.es.length === 0,
        needs_fallback: isFallbackCover(cover),
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
async function searchTheGamesDb(query: string): Promise<NormalizedResult[]> {
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


interface RawgGame {
  id: number;
  name?: string;
  released?: string | null;
  background_image?: string | null;
  platforms?: { platform?: { name?: string } }[];
}

/** RAWG: respaldo para sinopsis, años y arte promocional cuando falta la caja física. */
async function searchRawg(query: string): Promise<NormalizedResult[]> {
  const key = process.env["RAWG_API_KEY"];
  if (!key) return [];
  const url = new URL("https://api.rawg.io/api/games");
  url.searchParams.set("key", key);
  url.searchParams.set("search", query);
  url.searchParams.set("page_size", "25");
  url.searchParams.set("search_precise", "false");
  url.searchParams.set("ordering", "-added");

  const res = await fetchSafe(url);
  if (!res.ok) throw new Error("RAWG no respondió correctamente");
  const json = (await res.json()) as { results?: RawgGame[] };

  return (json.results ?? []).map((game) => {
    const title = game.name || "Sin título";
    const platform = game.platforms?.[0]?.platform?.name ?? null;
    return {
      external_id: `rawg-${game.id}`,
      title,
      creator: null,
      release_year: year(game.released),
      cover_url: game.background_image ?? coverFallback(title),
      summary: null,
      media_type: "game" as const,
      platform,
      publisher: null,
      isbn: null,
      edition: platform,
      sources: ["RAWG"],
      alt_covers: [],
    };
  });
}

/** Videojuegos: TheGamesDB (box art físico, prioritario) + RAWG (respaldo), en paralelo. */
async function searchGames(query: string): Promise<NormalizedResult[]> {
  const [tgdb, rawg] = await Promise.all([
    searchTheGamesDb(query).catch(() => [] as NormalizedResult[]),
    searchRawg(query).catch(() => [] as NormalizedResult[]),
  ]);

  // Arte de RAWG indexado por título: sirve de respaldo y de carátula alternativa.
  const rawgByTitle = new Map<string, NormalizedResult>();
  for (const game of rawg) {
    const key = game.title.toLowerCase().trim();
    if (!rawgByTitle.has(key)) rawgByTitle.set(key, game);
  }

  const enriched = tgdb.map((game) => {
    const match = rawgByTitle.get(game.title.toLowerCase().trim());
    if (!match) return game;
    const alt = new Set(game.alt_covers);
    if (!isFallbackCover(match.cover_url)) alt.add(match.cover_url!);
    const coverMissing = isFallbackCover(game.cover_url);
    return {
      ...game,
      // La caja física de TheGamesDB manda; RAWG solo cubre el hueco.
      cover_url: coverMissing ? match.cover_url : game.cover_url,
      alt_covers: coverMissing
        ? game.alt_covers
        : [...alt].filter((url) => url !== game.cover_url),
      summary: game.summary ?? match.summary,
      release_year: game.release_year ?? match.release_year,
      sources: [...new Set([...game.sources, ...match.sources])],
    };
  });

  const tgdbTitles = new Set(tgdb.map((game) => game.title.toLowerCase().trim()));
  const onlyRawg = rawg.filter((game) => !tgdbTitles.has(game.title.toLowerCase().trim()));

  const merged = [...enriched, ...onlyRawg];
  if (merged.length === 0) throw new Error("No se encontraron videojuegos para esa búsqueda");
  return merged;
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

