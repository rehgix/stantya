import { Star } from "lucide-react";

interface Props {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md";
}

export function StarRating({ value, onChange, size = "md" }: Props) {
  const dimension = size === "sm" ? "h-3.5 w-3.5" : "h-6 w-6";
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value;
        const icon = (
          <Star
            className={`${dimension} ${active ? "fill-primary text-primary" : "text-muted-foreground/40"}`}
          />
        );
        return onChange ? (
          <button
            key={star}
            type="button"
            aria-label={`${star} estrellas`}
            onClick={() => onChange(star === value ? 0 : star)}
          >
            {icon}
          </button>
        ) : (
          <span key={star}>{icon}</span>
        );
      })}
    </div>
  );
}
