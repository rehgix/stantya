import { STATUS_LABEL, type InventoryRow } from "@/lib/collection";
import { StarRating } from "@/components/StarRating";

interface Props {
  row: InventoryRow;
  view: "grid" | "list";
  onOpen: (row: InventoryRow) => void;
}

function Cover({ row, className }: { row: InventoryRow; className: string }) {
  const item = row.items;
  return (
    <div className={`overflow-hidden rounded-xl border border-border/70 bg-muted ${className}`}>
      {item?.cover_url ? (
        <img
          src={item.cover_url}
          alt={`Portada de ${item.title}`}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full items-center justify-center p-2 text-center text-xs text-muted-foreground">
          {item?.title}
        </div>
      )}
    </div>
  );
}

export function ItemCard({ row, view, onOpen }: Props) {
  const item = row.items;
  if (!item) return null;

  const meta = [item.creator, item.release_year, row.format ?? item.platform]
    .filter(Boolean)
    .join(" · ");

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
        <Cover row={row} className="aspect-[2/3] w-full" />
        <span className="absolute left-2 top-2 rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-medium backdrop-blur-md">
          {STATUS_LABEL[row.status]}
        </span>
      </div>
      <p className="mt-2 truncate text-sm font-medium">{item.title}</p>
      <p className="truncate text-xs text-muted-foreground">{meta}</p>
      {row.rating ? <StarRating value={row.rating} size="sm" /> : null}
    </button>
  );
}
