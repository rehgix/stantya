import { useState } from "react";
import { BookOpen, Gamepad2, Film, Search, Layers, Sparkles } from "lucide-react";

import { AuthPanel } from "@/components/AuthPanel";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { coverAspect, movieCaseStyle, platformBanner } from "@/lib/physical";
import type { MediaType } from "@/lib/collection";

interface DemoItem {
  title: string;
  meta: string;
  mediaType: MediaType;
  format: string;
  tone: string;
}

interface DemoShelf {
  id: string;
  name: string;
  headline: string;
  items: DemoItem[];
}

const SHELVES: DemoShelf[] = [
  {
    id: "alex",
    name: "Alex, 29 años",
    headline: "Coleccionista Sci-Fi & RPG",
    items: [
      { title: "Dune", meta: "Frank Herbert · Nova", mediaType: "book", format: "Tapa dura", tone: "from-amber-700/70 to-amber-950" },
      { title: "Dune Mesías", meta: "Frank Herbert · Nova", mediaType: "book", format: "Bolsillo", tone: "from-orange-800/70 to-zinc-950" },
      { title: "Final Fantasy VII Rebirth", meta: "Square Enix · 2024", mediaType: "game", format: "PS5", tone: "from-sky-800/70 to-slate-950" },
      { title: "Final Fantasy XVI", meta: "Square Enix · 2023", mediaType: "game", format: "PS5", tone: "from-indigo-800/70 to-slate-950" },
      { title: "Blade Runner", meta: "Ridley Scott · 1982", mediaType: "movie", format: "4K UHD", tone: "from-cyan-900/70 to-zinc-950" },
      { title: "Blade Runner 2049", meta: "Denis Villeneuve · 2017", mediaType: "movie", format: "4K UHD", tone: "from-amber-900/70 to-zinc-950" },
    ],
  },
  {
    id: "elena",
    name: "Elena, 34 años",
    headline: "Biblioteca Fantástica & Clásicos",
    items: [
      { title: "Harry Potter y la piedra filosofal", meta: "Salamandra · Ilustrado", mediaType: "book", format: "Ilustrado", tone: "from-red-900/70 to-zinc-950" },
      { title: "Harry Potter y la cámara secreta", meta: "Salamandra · Tapa dura", mediaType: "book", format: "Tapa dura", tone: "from-emerald-900/70 to-zinc-950" },
      { title: "Zelda: Tears of the Kingdom", meta: "Nintendo · 2023", mediaType: "game", format: "Nintendo Switch", tone: "from-lime-900/70 to-zinc-950" },
      { title: "Zelda: Breath of the Wild", meta: "Nintendo · 2017", mediaType: "game", format: "Nintendo Switch", tone: "from-teal-900/70 to-zinc-950" },
      { title: "El viaje de Chihiro", meta: "Studio Ghibli · 2001", mediaType: "movie", format: "Blu-ray", tone: "from-rose-900/70 to-zinc-950" },
      { title: "La princesa Mononoke", meta: "Studio Ghibli · 1997", mediaType: "movie", format: "Blu-ray", tone: "from-green-900/70 to-zinc-950" },
    ],
  },
  {
    id: "marc",
    name: "Marc, 41 años",
    headline: "Nostalgia Retro & Cine de Culto",
    items: [
      { title: "Regreso al futuro", meta: "Robert Zemeckis · 1985", mediaType: "movie", format: "VHS", tone: "from-amber-950 to-stone-900" },
      { title: "Akira", meta: "Katsuhiro Otomo · 1988", mediaType: "movie", format: "VHS", tone: "from-red-950 to-stone-900" },
      { title: "Metal Gear Solid", meta: "Konami · 1998", mediaType: "game", format: "PS1", tone: "from-slate-800/70 to-zinc-950" },
      { title: "Super Metroid", meta: "Nintendo · 1994", mediaType: "game", format: "SNES", tone: "from-purple-900/70 to-zinc-950" },
      { title: "Watchmen", meta: "Alan Moore · Cómic", mediaType: "book", format: "Cómic / Novela gráfica", tone: "from-yellow-900/70 to-zinc-950" },
      { title: "Blade Runner (novela)", meta: "Philip K. Dick · Descatalogado", mediaType: "book", format: "Bolsillo", tone: "from-zinc-700/70 to-zinc-950" },
    ],
  },
];

const VALUE_CARDS = [
  {
    icon: BookOpen,
    title: "Libros por Edición Real",
    text: "Encuentra tu versión física exacta filtrando por editorial, tapa dura, bolsillo e ISBN.",
  },
  {
    icon: Gamepad2,
    title: "Juegos con Box Art Auténtico",
    text: "Visualiza tus juegos con carátulas verticales adaptadas a cada consola (PS5, Switch, Xbox, Retro).",
  },
  {
    icon: Film,
    title: "Cine en Formato Doméstico",
    text: "Clasifica películas y series según su soporte físico (VHS, DVD, Blu-ray, 4K UHD o Steelbook).",
  },
];

const STEPS = [
  { icon: Search, title: "Busca o escanea", text: "Encuentra la obra por título o escanea el código de barras EAN/ISBN." },
  { icon: Layers, title: "Elige tu edición", text: "Selecciona la edición física concreta, la plataforma o el formato de tu estantería." },
  { icon: Sparkles, title: "Disfruta tu archivo", text: "Tu estantería virtual, organizada y accesible desde cualquier dispositivo." },
];

