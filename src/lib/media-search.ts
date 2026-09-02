import type { MediaType } from "./collection";

export interface SearchResult {
  externalId: string | null;
  mediaType: MediaType;
  title: string;
  creator: string | null;
  releaseYear: number | null;
  coverUrl: string | null;
  platform: string | null;
  synopsis: string | null;
}

interface GoogleBooksVolume {
  id: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publishedDate?: string;
    description?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string; large?: string };
  };
}

const ISBN_RE = /^(97(8|9))?\d{9}(\d|X)$/i;

export function looksLikeBarcode(value: string): boolean {
  const cleaned = value.replace(/[\s-]/g, "");
  return ISBN_RE.test(cleaned) || /^\d{12,13}$/.test(cleaned);
}

function hiRes(url?: string | null): string | null {
  if (!url) return null;
  return url
    .replace("http://", "https://")
    .replace("&edge=curl", "")
    .replace(/zoom=\d/, "zoom=3");
}

function mapVolume(volume: GoogleBooksVolume): SearchResult {
  const info = volume.volumeInfo ?? {};
  const year = info.publishedDate ? Number(info.publishedDate.slice(0, 4)) : null;
  return {
    externalId: volume.id,
    mediaType: "book",
    title: [info.title, info.subtitle].filter(Boolean).join(": ") || "Sin título",
    creator: info.authors?.join(", ") ?? null,
    releaseYear: Number.isFinite(year) ? year : null,
    coverUrl: hiRes(info.imageLinks?.large ?? info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail),
    platform: null,
    synopsis: info.description ?? null,
  };
}

