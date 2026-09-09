import { useState } from "react";
import { Gamepad2, NotebookPen, Users, Trophy } from "lucide-react";

import { AuthPanel } from "@/components/AuthPanel";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const DEMO = [
  { title: "Elden Ring", meta: "PS5 · Completado", tone: "from-amber-700/60 to-zinc-950" },
  { title: "Hollow Knight", meta: "Switch · Jugando", tone: "from-sky-800/60 to-slate-950" },
  { title: "Baldur's Gate 3", meta: "PC · Jugando", tone: "from-indigo-800/60 to-slate-950" },
  { title: "Zelda: TOTK", meta: "Switch · Completado", tone: "from-emerald-800/60 to-zinc-950" },
  { title: "Silent Hill 2", meta: "PS5 · Backlog", tone: "from-rose-900/60 to-zinc-950" },
  { title: "Hades II", meta: "PC · Deseado", tone: "from-fuchsia-800/60 to-slate-950" },
];

const PASOS = [
  {
    icon: Gamepad2,
    title: "Añade tus juegos",
    text: "Crea tu biblioteca con lo que juegas, lo que dejaste a medias y lo que deseas.",
  },
  {
    icon: NotebookPen,
    title: "Escribe tu diario",
    text: "Guarda recuerdos, impresiones y una valoración personal de cada partida.",
  },
  {
    icon: Users,
    title: "Sigue a otros jugadores",
    text: "Descubre qué están jugando y leyendo tus amistades en su diario público.",
  },
];

export function Landing() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <BrandMark />
          <Button size="sm" onClick={() => setAuthOpen(true)}>
            Entrar
          </Button>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-4 pb-10 pt-14 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary">
            <Trophy className="h-3.5 w-3.5" /> Tu vida gamer, guardada
          </span>
          <h1 className="mt-5 text-balance text-4xl font-semibold leading-tight sm:text-5xl">
            El diario personal de tu vida gamer
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground">
            Rastrea tu colección de videojuegos, escribe notas y recuerdos sobre cada juego que
            juegas y sigue la actividad de otros jugadores.
          </p>
          <div className="mt-7 flex justify-center gap-3">
            <Button size="lg" onClick={() => setAuthOpen(true)}>
              Empezar mi diario
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-14">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {DEMO.map((juego) => (
              <div key={juego.title} className="space-y-2">
                <div
                  className={`grid aspect-[3/4] place-items-center rounded-xl border border-border/70 bg-gradient-to-br p-3 text-center text-xs font-medium ${juego.tone}`}
                >
                  {juego.title}
                </div>
                <p className="text-[11px] text-muted-foreground">{juego.meta}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-20">
          <div className="grid gap-4 sm:grid-cols-3">
            {PASOS.map((paso) => (
              <div key={paso.title} className="rounded-xl border border-border/70 bg-card p-5">
                <paso.icon className="h-5 w-5 text-primary" />
                <h2 className="mt-3 text-base font-semibold">{paso.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{paso.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        Stantya — tu diario gamer
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
