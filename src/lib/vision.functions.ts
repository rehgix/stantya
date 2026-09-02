import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface CoverGuess {
  title: string | null;
  creator: string | null;
  releaseYear: number | null;
  mediaType: "book" | "game" | "movie" | null;
}

/** Identifica una portada a partir de una foto usando el modelo de visión de Lovable AI. */
export const identifyCover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { image: string }) => {
    if (!input?.image?.startsWith("data:image/")) throw new Error("Imagen no válida");
    if (input.image.length > 6_000_000) throw new Error("La imagen es demasiado grande");
    return input;
  })
  .handler(async ({ data }): Promise<CoverGuess> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Falta la configuración de IA");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              'Identificas portadas de libros, videojuegos y películas. Responde SOLO con JSON: {"title":string|null,"creator":string|null,"releaseYear":number|null,"mediaType":"book"|"game"|"movie"|null}. creator = autor, desarrollador o director.',
          },
          {
            role: "user",
            content: [
              { type: "text", text: "¿Qué obra es esta portada?" },
              { type: "image_url", image_url: { url: data.image } },
            ],
          },
        ],
      }),
    });

    if (res.status === 429) throw new Error("Demasiadas peticiones, inténtalo en un minuto");
    if (!res.ok) throw new Error("No se pudo identificar la portada");

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No se reconoció la portada");
    const parsed = JSON.parse(match[0]) as CoverGuess;
    return {
      title: parsed.title ?? null,
      creator: parsed.creator ?? null,
      releaseYear: typeof parsed.releaseYear === "number" ? parsed.releaseYear : null,
      mediaType: parsed.mediaType ?? null,
    };
  });
