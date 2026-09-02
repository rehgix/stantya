import { supabase } from "@/integrations/supabase/client";

export const COVER_BUCKET = "custom-covers";

/** Diez años: la carátula debe seguir visible en la estantería del usuario. */
const SIGNED_URL_TTL = 60 * 60 * 24 * 3650;

/** Sube la portada digitalizada al almacén privado y devuelve una URL firmada de larga duración. */
export async function uploadCover(blob: Blob): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("Necesitas iniciar sesión para guardar la carátula");

  const extension = blob.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(COVER_BUCKET)
    .upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) throw new Error("No se pudo subir la carátula");

  const { data, error: signError } = await supabase.storage
    .from(COVER_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (signError || !data?.signedUrl) throw new Error("No se pudo generar el enlace de la carátula");

  return data.signedUrl;
}
