import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  CREATOR_LABEL,
  FORMATS,
  MEDIA_LABEL,
  STATUSES,
  type MediaType,
  type Status,
} from "@/lib/collection";
import { looksLikeBarcode, searchBooks, searchMedia, type SearchResult } from "@/lib/media-search";
import { coverAspect, platformStyle } from "@/lib/physical";
import { identifyCover } from "@/lib/vision.functions";

import { BarcodeScanner } from "@/components/BarcodeScanner";
import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface Props {
  userId: string;
  onSaved: () => void;
  onClose: () => void;
}

const MEDIA_TYPES: { value: MediaType; label: string }[] = [
  { value: "book", label: "📚 Libros" },
  { value: "game", label: "🎮 Juegos" },
  { value: "movie", label: "🎬 Cine" },
];

export function AddItemPanel({ userId, onSaved, onClose }: Props) {
  const [mediaType, setMediaType] = useState<MediaType>("book");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [identifying, setIdentifying] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);


  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("");
  const [year, setYear] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [publisher, setPublisher] = useState("");
  const [externalId, setExternalId] = useState<string | null>(null);
  const [format, setFormat] = useState<string>("");

  const [status, setStatus] = useState<Status>("pendiente");
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setSearchError(null);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        setResults(await searchMedia(mediaType, term));
      } catch (error) {
        setResults([]);
        setSearchError(error instanceof Error ? error.message : "No se pudo buscar");
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, mediaType]);


  function apply(result: SearchResult) {
    setMediaType(result.mediaType);
    setTitle(result.title);
    setCreator(result.creator ?? "");
    setYear(result.releaseYear ? String(result.releaseYear) : "");
    setCoverUrl(result.coverUrl ?? "");
    setSynopsis(result.synopsis ?? "");
    setExternalId(result.isbn ?? result.externalId);
    setPublisher(result.publisher ?? "");
    if (result.edition) setFormat(result.edition);
    else if (result.platform) setFormat(result.platform);

    setResults([]);
    setQuery("");
  }

  async function lookupBarcode(code: string) {
    const clean = code.replace(/[\s-]/g, "");
    setBarcode(clean);
    setScanning(false);
    if (!looksLikeBarcode(clean)) {
      toast.error("El código no parece un EAN/ISBN válido");
      return;
    }
    try {
      const found = await searchBooks(clean);
      if (found.length === 0) {
        toast.error("Sin resultados para ese código. Completa la ficha a mano.");
        return;
      }
      apply(found[0]!);
      toast.success("Obra encontrada por código");
    } catch {
      toast.error("No se pudo consultar el código");
    }
  }

  async function handlePhoto(file: File) {
    if (file.size > 5_000_000) {
      toast.error("La imagen supera los 5 MB");
      return;
    }
    setIdentifying(true);
    try {
      const image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("read"));
        reader.readAsDataURL(file);
      });
      const guess = await identifyCover({ data: { image } });
      if (guess.mediaType) setMediaType(guess.mediaType);
      if (guess.title) {
        setTitle(guess.title);
        setQuery(guess.title);
        toast.success(`Portada identificada: ${guess.title}`);
      } else {
        toast.error("No se reconoció la portada");
      }
      if (guess.creator) setCreator(guess.creator);
      if (guess.releaseYear) setYear(String(guess.releaseYear));
      setCoverUrl(image);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo identificar la portada");
    } finally {
      setIdentifying(false);
    }
  }

  async function save() {
    if (!title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    if (mediaType === "movie" && !format) {
      toast.error("Elige el formato físico de la película (VHS, DVD, Blu-ray, 4K UHD o Steelbook)");
      return;
    }
    if (mediaType === "game" && !format) {
      toast.error("Elige la plataforma física del juego");
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
          cover_url: coverUrl || null,
          platform: (mediaType === "book" ? publisher.trim() : format) || null,

          external_id: externalId ?? (barcode || null),
          synopsis: synopsis.trim() || null,
        })
        .select("id")
        .single();
      if (itemError) throw itemError;

      const { error: invError } = await supabase.from("user_inventory").insert({
        user_id: userId,
        item_id: item.id,
        format: format || null,
        status,
        rating: rating > 0 ? rating : null,
        notes: notes.trim() || null,
      });
      if (invError) throw invError;

      toast.success("Añadido a tu biblioteca");
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {MEDIA_TYPES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              setMediaType(option.value);
              setFormat("");
            }}
            className={`rounded-xl border px-4 py-1.5 text-sm transition-colors ${
              mediaType === option.value
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>


      <Tabs defaultValue="search">
        <TabsList className="w-full">
          <TabsTrigger value="search" className="flex-1">
            Buscador
          </TabsTrigger>
          <TabsTrigger value="barcode" className="flex-1">
            Código
          </TabsTrigger>
          <TabsTrigger value="cover" className="flex-1">
            Portada
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-3 pt-4">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              mediaType === "book"
                ? "Título o ISBN…"
                : mediaType === "game"
                  ? "Título, estudio o plataforma…"
                  : "Título o director…"
            }
          />
          {searching ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Buscando…
            </p>
          ) : null}
          {searchError ? <p className="text-xs text-destructive">{searchError}</p> : null}
          {results.length > 0 ? (
            <div className="grid max-h-96 grid-cols-3 gap-3 overflow-y-auto rounded-xl border border-border p-2 sm:grid-cols-4">
              {results.map((result, index) => {
                const badge = platformStyle(result.platform);
                return (
                  <button
                    key={`${result.externalId}-${index}`}
                    type="button"
                    onClick={() => apply(result)}
                    className="group text-left transition-transform hover:scale-[1.03]"
                  >
                    <div
                      className={`relative w-full overflow-hidden rounded-xl border border-border bg-muted ${coverAspect(result.mediaType)}`}
                    >
                      {result.coverUrl ? (
                        <img
                          src={result.coverUrl}
                          alt={`Carátula de ${result.title}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-2 text-center text-[10px] text-muted-foreground">
                          Sin carátula
                        </div>
                      )}
                      {badge && result.mediaType === "game" ? (
                        <span
                          className={`absolute left-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${badge.className}`}
                        >
                          {result.platform}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-tight">{result.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {result.mediaType === "book"
                        ? [result.publisher, result.releaseYear, result.edition].filter(Boolean).join(", ")
                        : [result.creator, result.releaseYear].filter(Boolean).join(" · ")}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : null}



        </TabsContent>

        <TabsContent value="barcode" className="space-y-3 pt-4">
          {scanning ? (
            <BarcodeScanner onDetected={lookupBarcode} onClose={() => setScanning(false)} />
          ) : (
            <Button type="button" variant="secondary" className="w-full" onClick={() => setScanning(true)}>
              Escanear con la cámara
            </Button>
          )}
          <div className="flex gap-2">
            <Input
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
              placeholder="EAN / ISBN"
              inputMode="numeric"
            />
            <Button type="button" onClick={() => lookupBarcode(barcode)}>
              Buscar
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="cover" className="space-y-3 pt-4">
          <p className="text-sm text-muted-foreground">
            Haz una foto de la carátula o sube una imagen para identificar la obra.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handlePhoto(file);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={identifying}
            onClick={() => fileRef.current?.click()}
          >
            {identifying ? "Identificando…" : "Capturar o subir portada"}
          </Button>
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 sm:grid-cols-[7rem_1fr]">
        <div className="mx-auto aspect-[2/3] w-28 overflow-hidden rounded-xl border border-border bg-muted">
          {coverUrl ? (
            <img src={coverUrl} alt={`Portada de ${title || "la obra"}`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Sin portada
            </div>
          )}
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="title">Título</Label>
            <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="creator">{CREATOR_LABEL[mediaType]}</Label>
              <Input id="creator" value={creator} onChange={(event) => setCreator(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="year">Año</Label>
              <Input
                id="year"
                value={year}
                inputMode="numeric"
                onChange={(event) => setYear(event.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </div>
          </div>
          {mediaType === "book" ? (
            <div className="space-y-1.5">
              <Label htmlFor="publisher">Editorial</Label>
              <Input
                id="publisher"
                value={publisher}
                placeholder="Ej. Minotauro"
                onChange={(event) => setPublisher(event.target.value)}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cover">URL de carátula (edición física)</Label>
        <Input
          id="cover"
          value={coverUrl}
          placeholder="Pega la URL de la carátula exacta de tu edición"
          onChange={(event) => setCoverUrl(event.target.value)}
        />
      </div>


      <div className="space-y-1.5">
        <Label htmlFor="synopsis">Sinopsis</Label>
        <Textarea
          id="synopsis"
          rows={4}
          value={synopsis}
          onChange={(event) => setSynopsis(event.target.value)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>
            {mediaType === "game" ? "Plataforma física" : "Formato físico"}
            {mediaType === "book" ? "" : " *"}
          </Label>

          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona formato" />
            </SelectTrigger>
            <SelectContent>
              {FORMATS[mediaType].map((option) => (
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
        <Label>Puntuación</Label>
        <StarRating value={rating} onChange={setRating} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notas privadas</Label>
        <Textarea id="notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="button" className="flex-1" disabled={saving} onClick={save}>
          {saving ? "Guardando…" : "Añadir a la biblioteca"}
        </Button>
      </div>
    </div>
  );
}
