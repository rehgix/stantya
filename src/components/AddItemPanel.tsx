import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  CONDITIONS,
  MEDIA_LABEL,
  estimateMarketValue,
  formatEur,
  type Condition,
  type MediaType,
} from "@/lib/collection";
import { GAME_PLATFORMS, MOVIE_FORMATS, searchBooks, type SearchResult } from "@/lib/media-search";

const MEDIA_TYPES: MediaType[] = ["book", "game", "movie"];

export function AddItemPanel({
  userId,
  onClose,
  onSaved,
}: {
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mediaType, setMediaType] = useState<MediaType>("book");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);

  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("");
  const [year, setYear] = useState("");
  const [platform, setPlatform] = useState("");
  const [condition, setCondition] = useState<Condition>("muy_bueno");
  const [price, setPrice] = useState("");
  const [wishlist, setWishlist] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mediaType !== "book" || query.trim().length < 3) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      setSearching(true);
      searchBooks(query)
        .then(setResults)
        .catch(() => toast.error("No se pudo buscar en Google Books"))
        .finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(handle);
  }, [query, mediaType]);

  function pick(result: SearchResult) {
    setSelected(result);
    setTitle(result.title);
    setCreator(result.creator ?? "");
    setYear(result.releaseYear ? String(result.releaseYear) : "");
    setResults([]);
    setQuery(result.title);
  }

  const purchasePrice = Number(price.replace(",", ".")) || 0;
  const estimate = estimateMarketValue({
    mediaType,
    releaseYear: year ? Number(year) : null,
    condition,
    baseValue: selected?.baseValue ?? null,
    purchasePrice,
  });

  async function save() {
    if (!title.trim()) {
      toast.error("Indica el título del artículo");
      return;
    }
    setSaving(true);
    try {
      const { data: item, error: itemError } = await supabase
        .from("items")
        .insert({
          media_type: mediaType,
          title: title.trim(),
          creator: creator.trim() || null,
          release_year: year ? Number(year) : null,
          cover_url: selected?.coverUrl ?? null,
          platform: platform || null,
          external_id: selected?.externalId ?? null,
          base_value_eur: selected?.baseValue ?? null,
        })
        .select("id")
        .single();
      if (itemError) throw itemError;

      const { error: invError } = await supabase.from("user_inventory").insert({
        user_id: userId,
        item_id: item.id,
        condition,
        purchase_price_eur: wishlist ? 0 : purchasePrice,
        market_value_eur: estimate,
        is_wishlist: wishlist,
      });
      if (invError) throw invError;

      toast.success(`${title.trim()} añadido a tu colección`);
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el artículo");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "bg-background ring-line placeholder:text-muted-foreground focus:ring-ring w-full rounded-lg px-3 py-2.5 font-mono text-sm ring-1 focus:outline-none";

  return (
    <div className="fixed inset-x-0 bottom-0 z-50">
      <div className="mx-auto max-w-6xl px-5 pb-5 sm:px-8">
        <div className="rise bg-card ring-line max-h-[85vh] overflow-y-auto rounded-2xl p-4 shadow-2xl shadow-black/40 ring-1 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-pretty text-base leading-none font-semibold">
              Añadir a la colección
            </h2>
            <button
              onClick={onClose}
              className="font-mono text-muted-foreground hover:text-foreground text-[10px] tracking-[0.15em] uppercase"
            >
              Cerrar
            </button>
          </div>

          <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
            {MEDIA_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => {
                  setMediaType(type);
                  setSelected(null);
                  setPlatform("");
                }}
                className={`font-display shrink-0 -skew-x-12 px-4 py-2 text-sm ${
                  mediaType === type
                    ? "bg-primary font-semibold text-primary-foreground"
                    : "bg-background ring-line font-medium ring-1"
                }`}
              >
                <span className="inline-block skew-x-12">{MEDIA_LABEL[type]}</span>
              </button>
            ))}
          </div>

          {mediaType === "book" ? (
            <>
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelected(null);
                  }}
                  placeholder="Buscar por título o ISBN…"
                  className={`${inputClass} py-3 pr-20`}
                />
                <span className="font-display absolute top-1/2 right-3 -translate-y-1/2 rounded-sm bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground">
                  {searching ? "…" : "Google Books"}
                </span>
              </div>
              {results.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {results.slice(0, 6).map((result) => (
                    <button
                      key={result.externalId}
                      onClick={() => pick(result)}
                      className="bg-background ring-line text-foreground hover:ring-primary/50 rounded-full px-2.5 py-1 font-mono text-[11px] ring-1"
                    >
                      {result.title}
                      {result.releaseYear ? ` · ${result.releaseYear}` : ""}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                mediaType === "game" ? "Título del videojuego" : "Título de la película"
              }
              className={`${inputClass} py-3`}
            />
          )}

          <div className="mt-4 grid grid-cols-2 gap-3">
            {mediaType === "book" && (
              <div className="col-span-2">
                <label className="font-mono text-muted-foreground text-[10px] tracking-[0.15em] uppercase">
                  Título
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`${inputClass} mt-1.5`}
                />
              </div>
            )}

            <div>
              <label className="font-mono text-muted-foreground text-[10px] tracking-[0.15em] uppercase">
                {mediaType === "book" ? "Autor" : mediaType === "game" ? "Estudio" : "Director"}
              </label>
              <input
                type="text"
                value={creator}
                onChange={(e) => setCreator(e.target.value)}
                className={`${inputClass} mt-1.5`}
              />
            </div>

            <div>
              <label className="font-mono text-muted-foreground text-[10px] tracking-[0.15em] uppercase">
                Año
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="1998"
                className={`${inputClass} mt-1.5`}
              />
            </div>

            {mediaType !== "book" && (
              <div className="col-span-2">
                <label className="font-mono text-muted-foreground text-[10px] tracking-[0.15em] uppercase">
                  {mediaType === "game" ? "Plataforma" : "Formato"}
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className={`${inputClass} font-display mt-1.5`}
                >
                  <option value="">Sin especificar</option>
                  {(mediaType === "game" ? GAME_PLATFORMS : MOVIE_FORMATS).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="font-mono text-muted-foreground text-[10px] tracking-[0.15em] uppercase">
                Estado de conservación
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as Condition)}
                className={`${inputClass} font-display mt-1.5`}
              >
                {CONDITIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-mono text-muted-foreground text-[10px] tracking-[0.15em] uppercase">
                Precio pagado (€)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="32,00"
                disabled={wishlist}
                className={`${inputClass} mt-1.5 text-primary disabled:opacity-50`}
              />
            </div>
          </div>

          <label className="mt-3 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
            <input
              type="checkbox"
              checked={wishlist}
              onChange={(e) => setWishlist(e.target.checked)}
              className="size-3.5 accent-[oklch(0.951_0.213_118)]"
            />
            Guardar en la lista de deseos (aún no lo tengo)
          </label>

          <div className="border-line mt-4 flex items-center justify-between border-t pt-4">
            <div className="font-mono text-muted-foreground text-[11px]">
              <span className="block">Valor de mercado estimado</span>
              <span className="text-foreground text-base font-semibold">{formatEur(estimate)}</span>
            </div>
            <button
              onClick={save}
              disabled={saving}
              className="font-display -skew-x-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
            >
              <span className="inline-block skew-x-6">
                {saving ? "Guardando…" : "Guardar artículo"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
