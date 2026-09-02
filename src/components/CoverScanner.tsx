import { useEffect, useRef, useState } from "react";
import { Camera, ImageUp, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { uploadCover } from "@/lib/cover-storage";
import type { MediaType } from "@/lib/collection";

interface Props {
  mediaType: MediaType;
  /** Recibe la URL pública/firmada ya subida a Lovable Cloud. */
  onScanned: (url: string) => void;
  label?: string;
  size?: "sm" | "default";
  className?: string;
}

/** Ratio del estuche físico: 3:4 en videojuegos, 2:3 en libros y películas. */
function caseRatio(mediaType: MediaType): number {
  return mediaType === "game" ? 3 / 4 : 2 / 3;
}

const OUTPUT_HEIGHT = 1400;

export function CoverScanner({ mediaType, onScanned, label, size = "default", className }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [open, setOpen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(105);
  const [busy, setBusy] = useState(false);

  const ratio = caseRatio(mediaType);

  function loadFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona una imagen");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        imageRef.current = image;
        setRotation(0);
        setZoom(1);
        setBrightness(100);
        setContrast(105);
        setOpen(true);
      };
      image.onerror = () => toast.error("No se pudo leer la imagen");
      image.src = String(reader.result);
    };
    reader.onerror = () => toast.error("No se pudo leer la imagen");
    reader.readAsDataURL(file);
  }

  /** Dibuja la portada encuadrada en el canvas indicado, aplicando giro, zoom y ajustes. */
  function draw(canvas: HTMLCanvasElement, height: number) {
    const image = imageRef.current;
    if (!image) return;
    const width = Math.round(height * ratio);
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(105%)`;
    ctx.fillStyle = "#0F1117";
    ctx.fillRect(0, 0, width, height);

    const turned = rotation % 180 !== 0;
    const sourceWidth = turned ? image.height : image.width;
    const sourceHeight = turned ? image.width : image.height;
    const scale = Math.max(width / sourceWidth, height / sourceHeight) * zoom;

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(
      image,
      (-image.width * scale) / 2,
      (-image.height * scale) / 2,
      image.width * scale,
      image.height * scale,
    );
    ctx.restore();
  }

  useEffect(() => {
    if (!open || !previewRef.current) return;
    draw(previewRef.current, 720);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rotation, zoom, brightness, contrast]);

  async function digitize() {
    if (!imageRef.current) return;
    setBusy(true);
    const toastId = toast.loading("Digitalizando portada…");
    try {
      const canvas = document.createElement("canvas");
      draw(canvas, OUTPUT_HEIGHT);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", 0.85),
      );
      const finalBlob =
        blob ??
        (await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85)));
      if (!finalBlob) throw new Error("No se pudo procesar la imagen");

      const url = await uploadCover(finalBlob);
      onScanned(url);
      toast.success("Portada digitalizada y guardada", { id: toastId });
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo digitalizar la portada", {
        id: toastId,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) loadFile(file);
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) loadFile(file);
        }}
      />

      <div className={`flex gap-2 ${className ?? ""}`}>
        <Button
          type="button"
          size={size}
          variant="secondary"
          className="flex-1"
          onClick={() => cameraRef.current?.click()}
        >
          <Camera className="mr-2 h-4 w-4" />
          {label ?? "Escanear portada física"}
        </Button>
        <Button
          type="button"
          size={size}
          variant="outline"
          onClick={() => galleryRef.current?.click()}
          aria-label="Subir imagen desde galería"
        >
          <ImageUp className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(next) => (busy ? null : setOpen(next))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Encuadra la carátula</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative mx-auto w-full max-w-[16rem] overflow-hidden rounded-xl border border-border bg-muted">
              <canvas ref={previewRef} className="block h-auto w-full" />
              {/* Guías de esquina para alinear los bordes de la caja física */}
              {[
                "left-2 top-2 border-l-2 border-t-2",
                "right-2 top-2 border-r-2 border-t-2",
                "left-2 bottom-2 border-b-2 border-l-2",
                "right-2 bottom-2 border-b-2 border-r-2",
              ].map((position) => (
                <span
                  key={position}
                  className={`pointer-events-none absolute h-6 w-6 rounded-[3px] border-primary/80 ${position}`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRotation((value) => (value + 90) % 360)}
              >
                <RotateCw className="mr-2 h-4 w-4" />
                Rotar 90°
              </Button>
              <p className="text-xs text-muted-foreground">
                Ratio {mediaType === "game" ? "3:4" : "2:3"} · {OUTPUT_HEIGHT}px
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Zoom</Label>
                <Slider
                  min={1}
                  max={2.5}
                  step={0.01}
                  value={[zoom]}
                  onValueChange={([value]) => setZoom(value ?? 1)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Brillo</Label>
                <Slider
                  min={60}
                  max={160}
                  step={1}
                  value={[brightness]}
                  onValueChange={([value]) => setBrightness(value ?? 100)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Contraste</Label>
                <Slider
                  min={60}
                  max={180}
                  step={1}
                  value={[contrast]}
                  onValueChange={([value]) => setContrast(value ?? 100)}
                />
              </div>
            </div>

            <Button type="button" className="w-full" disabled={busy} onClick={() => void digitize()}>
              {busy ? "Digitalizando portada…" : "Guardar portada digitalizada"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
