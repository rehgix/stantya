import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  BarChart3,
  Gamepad2,
  Library,
  RefreshCw,
  Settings,
  ShieldCheck,
  Trash2,
  Users,
  Pencil,
  UserCog,
  Ban,
} from "lucide-react";

import { useSession } from "@/hooks/use-session";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  checkIsAdmin,
  deleteCatalogEntry,
  deleteUserAccount,
  getAdminMetrics,
  getApiStatus,
  listAdminCatalog,
  listAdminUsers,
  setUserRole,
  setUserSuspended,
  updateCatalogItem,
  type AdminCatalogRow,
  type AdminUser,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Panel de administración — Stantya" },
      { name: "description", content: "Panel privado de gestión de la plataforma Stantya." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Panel de administración — Stantya" },
      { property: "og:description", content: "Métricas, usuarios y catálogo de Stantya." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center p-6 text-sm text-destructive" role="alert">
      {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center p-6 text-sm text-muted-foreground">
      Sección no encontrada.
    </div>
  ),
});

const PAGE_SIZE = 8;

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function AdminPage() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const isAdminFn = useServerFn(checkIsAdmin);

  const { data: access, isPending } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: Boolean(user),
    queryFn: () => isAdminFn(),
  });

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/", replace: true });
    else if (access && !access.isAdmin) navigate({ to: "/", replace: true });
  }, [loading, user, access, navigate]);

  if (loading || (user && isPending)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Comprobando permisos…
      </div>
    );
  }

  if (!user || !access?.isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Redirigiendo…
      </div>
    );
  }

  return <AdminShell />;
}

function AdminShell() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <BrandMark />
            <Badge variant="outline" className="hidden gap-1 border-primary/40 text-primary sm:flex">
              <ShieldCheck className="h-3 w-3" /> Admin
            </Badge>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/">Volver a la biblioteca</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-xl font-semibold tracking-tight">Panel de administración</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Métricas, usuarios, catálogo y estado de las integraciones.
        </p>

        <Tabs defaultValue="metrics" className="mt-6">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-card p-1">
            <TabsTrigger value="metrics" className="gap-2 rounded-lg">
              <BarChart3 className="h-4 w-4" /> Métricas
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2 rounded-lg">
              <Users className="h-4 w-4" /> Usuarios
            </TabsTrigger>
            <TabsTrigger value="catalog" className="gap-2 rounded-lg">
              <Library className="h-4 w-4" /> Catálogo
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2 rounded-lg">
              <Settings className="h-4 w-4" /> Ajustes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="metrics" className="pt-6">
            <MetricsSection />
          </TabsContent>
          <TabsContent value="users" className="pt-6">
            <UsersSection />
          </TabsContent>
          <TabsContent value="catalog" className="pt-6">
            <CatalogSection />
          </TabsContent>
          <TabsContent value="settings" className="pt-6">
            <SettingsSection />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  hint?: string;
}) {
  return (
    <Card className="rounded-xl border-border/70 bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
        <span className="text-primary">{icon}</span>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function MetricsSection() {
  const metricsFn = useServerFn(getAdminMetrics);
  const { data, isPending, error } = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: () => metricsFn(),
  });

  if (isPending) return <p className="text-sm text-muted-foreground">Cargando métricas…</p>;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  if (!data) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <KpiCard label="Usuarios registrados" value={data.totalUsers} icon={<Users className="h-4 w-4" />} />
      <KpiCard
        label="Nuevos (7 días)"
        value={data.newUsers7d}
        icon={<UserCog className="h-4 w-4" />}
        hint="Altas de la última semana"
      />
      <KpiCard
        label="Obras en colecciones"
        value={data.totalItems}
        icon={<Library className="h-4 w-4" />}
      />
    </div>
  );
}

