import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  onDetected: (code: string) => void;
  onClose: () => void;
}

/** Lector de códigos de barras EAN/ISBN con la cámara del dispositivo. */
export function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    let controls: { stop: () => void } | undefined;

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        controls = await reader.decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
          if (result && !stopped) {
            stopped = true;
            controls?.stop();
            onDetected(result.getText());
          }
        });
        if (stopped) controls.stop();
      } catch {
        setError("No se pudo acceder a la cámara. Escribe el código manualmente.");
      }
    })();

    return () => {
      stopped = true;
      controls?.stop();
    };
  }, [onDetected]);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl border border-border bg-black">
        <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
        <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-primary/80" />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="button" variant="secondary" className="w-full" onClick={onClose}>
        Cerrar cámara
      </Button>
    </div>
  );
}
