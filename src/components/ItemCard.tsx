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
    <article className="rise group">
      <div
        className={`ring-line/70 bg-card relative overflow-hidden rounded-xl ring-1 transition duration-300 group-hover:-translate-y-1 group-hover:ring-primary/40 ${
          row.is_wishlist ? "opacity-80" : ""
        }`}
      >
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

        <span className="bg-background/70 ring-line/60 text-muted-foreground absolute top-2 left-2 rounded-md px-2 py-0.5 font-mono text-[10px] tracking-wide uppercase ring-1 backdrop-blur">
          {row.is_wishlist ? "Deseo" : MEDIA_LABEL[item.media_type]}
        </span>

        <button
          onClick={() => onRemove(row.id)}
          className="bg-background/70 ring-line/60 text-muted-foreground hover:text-destructive absolute top-2 right-2 rounded-md px-2 py-0.5 font-mono text-[10px] uppercase opacity-0 ring-1 backdrop-blur transition group-hover:opacity-100"
          aria-label={`Quitar ${item.title}`}
        >
          Quitar
        </button>

        {!row.is_wishlist && (
          <div className="from-background/95 absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t to-transparent px-2.5 pt-8 pb-2">
            <span className="font-mono text-foreground/90 text-[11px] font-medium">
              {formatEur(row.market_value_eur)}
            </span>
            <span
              className={`font-mono text-[10px] ${delta < 0 ? "text-down/80" : "text-up/80"}`}
            >
              {formatDelta(delta)}
            </span>
          </div>
        )}
      </div>

      <div className="px-0.5 pt-2.5">
        <h3 className="font-display text-pretty text-[13px] leading-snug font-semibold">
          {item.title}
        </h3>
        <p className="font-mono text-muted-foreground mt-1 truncate text-[11px]">{subtitle}</p>
        <p className="font-mono text-muted-foreground/70 mt-1 text-[10px] tracking-wide uppercase">
          {row.is_wishlist
            ? "En lista de deseos"
            : `${CONDITION_LABEL[row.condition]} · pagado ${formatEur(row.purchase_price_eur)}`}
        </p>
      </div>
    </article>
  );
}

