interface Props {
  subtitle?: string;
}

/** Isotipo + logotipo de Stantya: tres lomos alineados sobre un estante. */
export function BrandMark({ subtitle = "Tu archivo personal de coleccionismo" }: Props) {
  return (
    <div className="group flex select-none items-center gap-3">
      <svg
        viewBox="0 0 40 40"
        role="img"
        aria-label="Stantya"
        className="h-9 w-9 shrink-0 transition-transform duration-300 ease-out group-hover:scale-105 group-hover:drop-shadow-[0_0_10px_rgb(99_102_241_/_0.55)]"
      >
        <defs>
          <linearGradient id="stantya-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="50%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="38" height="38" rx="11" fill="url(#stantya-grad)" opacity="0.14" />
        <rect x="9" y="9" width="6" height="18" rx="2" fill="url(#stantya-grad)" />
        <rect x="17" y="6" width="6" height="21" rx="2" fill="url(#stantya-grad)" opacity="0.85" />
        <rect x="25" y="12" width="6" height="15" rx="2" fill="url(#stantya-grad)" opacity="0.65" />
        <rect x="8" y="30" width="24" height="3" rx="1.5" fill="url(#stantya-grad)" />
      </svg>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold tracking-[0.08em] text-foreground">Stantya</p>
        {subtitle ? (
          <p className="truncate text-[11px] tracking-wide text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
