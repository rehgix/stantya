import type { MediaType } from "./collection";

/** Estilos de badge por plataforma de consola (carátulas de juego). */
export const PLATFORM_STYLE: { match: RegExp; label: string; className: string }[] = [
  { match: /^PS|PlayStation/i, label: "PlayStation", className: "bg-[#0070D1] text-white" },
  { match: /Switch|Wii|Nintendo|GameCube|SNES|NES|Game Boy/i, label: "Nintendo", className: "bg-[#E60012] text-white" },
  { match: /Xbox/i, label: "Xbox", className: "bg-[#107C10] text-white" },
  { match: /Mega Drive|Dreamcast|Saturn/i, label: "SEGA", className: "bg-[#1B2A80] text-white" },
  { match: /PC/i, label: "PC", className: "bg-zinc-200 text-zinc-900" },
];

export function platformStyle(platform: string | null | undefined) {
  if (!platform) return null;
  const found = PLATFORM_STYLE.find((entry) => entry.match.test(platform));
  return found ? { ...found, platform } : { label: platform, className: "bg-secondary text-foreground", platform };
}

/** Franja/lomo que simula el estuche físico de cine según el formato. */
export const MOVIE_CASE_STYLE: Record<string, { spine: string; chip: string }> = {
  "4K UHD": { spine: "bg-gradient-to-b from-[#0B0B0B] to-[#2B2110]", chip: "bg-[#D4AF37] text-black" },
  Steelbook: { spine: "bg-gradient-to-b from-zinc-300 to-zinc-500", chip: "bg-zinc-100 text-zinc-900" },
  "Blu-ray": { spine: "bg-gradient-to-b from-[#0A3DA8] to-[#06255F]", chip: "bg-[#0A3DA8] text-white" },
  DVD: { spine: "bg-gradient-to-b from-[#141414] to-[#333]", chip: "bg-zinc-800 text-zinc-100" },
  VHS: { spine: "bg-gradient-to-b from-[#3B2A17] to-[#1B1309]", chip: "bg-[#6B4B23] text-amber-50" },
  LaserDisc: { spine: "bg-gradient-to-b from-[#20304a] to-[#0d1522]", chip: "bg-[#2B4A7A] text-white" },
};

export function movieCaseStyle(format: string | null | undefined) {
  if (!format) return null;
  return MOVIE_CASE_STYLE[format] ?? null;
}

/** Proporción de portada por tipo de medio (todas verticales, como la edición física). */
export function coverAspect(mediaType: MediaType): string {
  return mediaType === "game" ? "aspect-[3/4]" : "aspect-[2/3]";
}

/** Banner superior tipo caja física según la consola (PS azul, Switch rojo, Xbox verde…). */
export const PLATFORM_BANNER: { match: RegExp; label: string; className: string }[] = [
  { match: /^PS5$|PlayStation 5/i, label: "PlayStation 5", className: "bg-white text-[#0070D1]" },
  { match: /^PS/i, label: "PlayStation", className: "bg-[#0070D1] text-white" },
  { match: /Switch/i, label: "Nintendo Switch", className: "bg-[#E60012] text-white" },
  { match: /Wii|GameCube|Nintendo|SNES|NES|Game Boy/i, label: "Nintendo", className: "bg-[#E60012] text-white" },
  { match: /Xbox/i, label: "Xbox", className: "bg-[#107C10] text-white" },
  { match: /Mega Drive|Dreamcast|Saturn/i, label: "SEGA", className: "bg-[#1B2A80] text-white" },
  { match: /PC/i, label: "PC", className: "bg-zinc-200 text-zinc-900" },
];

export function platformBanner(platform: string | null | undefined) {
  if (!platform) return null;
  const found = PLATFORM_BANNER.find((entry) => entry.match.test(platform));
  return found
    ? { label: found.label, className: found.className, platform }
    : { label: platform, className: "bg-secondary text-foreground", platform };
}
