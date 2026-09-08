import { Link } from "@tanstack/react-router";

import { ESTADOS, type Juego } from "@/lib/games";

export function EstadoBadge({ estado }: { estado: Juego["estado"] }) {
  const item = ESTADOS.find((entry) => entry.value === estado)!;
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${item.className}`}>
      {item.label}
    </span>
  );
}

export function GameCard({ juego }: { juego: Juego }) {
  return (
    <Link to="/juego/$id" params={{ id: juego.id }} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-border/70 bg-muted">
        {juego.portada_url ? (
          <img
            src={juego.portada_url}
            alt={`Portada de ${juego.titulo}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/20 to-background p-3 text-center text-xs font-medium text-muted-foreground">
            {juego.titulo}
          </div>
        )}
        {juego.plataforma ? (
          <span className="absolute inset-x-0 top-0 truncate bg-background/70 px-1 py-0.5 text-center text-[9px] font-bold uppercase tracking-wider backdrop-blur">
            {juego.plataforma}
          </span>
        ) : null}
        <span className="absolute bottom-2 left-2">
          <EstadoBadge estado={juego.estado} />
        </span>
      </div>
      <p className="mt-2 truncate text-sm font-medium">{juego.titulo}</p>
      <p className="truncate text-xs text-muted-foreground">{juego.genero ?? "Sin género"}</p>
    </Link>
  );
}
