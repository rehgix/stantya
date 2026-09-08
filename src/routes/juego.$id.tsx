import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Lock, Globe, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { AppNav } from "@/components/AppNav";
import { EstadoBadge } from "@/components/GameCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ESTADOS, fechaCorta, type EntradaDiario, type EstadoJuego, type Juego } from "@/lib/games";

export const Route = createFileRoute("/juego/$id")({
  head: () => ({
    meta: [
      { title: "Diario del juego — Stantya" },
      {
        name: "description",
        content: "Notas, recuerdos y valoración personal de un juego de tu biblioteca en Stantya.",
      },
      { property: "og:title", content: "Diario del juego — Stantya" },
      {
        property: "og:description",
        content: "Escribe y revisa tus recuerdos sobre cada juego que juegas.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GamePage,
});

function GamePage() {
  const { id } = Route.useParams();
  const { user, loading } = useSession();
  const navigate = useNavigate();

  const [texto, setTexto] = useState("");
  const [valoracion, setValoracion] = useState<number | null>(null);
  const [publica, setPublica] = useState(true);
  const [saving, setSaving] = useState(false);

  const { data: juego } = useQuery({
    queryKey: ["juego", id],
    queryFn: async (): Promise<Juego | null> => {
      const { data, error } = await supabase.from("juegos").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Juego | null;
    },
  });

  const { data: entradas = [], refetch } = useQuery({
    queryKey: ["entradas", id, user?.id],
    queryFn: async (): Promise<EntradaDiario[]> => {
      const { data, error } = await supabase
        .from("entradas_diario")
        .select("*")
        .eq("juego_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EntradaDiario[];
    },
  });

  const esMio = Boolean(user && juego && juego.user_id === user.id);

  async function guardarEntrada() {
    if (!user || !texto.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("entradas_diario").insert({
      juego_id: id,
      user_id: user.id,
      texto: texto.trim(),
      valoracion,
      es_publica: publica,
    });
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar la entrada");
      return;
    }
    setTexto("");
    setValoracion(null);
    toast.success("Entrada guardada en tu diario");
    void refetch();
  }

  async function cambiarEstado(estado: EstadoJuego) {
    const { error } = await supabase.from("juegos").update({ estado }).eq("id", id);
    if (error) toast.error("No se pudo actualizar el estado");
    else void navigate({ to: "/juego/$id", params: { id }, replace: true });
  }

  async function borrarJuego() {
    const { error } = await supabase.from("juegos").delete().eq("id", id);
    if (error) toast.error("No se pudo eliminar");
    else void navigate({ to: "/" });
  }

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Cargando…</div>;
  }

  return (
    <div className="min-h-screen">
      {user ? <AppNav userId={user.id} /> : null}

      <main className="mx-auto max-w-3xl px-4 py-6">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>

        {!juego ? (
          <p className="text-muted-foreground">Este juego no existe o ya no está disponible.</p>
        ) : (
          <>
            <section className="flex gap-4">
              <div className="aspect-[3/4] w-28 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted">
                {juego.portada_url ? (
                  <img src={juego.portada_url} alt={`Portada de ${juego.titulo}`} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center bg-gradient-to-br from-primary/20 to-background p-2 text-center text-[11px] text-muted-foreground">
                    {juego.titulo}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-semibold">{juego.titulo}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[juego.plataforma, juego.genero].filter(Boolean).join(" · ") || "Sin datos aún"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {esMio ? (
                    ESTADOS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => void cambiarEstado(option.value)}
                        className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                          juego.estado === option.value
                            ? option.className
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))
                  ) : (
                    <EstadoBadge estado={juego.estado} />
                  )}
                </div>
                {esMio ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 text-destructive"
                    onClick={() => void borrarJuego()}
                  >
                    <Trash2 className="mr-1 h-4 w-4" /> Eliminar de mi biblioteca
                  </Button>
                ) : null}
              </div>
            </section>

            {esMio ? (
              <section className="mt-8 rounded-xl border border-border/70 bg-card p-5">
                <h2 className="text-base font-semibold">Nueva entrada de diario</h2>
                <div className="mt-3 space-y-3">
                  <Textarea
                    value={texto}
                    onChange={(event) => setTexto(event.target.value)}
                    rows={4}
                    placeholder="¿Qué has vivido hoy en este juego? Momentos favoritos, recuerdos, impresiones…"
                  />
                  <div>
                    <Label className="text-xs text-muted-foreground">Valoración personal (1-10)</Label>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setValoracion(valoracion === value ? null : value)}
                          className={`h-8 w-8 rounded-lg border text-xs transition-colors ${
                            valoracion === value
                              ? "border-primary/60 bg-primary/20 text-primary"
                              : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPublica(!publica)}
                    className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground"
                  >
                    {publica ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                    {publica ? "Pública" : "Privada"}
                  </button>
                  <Button
                    className="w-full"
                    disabled={saving || !texto.trim()}
                    onClick={() => void guardarEntrada()}
                  >
                    {saving ? "Guardando…" : "Guardar entrada"}
                  </Button>
                </div>
              </section>
            ) : null}

            <section className="mt-8">
              <h2 className="text-base font-semibold">Diario</h2>
              {entradas.length === 0 ? (
                <p className="mt-3 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  Todavía no hay entradas para este juego.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {entradas.map((entrada) => (
                    <li key={entrada.id} className="rounded-xl border border-border/70 bg-card p-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{fechaCorta(entrada.created_at)}</span>
                        {entrada.valoracion ? (
                          <span className="rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 text-primary">
                            {entrada.valoracion}/10
                          </span>
                        ) : null}
                        {entrada.es_publica ? null : (
                          <span className="inline-flex items-center gap-1">
                            <Lock className="h-3 w-3" /> Privada
                          </span>
                        )}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm">{entrada.texto}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
