import { STATUS_LABEL, type InventoryRow } from "@/lib/collection";
import { coverAspect, movieCaseStyle, platformBanner } from "@/lib/physical";
import { StarRating } from "@/components/StarRating";

interface Props {
  row: InventoryRow;
  view: "grid" | "list";
  onOpen: (row: InventoryRow) => void;
}

function Cover({ row, className }: { row: InventoryRow; className: string }) {
  const item = row.items;
  const isGame = item?.media_type === "game";
  const badge = isGame ? platformBanner(row.format ?? item?.platform) : null;
  const caseStyle = item?.media_type === "movie" ? movieCaseStyle(row.format) : null;

  return (
    <div className={`relative overflow-hidden rounded-xl border border-border/70 bg-muted ${className}`}>
      {item?.cover_url ? (
        <img
          src={item.cover_url}
          alt={`Carátula de ${item.title}`}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full items-center justify-center p-2 text-center text-xs text-muted-foreground">
          {item?.title}
        </div>
      )}

      {caseStyle ? (
        <>
          <span className={`absolute inset-y-0 left-0 w-1.5 ${caseStyle.spine}`} />
          <span
            className={`absolute right-1.5 top-1.5 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${caseStyle.chip}`}
          >
            {row.format}
          </span>
        </>
      ) : null}

      {badge ? (
        <span
          className={`absolute inset-x-0 top-0 truncate px-1 py-0.5 text-center text-[9px] font-bold uppercase tracking-wider ${badge.className}`}
        >
          {badge.platform}
        </span>
      ) : null}
    </div>
  );
}

export function ItemCard({ row, view, onOpen }: Props) {
  const item = row.items;
  if (!item) return null;

  const meta =
    item.media_type === "book"
      ? [item.creator, item.platform, item.release_year, row.format].filter(Boolean).join(" · ")
      : [item.creator, item.release_year, row.format ?? item.platform].filter(Boolean).join(" · ");

  if (view === "list") {
    return (
      <button
        type="button"
        onClick={() => onOpen(row)}
        className="group flex w-full items-center gap-4 rounded-xl border border-border/70 bg-card p-3 text-left transition-colors hover:border-primary/50"
      >
        <Cover row={row} className="h-20 w-14 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{item.title}</p>
          <p className="truncate text-sm text-muted-foreground">{meta}</p>
          {row.rating ? <StarRating value={row.rating} size="sm" /> : null}
        </div>
        <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
          {STATUS_LABEL[row.status]}
        </span>
      </button>
    );
  }

  return (
    <button type="button" onClick={() => onOpen(row)} className="group block w-full text-left">
      <div className="relative">
        <Cover row={row} className={`${coverAspect(item.media_type)} w-full`} />
        <span className="absolute bottom-2 left-2 rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-medium backdrop-blur-md">
          {STATUS_LABEL[row.status]}
        </span>
      </div>
      <p className="mt-2 truncate text-sm font-medium">{item.title}</p>
      <p className="truncate text-xs text-muted-foreground">{meta}</p>
      {row.rating ? <StarRating value={row.rating} size="sm" /> : null}
    </button>
  );
}