function UsersSection() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listAdminUsers);
  const roleFn = useServerFn(setUserRole);
  const suspendFn = useServerFn(setUserSuspended);
  const deleteFn = useServerFn(deleteUserAccount);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [confirm, setConfirm] = useState<{
    user: AdminUser;
    action: "role" | "suspend" | "delete";
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: users = [], isPending, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listFn(),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter(
      (item) =>
        item.email?.toLowerCase().includes(term) || item.name?.toLowerCase().includes(term),
    );
  }, [users, search]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const rows = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  async function runAction() {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.action === "role") {
        await roleFn({ data: { userId: confirm.user.id, makeAdmin: !confirm.user.isAdmin } });
        toast.success("Rol actualizado con éxito");
      } else if (confirm.action === "suspend") {
        await suspendFn({ data: { userId: confirm.user.id, suspended: !confirm.user.banned } });
        toast.success(confirm.user.banned ? "Cuenta reactivada" : "Cuenta suspendida");
      } else {
        await deleteFn({ data: { userId: confirm.user.id } });
        toast.success("Usuario eliminado");
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
      setConfirm(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo completar la acción");
    } finally {
      setBusy(false);
    }
  }

  if (isPending) return <p className="text-sm text-muted-foreground">Cargando usuarios…</p>;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;

  return (
    <div className="space-y-4">
      <Input
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(0);
        }}
        placeholder="Buscar por nombre o correo…"
        className="max-w-sm"
      />

      <div className="overflow-x-auto rounded-xl border border-border/70">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-card/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">Registro</th>
              <th className="px-4 py-3 font-medium">Obras</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-border/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      {item.avatarUrl ? <AvatarImage src={item.avatarUrl} alt="" /> : null}
                      <AvatarFallback className="text-xs">
                        {(item.name ?? item.email ?? "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.name ?? item.email ?? "Sin nombre"}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.email ?? "—"}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(item.createdAt)}</td>
                <td className="px-4 py-3">{item.itemCount}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={item.isAdmin ? "default" : "secondary"}>
                      {item.isAdmin ? "Admin" : "User"}
                    </Badge>
                    {item.banned ? <Badge variant="destructive">Suspendido</Badge> : null}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Cambiar rol"
                      onClick={() => setConfirm({ user: item, action: "role" })}
                    >
                      <UserCog className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title={item.banned ? "Reactivar" : "Suspender"}
                      onClick={() => setConfirm({ user: item, action: "suspend" })}
                    >
                      <Ban className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Eliminar cuenta"
                      onClick={() => setConfirm({ user: item, action: "delete" })}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Sin resultados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Página {current + 1} de {pages} · {filtered.length} usuarios
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={current === 0} onClick={() => setPage(current - 1)}>
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={current >= pages - 1}
            onClick={() => setPage(current + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>

      <AlertDialog open={Boolean(confirm)} onOpenChange={(open) => (open ? null : setConfirm(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.action === "role"
                ? confirm.user.isAdmin
                  ? "Quitar permisos de administrador"
                  : "Conceder permisos de administrador"
                : confirm?.action === "suspend"
                  ? confirm.user.banned
                    ? "Reactivar cuenta"
                    : "Suspender cuenta"
                  : "Eliminar cuenta"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === "delete"
                ? "Esta acción es irreversible: se eliminará la cuenta y toda su biblioteca."
                : `Se aplicará el cambio a ${confirm?.user.email ?? "este usuario"}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                void runAction();
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CatalogSection() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listAdminCatalog);
  const updateFn = useServerFn(updateCatalogItem);
  const deleteFn = useServerFn(deleteCatalogEntry);

  const [editing, setEditing] = useState<AdminCatalogRow | null>(null);
  const [form, setForm] = useState({ title: "", creator: "", releaseYear: "", coverUrl: "" });
  const [removing, setRemoving] = useState<AdminCatalogRow | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: rows = [], isPending, error } = useQuery({
    queryKey: ["admin-catalog"],
    queryFn: () => listFn(),
  });

  function openEdit(row: AdminCatalogRow) {
    setEditing(row);
    setForm({
      title: row.title,
      creator: row.creator ?? "",
      releaseYear: row.releaseYear ? String(row.releaseYear) : "",
      coverUrl: row.coverUrl ?? "",
    });
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    try {
      await updateFn({
        data: {
          itemId: editing.itemId,
          title: form.title,
          creator: form.creator || null,
          releaseYear: form.releaseYear ? Number(form.releaseYear) : null,
          coverUrl: form.coverUrl || null,
        },
      });
      toast.success("Metadatos actualizados");
      await queryClient.invalidateQueries({ queryKey: ["admin-catalog"] });
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!removing) return;
    setBusy(true);
    try {
      await deleteFn({ data: { inventoryId: removing.inventoryId } });
      toast.success("Registro eliminado");
      await queryClient.invalidateQueries({ queryKey: ["admin-catalog"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
      setRemoving(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar");
    } finally {
      setBusy(false);
    }
  }

  if (isPending) return <p className="text-sm text-muted-foreground">Cargando catálogo…</p>;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Últimas obras guardadas por los usuarios.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <Card key={row.inventoryId} className="rounded-xl border-border/70 bg-card">
            <CardContent className="flex gap-3 p-3">
              <div className="h-24 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                {row.coverUrl ? (
                  <img src={row.coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium leading-tight">{row.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[row.creator, row.releaseYear].filter(Boolean).join(" · ") || "Sin datos"}
                </p>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">{row.userEmail ?? "—"}</p>
                <div className="mt-2 flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setRemoving(row)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay obras guardadas.</p>
        ) : null}
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => (open ? null : setEditing(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar metadatos</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Autor / Director / Estudio</Label>
              <Input value={form.creator} onChange={(e) => setForm({ ...form, creator: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Año</Label>
              <Input
                value={form.releaseYear}
                inputMode="numeric"
                onChange={(e) => setForm({ ...form, releaseYear: e.target.value.replace(/\D/g, "") })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>URL de portada</Label>
              <Input value={form.coverUrl} onChange={(e) => setForm({ ...form, coverUrl: e.target.value })} />
            </div>
            <Button className="w-full" disabled={busy} onClick={() => void save()}>
              Guardar cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(removing)} onOpenChange={(open) => (open ? null : setRemoving(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar registro</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará «{removing?.title}» de la biblioteca de {removing?.userEmail ?? "este usuario"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                void remove();
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SettingsSection() {
  const queryClient = useQueryClient();
  const statusFn = useServerFn(getApiStatus);
  const { data = [], isFetching, error, refetch } = useQuery({
    queryKey: ["admin-api-status"],
    queryFn: () => statusFn(),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Estado de las integraciones externas.</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={isFetching} onClick={() => void refetch()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Comprobar
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              await queryClient.invalidateQueries();
              toast.success("Caché limpiada");
            }}
          >
            Limpiar caché
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{(error as Error).message}</p> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {data.map((api) => (
          <Card key={api.name} className="rounded-xl border-border/70 bg-card">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{api.name}</p>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    api.ok ? "bg-emerald-400" : api.configured ? "bg-amber-400" : "bg-destructive"
                  }`}
                />
              </div>
              <p className="text-xs text-muted-foreground">{api.detail}</p>
            </CardContent>
          </Card>
        ))}
        {isFetching && data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Comprobando conexiones…</p>
        ) : null}
      </div>
    </div>
  );
}
