import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { AuthPanel } from "@/components/AuthPanel";
import { AddItemPanel } from "@/components/AddItemPanel";
import { ItemCard } from "@/components/ItemCard";
import { formatDelta, formatEur, type InventoryRow, type MediaType } from "@/lib/collection";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vulcam — Valora tu colección de libros, juegos y películas" },
      {
        name: "description",
        content:
          "Gestiona e inventaría tu colección física: valor total en €, estado de conservación, precio pagado y ganancia frente al mercado.",
      },
      { property: "og:title", content: "Vulcam — Colección física valorada en €" },
      {
        property: "og:description",
        content:
          "Inventario de libros, videojuegos y películas con valor de mercado estimado y ganancia por artículo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

type Filter = "all" | MediaType | "wishlist";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Todo" },
  { value: "book", label: "Libros" },
  { value: "game", label: "Videojuegos" },
  { value: "movie", label: "Películas" },
  { value: "wishlist", label: "Lista de deseos" },
];

function Dashboard() {
  const { user, loading } = useSession();
  const [filter, setFilter] = useState<Filter>("all");
  const [adding, setAdding] = useState(false);

  const { data: rows = [], refetch } = useQuery({
    queryKey: ["inventory", user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<InventoryRow[]> => {
      const { data, error } = await supabase
        .from("user_inventory")
        .select(
          "id, item_id, condition, purchase_price_eur, market_value_eur, is_wishlist, items(id, media_type, title, creator, release_year, cover_url, platform, external_id, base_value_eur)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as InventoryRow[];
    },
  });

  const totals = useMemo(() => {
    const owned = rows.filter((row) => !row.is_wishlist);
    const market = owned.reduce((sum, row) => sum + Number(row.market_value_eur), 0);
    const paid = owned.reduce((sum, row) => sum + Number(row.purchase_price_eur), 0);
    return {
      market,
      delta: market - paid,
      percent: paid > 0 ? ((market - paid) / paid) * 100 : 0,
      owned: owned.length,
      wishlist: rows.length - owned.length,
    };
  }, [rows]);

  const visible = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "wishlist") return rows.filter((row) => row.is_wishlist);
    return rows.filter((row) => !row.is_wishlist && row.items?.media_type === filter);
  }, [rows, filter]);

  async function remove(id: string) {
    const { error } = await supabase.from("user_inventory").delete().eq("id", id);
    if (error) {
      toast.error("No se pudo quitar el artículo");
      return;
    }
    toast.success("Artículo eliminado");
    void refetch();
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <span className="font-mono text-muted-foreground text-xs tracking-[0.2em] uppercase">
          Cargando colección…
        </span>
      </div>
    );
  }

  if (!user) return <AuthPanel />;

  return (
    <div className="min-h-screen pb-28">
      <header className="border-line/70 bg-background/60 sticky top-0 z-40 border-b backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8 sm:py-4">
          <div className="flex items-center gap-3">
            <span className="font-display grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-base font-bold text-primary-foreground">
              V
            </span>
            <div>
              <p className="font-display text-[15px] leading-none font-semibold tracking-tight">
                VULCAM
              </p>
              <p className="font-mono text-muted-foreground mt-1 text-[10px] tracking-[0.18em] uppercase">
                Archivo de colección
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-mono text-muted-foreground/80 text-[9px] tracking-[0.22em] uppercase">
                Valor estimado
              </p>
              <div className="mt-0.5 flex items-baseline justify-end gap-2">
                <span className="font-display text-base leading-none font-semibold tracking-tight">
                  {formatEur(totals.market)}
                </span>
                <span
                  className={`font-mono text-[10px] ${totals.delta < 0 ? "text-down/80" : "text-up/80"}`}
                >
                  {formatDelta(totals.delta)}
                </span>
              </div>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="font-mono text-muted-foreground hover:text-foreground ring-line/70 hidden rounded-lg px-3 py-1.5 text-[11px] ring-1 sm:block"
            >
              Salir
            </button>
          </div>
        </div>
      </header>


      <main className="mx-auto max-w-6xl px-5 sm:px-8">
        <section className="pt-6 sm:pt-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
                Tu estantería
              </h1>
              <p className="font-mono text-muted-foreground mt-1 text-[11px]">
                {totals.owned} artículos · {totals.wishlist} en deseos
              </p>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="font-mono text-muted-foreground hover:text-foreground text-[11px] sm:hidden"
            >
              Salir
            </button>
          </div>

          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {FILTERS.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`slide font-display shrink-0 rounded-xl px-4 py-2 text-[13px] transition ${
                  filter === option.value
                    ? "bg-primary font-semibold text-primary-foreground"
                    : "bg-card ring-line/70 text-muted-foreground hover:text-foreground font-medium ring-1"
                }`}
              >
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="py-6 sm:py-8">
          {visible.length === 0 ? (
            <div className="bg-card ring-line/70 rounded-xl p-10 text-center ring-1">
              <p className="font-display text-lg font-semibold">Aún no hay artículos aquí</p>
              <p className="font-mono text-muted-foreground mt-2 text-xs">
                Usa el botón «Añadir» para registrar libros, videojuegos o películas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-5">
              {visible.map((row) => (
                <ItemCard key={row.id} row={row} onRemove={remove} />
              ))}
            </div>
          )}
        </section>

        </section>
      </main>

      {adding ? (
        <AddItemPanel userId={user.id} onClose={() => setAdding(false)} onSaved={() => refetch()} />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="font-display fixed right-5 bottom-5 z-40 rounded-full bg-primary px-6 py-4 text-sm font-bold text-primary-foreground shadow-2xl shadow-black/50 ring-1 ring-primary/40"
        >
          <span className="inline-block">+ Añadir</span>
        </button>
      )}
    </div>
  );
}
