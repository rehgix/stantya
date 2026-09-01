import {
  CONDITION_LABEL,
  MEDIA_LABEL,
  formatDelta,
  formatEur,
  type InventoryRow,
} from "@/lib/collection";

export function ItemCard({ row, onRemove }: { row: InventoryRow; onRemove: (id: string) => void }) {
  const item = row.items;
  if (!item) return null;

  const delta = row.market_value_eur - row.purchase_price_eur;
  const subtitle = [item.creator ?? item.platform ?? MEDIA_LABEL[item.media_type], item.release_year]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="rise bg-card ring-line group overflow-hidden rounded-xl ring-1 transition-transform duration-300 hover:-translate-y-1">
      <div className={`relative ${row.is_wishlist ? "opacity-90" : ""}`}>
        {item.cover_url ? (
          <img
            src={item.cover_url}
            alt={`Portada de ${item.title}`}
            loading="lazy"
            className="aspect-[2/3] w-full object-cover"
          />
        ) : (
          <div className="bg-accent grid aspect-[2/3] w-full place-items-center">
            <span className="font-mono text-muted-foreground text-[10px] tracking-[0.15em] uppercase">
              Sin portada
            </span>
          </div>
        )}
        <span className="bg-background/80 absolute top-2 left-2 rounded-sm px-2 py-0.5 font-mono text-[10px] tracking-wide text-primary uppercase">
          {row.is_wishlist ? "Deseo" : MEDIA_LABEL[item.media_type]}
        </span>
        {!row.is_wishlist && (
          <span className="bg-background/80 text-foreground absolute top-2 right-2 rounded-sm px-2 py-0.5 font-mono text-[10px] tracking-wide uppercase">
            {CONDITION_LABEL[row.condition]}
          </span>
        )}
        <button
          onClick={() => onRemove(row.id)}
          className="bg-background/80 text-muted-foreground hover:text-destructive absolute right-2 bottom-2 rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase opacity-0 transition group-hover:opacity-100"
          aria-label={`Quitar ${item.title}`}
        >
          Quitar
        </button>
      </div>

      <div className="p-3 sm:p-4">
        <h3 className="font-display text-pretty text-sm leading-tight font-semibold">
          {item.title}
        </h3>
        <p className="font-mono text-muted-foreground mt-1 text-[11px]">{subtitle}</p>
        <div className="border-line mt-3 flex items-center justify-between border-t pt-3">
          <div className="font-mono text-muted-foreground text-[10px] leading-relaxed">
            <span className="block">
              {row.is_wishlist ? (
                "En lista de deseos"
              ) : (
                <>
                  Pagaste <span className="text-foreground">{formatEur(row.purchase_price_eur)}</span>
                </>
              )}
            </span>
            <span className="text-foreground text-base font-semibold">
              {formatEur(row.market_value_eur)}
            </span>
          </div>
          {row.is_wishlist ? (
            <span className="font-mono text-muted-foreground text-[10px] tracking-wide uppercase">
              —
            </span>
          ) : (
            <span
              className={`font-mono text-xs font-semibold ${delta < 0 ? "text-down" : "text-up"}`}
            >
              {formatDelta(delta)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
