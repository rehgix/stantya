import { Link } from "@tanstack/react-router";
import { Gamepad2, Activity, BarChart3, User, LogOut } from "lucide-react";

import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const linkClass =
  "flex items-center gap-1.5 rounded-full border border-transparent px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground";
const activeClass = "border-primary/50 bg-primary/15 text-primary";

export function AppNav({ userId }: { userId: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
        <div className="min-w-0 flex-1">
          <BrandMark />
        </div>
        <nav className="flex items-center gap-1">
          <Link to="/" className={linkClass} activeProps={{ className: `${linkClass} ${activeClass}` }}>
            <Gamepad2 className="h-4 w-4" />
            <span className="hidden sm:inline">Biblioteca</span>
          </Link>
          <Link
            to="/actividad"
            className={linkClass}
            activeProps={{ className: `${linkClass} ${activeClass}` }}
          >
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Actividad</span>
          </Link>
          <Link
            to="/estadisticas"
            className={linkClass}
            activeProps={{ className: `${linkClass} ${activeClass}` }}
          >
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Estadísticas</span>
          </Link>
          <Link
            to="/perfil/$id"
            params={{ id: userId }}
            className={linkClass}
            activeProps={{ className: `${linkClass} ${activeClass}` }}
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Perfil</span>
          </Link>
          <Button
            size="sm"
            variant="ghost"
            title="Cerrar sesión"
            onClick={() => void supabase.auth.signOut()}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </nav>
      </div>
    </header>
  );
}
