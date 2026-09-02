import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  CREATOR_LABEL,
  FORMATS,
  MEDIA_LABEL,
  STATUSES,
  type InventoryRow,
  type Status,
} from "@/lib/collection";
import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  row: InventoryRow;
  onChanged: () => void;
  onClose: () => void;
}

export function ItemDetail({ row, onChanged, onClose }: Props) {
  const item = row.items!;
  const [format, setFormat] = useState(row.format ?? "");
  const [status, setStatus] = useState<Status>(row.status);
  const [rating, setRating] = useState(row.rating ?? 0);
  const [notes, setNotes] = useState(row.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("user_inventory")
      .update({
        format: format || null,
        status,
        rating: rating > 0 ? rating : null,
        notes: notes.trim() || null,
      })
      .eq("id", row.id);
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar");
      return;
    }
    toast.success("Ficha actualizada");
    onChanged();
    onClose();
  }

  async function remove() {
    const { error } = await supabase.from("user_inventory").delete().eq("id", row.id);
    if (error) {
      toast.error("No se pudo eliminar");
      return;
    }
    toast.success("Eliminado de tu biblioteca");
    onChanged();
    onClose();
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-[10rem_1fr]">
        <div className="mx-auto aspect-[2/3] w-40 overflow-hidden rounded-xl border border-border bg-muted">
          {item.cover_url ? (
            <img src={item.cover_url} alt={`Portada de ${item.title}`} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {MEDIA_LABEL[item.media_type]}
          </p>
          <h2 className="text-2xl font-semibold leading-tight">{item.title}</h2>
          <p className="text-sm text-muted-foreground">
            {CREATOR_LABEL[item.media_type]}: {item.creator ?? "—"}
            {item.release_year ? ` · ${item.release_year}` : ""}
          </p>
          {item.synopsis ? (
            <p className="max-h-40 overflow-y-auto text-sm leading-relaxed text-muted-foreground">
              {item.synopsis}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Formato físico</Label>
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona formato" />
            </SelectTrigger>
            <SelectContent>
              {FORMATS[item.media_type].map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Estado personal</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as Status)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Puntuación personal</Label>
        <StarRating value={rating} onChange={setRating} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="detail-notes">Notas privadas</Label>
        <Textarea
          id="detail-notes"
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="destructive" onClick={remove}>
          Eliminar
        </Button>
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
          Cerrar
        </Button>
        <Button type="button" className="flex-1" disabled={saving} onClick={save}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </div>
  );
}
