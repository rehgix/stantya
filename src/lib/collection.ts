export type MediaType = "book" | "game" | "movie";
export type Status = "completado" | "en_progreso" | "pendiente" | "deseo";

export const MEDIA_LABEL: Record<MediaType, string> = {
  book: "Libro",
  game: "Videojuego",
  movie: "Película",
};

export const CREATOR_LABEL: Record<MediaType, string> = {
  book: "Autor",
  game: "Desarrollador",
  movie: "Director",
};

export const STATUSES: { value: Status; label: string; short: string }[] = [
  { value: "completado", label: "Completado / Terminado", short: "Completado" },
  { value: "en_progreso", label: "En progreso", short: "En progreso" },
  { value: "pendiente", label: "Pendiente (Backlog)", short: "Pendiente" },
  { value: "deseo", label: "Lista de deseos", short: "Deseo" },
];

export const STATUS_LABEL: Record<Status, string> = {
  completado: "Completado",
  en_progreso: "En progreso",
  pendiente: "Pendiente",
  deseo: "Lista de deseos",
};

export const FORMATS: Record<MediaType, string[]> = {
  book: ["Tapa dura", "Tapa blanda", "Bolsillo", "Ilustrado", "Cómic / Novela gráfica"],
  game: [
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
  ],
  movie: ["4K UHD", "Blu-ray", "DVD", "VHS", "Steelbook", "LaserDisc"],
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
  synopsis: string | null;
}

export interface InventoryRow {
  id: string;
  item_id: string;
  format: string | null;
  status: Status;
  rating: number | null;
  notes: string | null;
  items: ItemRow | null;
}
