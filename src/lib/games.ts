export type EstadoJuego = "jugando" | "completado" | "backlog" | "deseado";

export const ESTADOS: { value: EstadoJuego; label: string; className: string }[] = [
  { value: "jugando", label: "Jugando", className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" },
  { value: "completado", label: "Completado", className: "bg-primary/15 text-primary border-primary/40" },
  { value: "backlog", label: "Backlog", className: "bg-amber-500/15 text-amber-300 border-amber-500/40" },
  { value: "deseado", label: "Deseado", className: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40" },
];

export const ESTADO_LABEL: Record<EstadoJuego, string> = {
  jugando: "Jugando",
  completado: "Completado",
  backlog: "Backlog",
  deseado: "Deseado",
};

export const PLATAFORMAS = [
  "PS5",
  "PS4",
  "Nintendo Switch",
  "Switch 2",
  "Xbox Series",
  "Xbox One",
  "PC",
  "Steam Deck",
  "Retro",
];

export interface Juego {
  id: string;
  user_id: string;
  titulo: string;
  portada_url: string | null;
  plataforma: string | null;
  genero: string | null;
  external_id: string | null;
  estado: EstadoJuego;
  horas_jugadas: number | null;
  created_at: string;
}

export interface EntradaDiario {
  id: string;
  juego_id: string;
  user_id: string;
  texto: string;
  valoracion: number | null;
  es_publica: boolean;
  imagen_url: string | null;
  created_at: string;
}

export interface Perfil {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export function fechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
