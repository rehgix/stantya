import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { Landing } from "@/components/Landing";
import { AppNav } from "@/components/AppNav";
import { GameCard } from "@/components/GameCard";
import { AddGameDialog } from "@/components/AddGameDialog";
import { Button } from "@/components/ui/button";
import { ESTADOS, type EstadoJuego, type Juego } from "@/lib/games";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stantya — El diario personal de tu vida gamer" },
      {
        name: "description",
        content:
          "Rastrea tu colección de videojuegos, escribe notas y recuerdos sobre cada juego que juegas y sigue la actividad de otros jugadores.",
      },
      { property: "og:title", content: "Stantya — El diario personal de tu vida gamer" },
      {
        property: "og:description",
        content: "Tu colección de videojuegos, tus recuerdos y la actividad de la comunidad, en un solo sitio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Biblioteca,
});

type Filtro = "todos" | EstadoJuego;

function Biblioteca() {
  const { user, loading } = useSession();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [adding, setAdding] = useState(false);

  const { data: juegos = [], refetch } = useQuery({
    queryKey: ["mis-juegos", user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<Juego[]> => {
      const { data, error } = await supabase
        .from("juegos")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Juego[];
    },
  });

  const visibles = useMemo(
    () => (filtro === "todos" ? juegos : juegos.filter((juego) => juego.estado === filtro)),
    [juegos, filtro],
  );

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Cargando…</div>;
  }

  if (!user) return <Landing />;

  return (
    <div className="min-h-screen">
      <AppNav userId={user.id} />

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Mi biblioteca</h1>
            <p className="text-sm text-muted-foreground">
              {juegos.length} {juegos.length === 1 ? "juego" : "juegos"} en tu diario gamer
            </p>
          </div>
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="mr-1 h-4 w-4" /> Añadir juego
          </Button>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {(["todos", ...ESTADOS.map((estado) => estado.value)] as Filtro[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFiltro(value)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                filtro === value
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {value === "todos"
                ? "Todos"
                : ESTADOS.find((estado) => estado.value === value)!.label}
            </button>
          ))}
        </div>

        {visibles.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
            Aún no hay juegos aquí. Añade el primero y empieza a escribir tu diario.
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {visibles.map((juego) => (
              <GameCard key={juego.id} juego={juego} />
            ))}
          </div>
        )}
      </main>

      <AddGameDialog
        open={adding}
        onOpenChange={setAdding}
        userId={user.id}
        onSaved={() => void refetch()}
      />
    </div>
  );
}