function DemoCover({ item }: { item: DemoItem }) {
  const banner = item.mediaType === "game" ? platformBanner(item.format) : null;
  const caseStyle = item.mediaType === "movie" ? movieCaseStyle(item.format) : null;

  return (
    <figure className="group/cover w-32 shrink-0 sm:w-36">
      <div
        className={`relative overflow-hidden rounded-xl border border-border/70 bg-gradient-to-br ${item.tone} shadow-[0_18px_40px_-18px_rgba(0,0,0,0.9)] transition-transform duration-300 group-hover/cover:-translate-y-1.5 group-hover/cover:rotate-[-1.5deg] group-hover/cover:scale-[1.04] ${coverAspect(item.mediaType)}`}
      >
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(255,255,255,0.18),transparent_60%)]" />
        <span className="absolute inset-y-0 left-0 w-1 bg-background/50" />
        <p className="absolute inset-x-2 bottom-6 text-[11px] font-semibold leading-tight text-foreground/90">
          {item.title}
        </p>
        {banner ? (
          <span
            className={`absolute inset-x-0 top-0 truncate px-1 py-0.5 text-center text-[9px] font-bold uppercase tracking-wider ${banner.className}`}
          >
            {banner.platform}
          </span>
        ) : null}
        {caseStyle ? (
          <>
            <span className={`absolute inset-y-0 left-0 w-1.5 ${caseStyle.spine}`} />
            <span
              className={`absolute right-1.5 top-1.5 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${caseStyle.chip}`}
            >
              {item.format}
            </span>
          </>
        ) : null}
        {item.mediaType === "book" ? (
          <span className="absolute right-1.5 top-1.5 rounded bg-background/70 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-foreground/80 backdrop-blur">
            {item.format}
          </span>
        ) : null}
      </div>
      <figcaption className="mt-2 truncate text-[11px] text-muted-foreground">{item.meta}</figcaption>
    </figure>
  );
}

export function Landing() {
  const [authOpen, setAuthOpen] = useState(false);
  const [shelf, setShelf] = useState(SHELVES[0]!.id);
  const active = SHELVES.find((entry) => entry.id === shelf) ?? SHELVES[0]!;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <BrandMark />
          <Button size="sm" onClick={() => setAuthOpen(true)}>
            Entrar
          </Button>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden px-4 py-20 sm:py-28">
          <div className="pointer-events-none absolute left-1/2 top-0 h-[32rem] w-[52rem] -translate-x-1/2 rounded-full bg-primary/20 blur-[140px]" />
          <div className="relative mx-auto max-w-3xl text-center">
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
              El santuario digital para tus colecciones físicas
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
              Cataloga tus libros, videojuegos y películas con portadas oficiales por formato, ediciones
              físicas reales y fichas completas. Sin ruido financiero: solo el placer de archivar lo que amas.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                className="shadow-[0_0_40px_-8px_var(--color-primary)] transition-transform hover:scale-[1.03]"
                onClick={() => setAuthOpen(true)}
              >
                Comenzar mi archivo gratis
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#estanterias">Explorar colecciones de ejemplo</a>
              </Button>
            </div>
          </div>
        </section>

        {/* Valor */}
        <section className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl">¿Qué puedes hacer en Stantya?</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {VALUE_CARDS.map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="rounded-xl border border-border/70 bg-card p-6 transition-colors hover:border-primary/50"
              >
                <span className="inline-flex rounded-xl bg-primary/15 p-2.5 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Estanterías de ejemplo */}
        <section id="estanterias" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl">Estanterías de ejemplo</h2>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {SHELVES.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setShelf(entry.id)}
                className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                  entry.id === active.id
                    ? "border-primary/60 bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {entry.name}
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-border/70 bg-card p-5">
            <p className="text-sm font-medium">{active.name}</p>
            <p className="text-sm text-muted-foreground">{active.headline}</p>
            <div className="mt-5 flex gap-4 overflow-x-auto pb-3">
              {active.items.map((item) => (
                <DemoCover key={`${active.id}-${item.title}`} item={item} />
              ))}
            </div>
            <div className="mt-1 h-2 rounded-full bg-gradient-to-b from-border to-transparent" />
          </div>
        </section>

        {/* Cómo funciona */}
        <section className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl">Cómo funciona en 3 pasos</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, index) => (
              <li key={title} className="rounded-xl border border-border/70 bg-card p-6">
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                    {index + 1}
                  </span>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* CTA final */}
        <section className="mx-auto max-w-6xl px-4 py-14">
          <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-card p-10 text-center">
            <span className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-48 w-96 rounded-full bg-primary/25 blur-[100px]" />
            <h2 className="relative text-2xl font-semibold sm:text-3xl">
              Empieza a construir tu archivo hoy mismo
            </h2>
            <Button
              size="lg"
              className="relative mt-6 shadow-[0_0_40px_-8px_var(--color-primary)] transition-transform hover:scale-[1.03]"
              onClick={() => setAuthOpen(true)}
            >
              Crear mi cuenta gratis
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 px-4 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center text-xs text-muted-foreground">
          <div className="flex gap-4">
            <a href="#estanterias" className="hover:text-foreground">
              Términos
            </a>
            <a href="#estanterias" className="hover:text-foreground">
              Privacidad
            </a>
          </div>
          <p className="max-w-xl">
            This product uses the TMDB API and Google Books data but is not endorsed or certified by them.
          </p>
          <p>© {new Date().getFullYear()} Stantya</p>
        </div>
      </footer>

      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Accede a Stantya</DialogTitle>
          </DialogHeader>
          <AuthPanel />
        </DialogContent>
      </Dialog>
    </div>
  );
}
