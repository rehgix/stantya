import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { AppNav } from "@/components/AppNav";
import { GameCard } from "@/components/GameCard";
import { Button } from "@/components/ui/button";
import { fechaCorta, type EntradaDiario, type Juego, type Perfil } from "@/lib/games";

export const Route = createFileRoute("/perfil/$id")({
  head: () => ({
    meta: [
      { title: "Perfil gamer — Stantya" },
      {
        name: "description",
        content: "Colección de juegos y entradas públicas del diario de una persona en Stantya.",
      },
      { property: "og:title", content: "Perfil gamer — Stantya" },
      { property: "og:description", content: "Descubre su colección y sus recuerdos gamer." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { id } = Route.useParams();
  const { user, loading } = useSession();
  const esMio = user?.id === id;

  const { data: perfil } = useQuery({
    queryKey: ["perfil", id],
    queryFn: async (): Promise<Perfil | null> => {
      const { data } = await supabase.from("perfiles").select("*").eq("id", id).maybeSingle();
      return data as Perfil | null;
    },
  });

  const { data: juegos = [] } = useQuery({
    queryKey: ["perfil-juegos", id],
    queryFn: async (): Promise<Juego[]> => {
      const { data } = await supabase
        .from("juegos")
        .select("*")
        .eq("user_id", id)
        .order("created_at", { ascending: false });
      return (data ?? []) as Juego[];
    },
  });

  const { data: entradas = [] } = useQuery({
    queryKey: ["perfil-entradas", id],
    queryFn: async (): Promise<EntradaDiario[]> => {
      const { data } = await supabase
        .from("entradas_diario")
        .select("*")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data ?? []) as EntradaDiario[];
    },
  });

  const { data: siguiendo = false, refetch: refetchFollow } = useQuery({
    queryKey: ["sigo-a", user?.id, id],
    enabled: Boolean(user) && !esMio,
    queryFn: async (): Promise<boolean> => {
      const { data } = await supabase
        .from("seguidores")
        .select("id")
        .eq("seguidor_id", user!.id)
        .eq("seguido_id", id)
        .maybeSingle();
      return Boolean(data);
    },
  });

  async function toggleSeguir() {
    if (!user) return;
    if (siguiendo) {
      await supabase.from("seguidores").delete().eq("seguidor_id", user.id).eq("seguido_id", id);
      toast.success("Has dejado de seguir");
    } else {
      const { error } = await supabase
        .from("seguidores")
        .insert({ seguidor_id: user.id, seguido_id: id });
      if (error) toast.error("No se pudo seguir a esta persona");
      else toast.success("Ahora sigues a esta persona");
    }
    void refetchFollow();
  }

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Cargando…</div>;
  }

  const nombre = perfil?.username ?? "Jugador anónimo";
  const juegosMap = new Map(juegos.map((juego) => [juego.id, juego]));

  return (
    <div className="min-h-screen">
      {user ? <AppNav userId={user.id} /> : null}

      <main className="mx-auto max-w-5xl px-4 py-6">
        <section className="flex items-center gap-4 rounded-xl border border-border/70 bg-card p-5">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/15 text-xl font-semibold text-primary">
            {perfil?.avatar_url ? (
              <img src={perfil.avatar_url} alt={`Avatar de ${nombre}`} className="h-full w-full object-cover" />
            ) : (
              nombre.slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold">{nombre}</h1>
            <p className="text-sm text-muted-foreground">{perfil?.bio ?? "Sin biografía todavía."}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {juegos.length} {juegos.length === 1 ? "juego" : "juegos"} · {entradas.length}{" "}
              {entradas.length === 1 ? "entrada" : "entradas"}
            </p>
          </div>
          {user && !esMio ? (
            <Button size="sm" variant={siguiendo ? "outline" : "default"} onClick={() => void toggleSeguir()}>
              {siguiendo ? "Siguiendo" : "Seguir"}
            </Button>
          ) : null}
        </section>

        <section className="mt-8">
          <h2 className="text-base font-semibold">Su colección</h2>
          {juegos.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Aún no ha añadido juegos.</p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {juegos.map((juego) => (
                <GameCard key={juego.id} juego={juego} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-base font-semibold">
            {esMio ? "Mis entradas" : "Entradas públicas del diario"}
          </h2>
          {entradas.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Todavía no hay entradas que mostrar.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {entradas.map((entrada) => (
                <li key={entrada.id} className="rounded-xl border border-border/70 bg-card p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Link to="/juego/$id" params={{ id: entrada.juego_id }} className="hover:text-foreground">
                      {juegosMap.get(entrada.juego_id)?.titulo ?? "Juego"}
                    </Link>
                    <span>·</span>
                    <span>{fechaCorta(entrada.created_at)}</span>
                    {entrada.valoracion ? <span>· {entrada.valoracion}/10</span> : null}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{entrada.texto}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
