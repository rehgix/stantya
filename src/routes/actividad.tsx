import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { AppNav } from "@/components/AppNav";
import { Landing } from "@/components/Landing";
import { fechaCorta, type EntradaDiario, type Juego, type Perfil } from "@/lib/games";

export const Route = createFileRoute("/actividad")({
  head: () => ({
    meta: [
      { title: "Actividad de la comunidad — Stantya" },
      {
        name: "description",
        content:
          "Lo último que han jugado y escrito en su diario las personas a las que sigues en Stantya.",
      },
      { property: "og:title", content: "Actividad gamer — Stantya" },
      { property: "og:description", content: "Sigue los diarios y colecciones de otros jugadores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ActivityPage,
});

interface Evento {
  id: string;
  tipo: "juego" | "entrada";
  userId: string;
  fecha: string;
  titulo: string;
  detalle: string;
  juegoId: string;
}

function ActivityPage() {
  const { user, loading } = useSession();

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ["actividad", user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<{ eventos: Evento[]; perfiles: Record<string, Perfil> }> => {
      const { data: follows } = await supabase
        .from("seguidores")
        .select("seguido_id")
        .eq("seguidor_id", user!.id);
      const ids = (follows ?? []).map((row) => row.seguido_id);
      if (ids.length === 0) return { eventos: [], perfiles: {} };

      const [juegosRes, entradasRes, perfilesRes] = await Promise.all([
        supabase
          .from("juegos")
          .select("*")
          .in("user_id", ids)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("entradas_diario")
          .select("*")
          .in("user_id", ids)
          .eq("es_publica", true)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase.from("perfiles").select("*").in("id", ids),
      ]);

      const juegos = (juegosRes.data ?? []) as Juego[];
      const entradas = (entradasRes.data ?? []) as EntradaDiario[];
      const juegoTitulo = new Map(juegos.map((juego) => [juego.id, juego.titulo]));

      const eventos: Evento[] = [
        ...juegos.map((juego) => ({
          id: `j-${juego.id}`,
          tipo: "juego" as const,
          userId: juego.user_id,
          fecha: juego.created_at,
          titulo: juego.titulo,
          detalle: `añadió este juego a su colección (${juego.estado})`,
          juegoId: juego.id,
        })),
        ...entradas.map((entrada) => ({
          id: `e-${entrada.id}`,
          tipo: "entrada" as const,
          userId: entrada.user_id,
          fecha: entrada.created_at,
          titulo: juegoTitulo.get(entrada.juego_id) ?? "un juego",
          detalle: entrada.texto,
          juegoId: entrada.juego_id,
        })),
      ].sort((a, b) => b.fecha.localeCompare(a.fecha));

      const perfiles: Record<string, Perfil> = {};
      for (const perfil of ((perfilesRes.data ?? []) as Perfil[])) perfiles[perfil.id] = perfil;

      return { eventos, perfiles };
    },
    select: (data) => data.eventos.map((evento) => ({ evento, perfil: data.perfiles[evento.userId] })),
  });

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Cargando…</div>;
  }
  if (!user) return <Landing />;

  return (
    <div className="min-h-screen">
      <AppNav userId={user.id} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-xl font-semibold">Actividad</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lo último de las personas a las que sigues.
        </p>

        {isLoading ? (
          <p className="mt-6 text-sm text-muted-foreground">Cargando actividad…</p>
        ) : eventos.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Todavía no sigues a nadie, o quienes sigues aún no han publicado nada.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {eventos.map(({ evento, perfil }) => (
              <li key={evento.id} className="rounded-xl border border-border/70 bg-card p-4">
                <div className="flex items-center gap-2 text-sm">
                  <Link
                    to="/perfil/$id"
                    params={{ id: evento.userId }}
                    className="font-medium hover:text-primary"
                  >
                    {perfil?.username ?? "Jugador"}
                  </Link>
                  <span className="text-xs text-muted-foreground">{fechaCorta(evento.fecha)}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {evento.tipo === "juego" ? (
                    <>
                      {evento.detalle}:{" "}
                      <Link to="/juego/$id" params={{ id: evento.juegoId }} className="text-foreground">
                        {evento.titulo}
                      </Link>
                    </>
                  ) : (
                    <>
                      escribió en su diario de{" "}
                      <Link to="/juego/$id" params={{ id: evento.juegoId }} className="text-foreground">
                        {evento.titulo}
                      </Link>
                    </>
                  )}
                </p>
                {evento.tipo === "entrada" ? (
                  <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm">{evento.detalle}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
