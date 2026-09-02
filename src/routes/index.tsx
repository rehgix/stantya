import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid, List, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { AuthPanel } from "@/components/AuthPanel";
import { AddItemPanel } from "@/components/AddItemPanel";
import { ItemCard } from "@/components/ItemCard";
import { ItemDetail } from "@/components/ItemDetail";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { InventoryRow, MediaType } from "@/lib/collection";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stanya — Tu archivo personal de coleccionismo" },
      {
        name: "description",
        content:
          "Cataloga tu colección física en una galería elegante: portadas, sinopsis, formato, estado de lectura o juego, puntuación y notas privadas.",
      },
      { property: "og:title", content: "Stanya — Archivo personal de coleccionismo" },
      {
        property: "og:description",
        content:
          "Organiza libros, videojuegos y películas por portada, formato físico, estado personal y puntuación.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),

  component: Library,
});

type Filter = "all" | MediaType | "pending";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Todo" },
  { value: "book", label: "Libros" },
  { value: "game", label: "Videojuegos" },
  { value: "movie", label: "Películas" },
  { value: "pending", label: "Pendientes" },
];

function Library() {
  const { user, loading } = useSession();
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<InventoryRow | null>(null);

  const { data: rows = [], refetch } = useQuery({
    queryKey: ["inventory", user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<InventoryRow[]> => {
      const { data, error } = await supabase
        .from("user_inventory")
        .select(
          "id, item_id, format, status, rating, notes, items(id, media_type, title, creator, release_year, cover_url, platform, external_id, synopsis)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as InventoryRow[];
    },
  });

  const visible = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "pending")
      return rows.filter((row) => row.status === "pendiente" || row.status === "deseo");
    return rows.filter((row) => row.items?.media_type === filter);
  }, [rows, filter]);

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Cargando…</div>;
  }

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center px-4 py-16">
        <AuthPanel />
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h1 className="sr-only">Stanya — Tu archivo personal de coleccionismo</h1>
            <BrandMark />
          </div>

          <div className="flex items-center rounded-xl border border-border p-0.5">
            <button
              type="button"
              aria-label="Modo vitrina"
              onClick={() => setView("grid")}
              className={`rounded-lg p-1.5 ${view === "grid" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Modo lista"
              onClick={() => setView("list")}
              className={`rounded-lg p-1.5 ${view === "list" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="mr-1 h-4 w-4" /> Añadir
          </Button>
        </div>
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                filter === option.value
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <p className="mb-4 text-sm text-muted-foreground">
          {visible.length} {visible.length === 1 ? "obra" : "obras"}
        </p>

        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
            Aún no hay nada aquí. Añade tu primera obra por título, código de barras o portada.
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {visible.map((row) => (
              <ItemCard key={row.id} row={row} view="grid" onOpen={setSelected} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((row) => (
              <ItemCard key={row.id} row={row} view="list" onOpen={setSelected} />
            ))}
          </div>
        )}
      </main>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Añadir a la biblioteca</DialogTitle>
          </DialogHeader>
          <AddItemPanel userId={user.id} onSaved={() => void refetch()} onClose={() => setAdding(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="sr-only">Ficha de la obra</DialogTitle>
          </DialogHeader>
          {selected ? (
            <ItemDetail
              row={selected}
              onChanged={() => void refetch()}
              onClose={() => setSelected(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