/** Busca libros en la API pública gratuita de Google Books por título o ISBN. */
export async function searchBooks(query: string): Promise<SearchResult[]> {
  const term = query.trim();
  if (term.length < 3) return [];
  const cleaned = term.replace(/[\s-]/g, "");
  const q = looksLikeBarcode(term) ? `isbn:${cleaned}` : term;

  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=12&printType=books`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("No se pudo consultar Google Books");
  const json = (await res.json()) as { items?: GoogleBooksVolume[] };
  return (json.items ?? []).map(mapVolume);
}

/** Catálogo local de referencia para simular la búsqueda de videojuegos. */
const GAME_CATALOG: Omit<SearchResult, "mediaType">[] = [
  {
    externalId: "g-botw",
    title: "The Legend of Zelda: Breath of the Wild",
    creator: "Nintendo EPD",
    releaseYear: 2017,
    coverUrl: null,
    platform: "Nintendo Switch",
    synopsis: "Link despierta tras cien años para explorar un Hyrule abierto y derrotar al Cataclismo Ganon.",
  },
  {
    externalId: "g-tlou2",
    title: "The Last of Us Parte II",
    creator: "Naughty Dog",
    releaseYear: 2020,
    coverUrl: null,
    platform: "PS4",
    synopsis: "Ellie emprende un viaje de venganza por un Estados Unidos devastado por la infección.",
  },
  {
    externalId: "g-elden",
    title: "Elden Ring",
    creator: "FromSoftware",
    releaseYear: 2022,
    coverUrl: null,
    platform: "PS5",
    synopsis: "Un acción-RPG de mundo abierto en las Tierras Intermedias, creado junto a George R. R. Martin.",
  },
  {
    externalId: "g-mgs",
    title: "Metal Gear Solid",
    creator: "Konami",
    releaseYear: 1998,
    coverUrl: null,
    platform: "PS1",
    synopsis: "Solid Snake se infiltra en Shadow Moses para detener una amenaza nuclear.",
  },
  {
    externalId: "g-hollow",
    title: "Hollow Knight",
    creator: "Team Cherry",
    releaseYear: 2017,
    coverUrl: null,
    platform: "PC",
    synopsis: "Un metroidvania oscuro por los túneles del reino insecto de Hallownest.",
  },
  {
    externalId: "g-mario64",
    title: "Super Mario 64",
    creator: "Nintendo EAD",
    releaseYear: 1996,
    coverUrl: null,
    platform: "Nintendo 64",
    synopsis: "El salto de Mario a las tres dimensiones dentro de los cuadros del castillo de Peach.",
  },
  {
    externalId: "g-halo",
    title: "Halo: Combat Evolved",
    creator: "Bungie",
    releaseYear: 2001,
    coverUrl: null,
    platform: "Xbox 360",
    synopsis: "El Jefe Maestro despierta sobre un anillo alienígena y se enfrenta al Covenant.",
  },
  {
    externalId: "g-re4",
    title: "Resident Evil 4",
    creator: "Capcom",
    releaseYear: 2005,
    coverUrl: null,
    platform: "PS2",
    synopsis: "Leon S. Kennedy busca a la hija del presidente en una aldea rural infectada.",
  },
];

/** Catálogo local de referencia para simular la búsqueda de películas. */
const MOVIE_CATALOG: Omit<SearchResult, "mediaType">[] = [
  {
    externalId: "m-blade",
    title: "Blade Runner",
    creator: "Ridley Scott",
    releaseYear: 1982,
    coverUrl: null,
    platform: "4K UHD",
    synopsis: "Un cazador de replicantes persigue a cuatro androides fugados en un Los Ángeles lluvioso.",
  },
  {
    externalId: "m-parasite",
    title: "Parásitos",
    creator: "Bong Joon-ho",
    releaseYear: 2019,
    coverUrl: null,
    platform: "Blu-ray",
    synopsis: "Una familia humilde se infiltra poco a poco en el hogar de una familia adinerada.",
  },
  {
    externalId: "m-espiritu",
    title: "El viaje de Chihiro",
    creator: "Hayao Miyazaki",
    releaseYear: 2001,
    coverUrl: null,
    platform: "Blu-ray",
    synopsis: "Chihiro queda atrapada en un mundo de espíritus y debe trabajar para liberar a sus padres.",
  },
  {
    externalId: "m-padrino",
    title: "El Padrino",
    creator: "Francis Ford Coppola",
    releaseYear: 1972,
    coverUrl: null,
    platform: "4K UHD",
    synopsis: "La crónica de la familia Corleone y la sucesión al frente de su imperio criminal.",
  },
  {
    externalId: "m-mad",
    title: "Mad Max: Furia en la carretera",
    creator: "George Miller",
    releaseYear: 2015,
    coverUrl: null,
    platform: "4K UHD",
    synopsis: "Furiosa y Max huyen por el desierto perseguidos por el ejército de Immortan Joe.",
  },
  {
    externalId: "m-alien",
    title: "Alien: el octavo pasajero",
    creator: "Ridley Scott",
    releaseYear: 1979,
    coverUrl: null,
    platform: "Blu-ray",
    synopsis: "La tripulación del Nostromo descubre a bordo un organismo perfecto y letal.",
  },
];

function localSearch(
  catalog: Omit<SearchResult, "mediaType">[],
  mediaType: MediaType,
  query: string,
): SearchResult[] {
  const term = query.trim().toLowerCase();
  if (term.length < 2) return [];
  return catalog
    .filter(
      (entry) =>
        entry.title.toLowerCase().includes(term) ||
        (entry.creator ?? "").toLowerCase().includes(term) ||
        (entry.platform ?? "").toLowerCase().includes(term),
    )
    .map((entry) => ({ ...entry, mediaType }));
}

/** Búsqueda simulada de videojuegos por título, estudio o plataforma. */
export async function searchGames(query: string): Promise<SearchResult[]> {
  return localSearch(GAME_CATALOG, "game", query);
}

/** Búsqueda simulada de películas por título o director. */
export async function searchMovies(query: string): Promise<SearchResult[]> {
  return localSearch(MOVIE_CATALOG, "movie", query);
}

export function searchMedia(mediaType: MediaType, query: string): Promise<SearchResult[]> {
  if (mediaType === "book") return searchBooks(query);
  if (mediaType === "game") return searchGames(query);
  return searchMovies(query);
}
