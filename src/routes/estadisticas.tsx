import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { AppNav } from "@/components/AppNav";
import { Landing } from "@/components/Landing";
import { ESTADOS, type Juego } from "@/lib/games";

export const Route = createFileRoute("/estadisticas")({
  head: () => ({
    meta: [
      { title: "Estadísticas — Stantya" },
      {
        name: "description",
        content: "Un resumen de tu actividad gamer: juegos, horas jugadas y géneros favoritos.",
      },
    ],
  }),
  component: EstadisticasPage,
});

function EstadisticasPage() {
  const { user, loading } = useSession();

  const { data: juegos = [], isLoading } = useQuery({
    queryKey: ["mis-juegos-stats", user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<Juego[]> => {
      const { data, error } = await supabase.from("juegos").select("*").eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []) as Juego[];
    },
  });

  const stats = useMemo(() => {
    const total = juegos.length;
    const completados = juegos.filter((juego) => juego.estado === "completado").length;
    const horasTotales = juegos.reduce((suma, juego) => suma + (juego.horas_jugadas ?? 0), 0);

    const porEstado: Record<string, number> = {};
    for (const opcion of ESTADOS) porEstado[opcion.value] = 0;
    for (const juego of juegos) porEstado[juego.estado] = (porEstado[juego.estado] ?? 0) + 1;

    const generoCount = new Map<string, number>();
    for (const juego of juegos) {
      if (!juego.genero) continue;
      generoCount.set(juego.genero, (generoCount.get(juego.genero) ?? 0) + 1);
    }
    const topGeneros = [...generoCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

    return { total, completados, horasTotales, porEstado, topGeneros };
  }, [juegos]);

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Cargando…</div>;
  }
  if (!user) return <Landing />;

  const porcentajeCompletados = stats.total > 0 ? Math.round((stats.completados / stats.total) * 100) : 0;
  const maxEstado = Math.max(1, ...Object.values(stats.porEstado));

  return (
    <div className="min-h-screen">
      <AppNav userId={user.id} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-xl font-semibold">Estadísticas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Un resumen de tu vida gamer.</p>

        {isLoading ? (
          <p className="mt-6 text-sm text-muted-foreground">Cargando estadísticas…</p>
        ) : stats.total === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Añade juegos a tu biblioteca para ver tus estadísticas.
          </p>
        ) : (
          <>
            <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border/70 bg-card p-4">
                <p className="text-2xl font-semibold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Juegos en total</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-card p-4">
                <p className="text-2xl font-semibold">
                  {stats.completados} <span className="text-sm text-muted-foreground">({porcentajeCompletados}%)</span>
                </p>
                <p className="text-xs text-muted-foreground">Completados</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-card p-4">
                <p className="text-2xl font-semibold">{stats.horasTotales}</p>
                <p className="text-xs text-muted-foreground">Horas jugadas</p>
              </div>
            </section>

            <section className="mt-8">
              <h2 className="text-base font-semibold">Por estado</h2>
              <div className="mt-3 space-y-2">
                {ESTADOS.map((opcion) => {
                  const valor = stats.porEstado[opcion.value] ?? 0;
                  const ancho = Math.round((valor / maxEstado) * 100);
                  return (
                    <div key={opcion.value} className="flex items-center gap-3 text-sm">
                      <span className="w-24 shrink-0 text-muted-foreground">{opcion.label}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${ancho}%` }} />
                      </div>
                      <span className="w-6 shrink-0 text-right text-muted-foreground">{valor}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            {stats.topGeneros.length > 0 ? (
              <section className="mt-8">
                <h2 className="text-base font-semibold">Géneros más jugados</h2>
                <ul className="mt-3 space-y-1.5">
                  {stats.topGeneros.map(([genero, count]) => (
                    <li
                      key={genero}
                      className="flex items-center justify-between rounded-xl border border-border/70 bg-card px-4 py-2 text-sm"
                    >
                      <span>{genero}</span>
                      <span className="text-muted-foreground">
                        {count} {count === 1 ? "juego" : "juegos"}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
