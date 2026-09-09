import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ESTADOS, PLATAFORMAS, type EstadoJuego } from "@/lib/games";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSaved: () => void;
}

export function AddGameDialog({ open, onOpenChange, userId, onSaved }: Props) {
  const [titulo, setTitulo] = useState("");
  const [plataforma, setPlataforma] = useState("");
  const [genero, setGenero] = useState("");
  const [portada, setPortada] = useState("");
  const [estado, setEstado] = useState<EstadoJuego>("backlog");
  const [horasJugadas, setHorasJugadas] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!titulo.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("juegos").insert({
      user_id: userId,
      titulo: titulo.trim(),
      plataforma: plataforma || null,
      genero: genero.trim() || null,
      portada_url: portada.trim() || null,
      estado,
      horas_jugadas: horasJugadas.trim() ? Number(horasJugadas) : null,
    });
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar el juego");
      return;
    }
    toast.success("Juego añadido a tu biblioteca");
    setTitulo("");
    setPlataforma("");
    setGenero("");
    setPortada("");
    setEstado("backlog");
    setHorasJugadas("");
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Añadir juego</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
              placeholder="Hollow Knight: Silksong"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Plataforma</Label>
            <div className="flex flex-wrap gap-2">
              {PLATAFORMAS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPlataforma(plataforma === option ? "" : option)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    plataforma === option
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="genero">Género</Label>
            <Input
              id="genero"
              value={genero}
              onChange={(event) => setGenero(event.target.value)}
              placeholder="Metroidvania"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="portada">Portada (enlace de imagen, opcional)</Label>
            <Input
              id="portada"
              value={portada}
              onChange={(event) => setPortada(event.target.value)}
              placeholder="https://…"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="horas">Horas jugadas (opcional)</Label>
            <Input
              id="horas"
              type="number"
              min={0}
              value={horasJugadas}
              onChange={(event) => setHorasJugadas(event.target.value)}
              placeholder="0"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Estado</Label>
            <div className="flex flex-wrap gap-2">
              {ESTADOS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setEstado(option.value)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    estado === option.value
                      ? option.className
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <Button className="w-full" disabled={saving || !titulo.trim()} onClick={() => void save()}>
            {saving ? "Guardando…" : "Añadir a mi biblioteca"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
