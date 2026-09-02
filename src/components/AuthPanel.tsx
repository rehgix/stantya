import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";

export function AuthPanel() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Cuenta creada. Ya puedes gestionar tu colección.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo completar el acceso");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("No se pudo iniciar sesión con Google");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    setBusy(false);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
      <div className="rise">
        <div className="flex items-center gap-3">
          <span className="font-display grid size-9 shrink-0 place-items-center bg-primary text-lg font-bold text-primary-foreground">
            V
          </span>
          <div className="">
            <p className="font-display text-base leading-none font-semibold tracking-tight">
              VULCAM
            </p>
            <p className="font-mono text-muted-foreground mt-1 text-[10px] tracking-[0.2em] uppercase">
              Colección física
            </p>
          </div>
        </div>

        <h1 className="font-display mt-8 text-3xl leading-tight font-bold tracking-tight">
          Tu biblioteca de libros, videojuegos y películas
        </h1>
        <p className="font-mono text-muted-foreground mt-3 text-xs">
          Accede para catalogar tus obras por portada, formato, estado y puntuación.
        </p>

        <div className="bg-card ring-line mt-6 rounded-2xl p-5 ring-1">
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="font-mono text-muted-foreground text-[10px] tracking-[0.15em] uppercase">
                Correo electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="bg-background ring-line placeholder:text-muted-foreground focus:ring-ring mt-1.5 w-full rounded-lg px-3 py-2.5 font-mono text-sm ring-1 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-mono text-muted-foreground text-[10px] tracking-[0.15em] uppercase">
                Contraseña
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-background ring-line placeholder:text-muted-foreground focus:ring-ring mt-1.5 w-full rounded-lg px-3 py-2.5 font-mono text-sm ring-1 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="font-display w-full rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
            >
              <span className="inline-block">
                {mode === "signin" ? "Entrar" : "Crear cuenta"}
              </span>
            </button>
          </form>

          <button
            onClick={google}
            disabled={busy}
            className="font-display bg-background ring-line mt-3 w-full rounded-lg px-5 py-2.5 text-sm font-medium ring-1 transition hover:bg-accent disabled:opacity-60"
          >
            Continuar con Google
          </button>

          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="font-mono text-muted-foreground mt-4 w-full text-[11px] hover:text-foreground"
          >
            {mode === "signin"
              ? "No tengo cuenta · Registrarme"
              : "Ya tengo cuenta · Iniciar sesión"}
          </button>
        </div>
      </div>
    </div>
  );
}
