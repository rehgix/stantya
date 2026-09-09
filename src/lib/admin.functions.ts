import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AdminMetrics {
  totalUsers: number;
  newUsers7d: number;
  totalItems: number;
}

export interface AdminUser {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  banned: boolean;
  isAdmin: boolean;
  itemCount: number;
}

export interface AdminCatalogRow {
  inventoryId: string;
  itemId: string;
  userId: string;
  userEmail: string | null;
  createdAt: string;
  title: string;
  creator: string | null;
  releaseYear: number | null;
  coverUrl: string | null;
  mediaType: string;
  platform: string | null;
}

export interface ApiStatus {
  name: string;
  configured: boolean;
  ok: boolean;
  detail: string;
}

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || data !== true) {
    throw new Error("No autorizado");
  }
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function listAuthUsers(db: any) {
  const all: any[] = [];
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    all.push(...(data?.users ?? []));
    if (!data?.users || data.users.length < 200) break;
  }
  return all;
}

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ isAdmin: boolean }> => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: data === true };
  });

export const getAdminMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminMetrics> => {
    await assertAdmin(context as any);
    const db = await admin();

    const users = await listAuthUsers(db);
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const { data: inventory, error } = await db
      .from("user_inventory")
      .select("id");
    if (error) throw error;

    return {
      totalUsers: users.length,
      newUsers7d: users.filter((user) => new Date(user.created_at).getTime() >= weekAgo).length,
      totalItems: inventory?.length ?? 0,
    };
  });

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUser[]> => {
    await assertAdmin(context as any);
    const db = await admin();

    const users = await listAuthUsers(db);
    const { data: roles } = await db.from("user_roles").select("user_id, role");
    const { data: inventory } = await db.from("user_inventory").select("user_id");

    const adminIds = new Set(
      (roles ?? []).filter((row: any) => row.role === "admin").map((row: any) => row.user_id),
    );
    const counts = new Map<string, number>();
    for (const row of inventory ?? []) {
      counts.set((row as any).user_id, (counts.get((row as any).user_id) ?? 0) + 1);
    }

    return users
      .map((user) => ({
        id: user.id,
        email: user.email ?? null,
        name:
          (user.user_metadata?.["full_name"] as string | undefined) ??
          (user.user_metadata?.["name"] as string | undefined) ??
          null,
        avatarUrl: (user.user_metadata?.["avatar_url"] as string | undefined) ?? null,
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
        banned: Boolean((user as any).banned_until && new Date((user as any).banned_until) > new Date()),
        isAdmin: adminIds.has(user.id),
        itemCount: counts.get(user.id) ?? 0,
      }))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; makeAdmin: boolean }) => {
    if (!input?.userId) throw new Error("Falta el usuario");
    return { userId: input.userId, makeAdmin: Boolean(input.makeAdmin) };
  })
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    await assertAdmin(context as any);
    if (data.userId === context.userId && !data.makeAdmin) {
      throw new Error("No puedes quitarte tu propio rol de administrador");
    }
    const db = await admin();
    if (data.makeAdmin) {
      const { error } = await db
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw error;
    } else {
      const { error } = await db
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
      if (error) throw error;
    }
    return { ok: true };
  });

export const setUserSuspended = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; suspended: boolean }) => {
    if (!input?.userId) throw new Error("Falta el usuario");
    return { userId: input.userId, suspended: Boolean(input.suspended) };
  })
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    await assertAdmin(context as any);
    if (data.userId === context.userId) throw new Error("No puedes suspender tu propia cuenta");
    const db = await admin();
    const { error } = await db.auth.admin.updateUserById(data.userId, {
      ban_duration: data.suspended ? "876000h" : "none",
    } as any);
    if (error) throw error;
    return { ok: true };
  });

export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => {
    if (!input?.userId) throw new Error("Falta el usuario");
    return { userId: input.userId };
  })
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    await assertAdmin(context as any);
    if (data.userId === context.userId) throw new Error("No puedes eliminar tu propia cuenta");
    const db = await admin();
    await db.from("user_inventory").delete().eq("user_id", data.userId);
    const { error } = await db.auth.admin.deleteUser(data.userId);
    if (error) throw error;
    return { ok: true };
  });

export const listAdminCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminCatalogRow[]> => {
    await assertAdmin(context as any);
    const db = await admin();

    const { data, error } = await db
      .from("user_inventory")
      .select(
        "id, user_id, item_id, created_at, items(id, title, creator, release_year, cover_url, media_type, platform)",
      )
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw error;

    const users = await listAuthUsers(db);
    const emails = new Map(users.map((user) => [user.id, user.email ?? null]));

    return (data ?? []).map((row: any) => ({
      inventoryId: row.id,
      itemId: row.item_id,
      userId: row.user_id,
      userEmail: emails.get(row.user_id) ?? null,
      createdAt: row.created_at,
      title: row.items?.title ?? "Sin título",
      creator: row.items?.creator ?? null,
      releaseYear: row.items?.release_year ?? null,
      coverUrl: row.items?.cover_url ?? null,
      mediaType: row.items?.media_type ?? "book",
      platform: row.items?.platform ?? null,
    }));
  });

export const updateCatalogItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      itemId: string;
      title: string;
      creator: string | null;
      releaseYear: number | null;
      coverUrl: string | null;
    }) => {
      if (!input?.itemId) throw new Error("Falta el artículo");
      if (!input.title?.trim()) throw new Error("El título es obligatorio");
      return {
        itemId: input.itemId,
        title: input.title.trim(),
        creator: input.creator?.trim() || null,
        releaseYear: input.releaseYear ?? null,
        coverUrl: input.coverUrl?.trim() || null,
      };
    },
  )
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    await assertAdmin(context as any);
    const db = await admin();
    const { error } = await db
      .from("items")
      .update({
        title: data.title,
        creator: data.creator,
        release_year: data.releaseYear,
        cover_url: data.coverUrl,
      })
      .eq("id", data.itemId);
    if (error) throw error;
    return { ok: true };
  });

export const deleteCatalogEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { inventoryId: string }) => {
    if (!input?.inventoryId) throw new Error("Falta el registro");
    return { inventoryId: input.inventoryId };
  })
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    await assertAdmin(context as any);
    const db = await admin();
    const { error } = await db.from("user_inventory").delete().eq("id", data.inventoryId);
    if (error) throw error;
    return { ok: true };
  });

async function ping(name: string, url: string | null, configured: boolean): Promise<ApiStatus> {
  if (!configured || !url) {
    return { name, configured, ok: false, detail: "Clave no configurada" };
  }
  try {
    const res = await fetch(url);
    return {
      name,
      configured: true,
      ok: res.ok,
      detail: res.ok ? "Conexión correcta" : `Error HTTP ${res.status}`,
    };
  } catch {
    return { name, configured: true, ok: false, detail: "Sin respuesta" };
  }
}

export const getApiStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ApiStatus[]> => {
    await assertAdmin(context as any);

    const booksKey = process.env["GOOGLE_BOOKS_API_KEY"];
    const tmdbKey = process.env["TMDB_API_KEY"];
    const gamesKey = process.env["THEGAMESDB_API_KEY"];

    const booksUrl = `https://www.googleapis.com/books/v1/volumes?q=test&maxResults=1${
      booksKey ? `&key=${booksKey}` : ""
    }`;
    const tmdbIsV4 = Boolean(tmdbKey && tmdbKey.split(".").length === 3);
    const tmdbUrl = tmdbKey
      ? `https://api.themoviedb.org/3/search/movie?query=test${tmdbIsV4 ? "" : `&api_key=${tmdbKey}`}`
      : null;
    const gamesUrl = gamesKey
      ? `https://api.thegamesdb.net/v1/Games/ByGameName?apikey=${gamesKey}&name=mario`
      : null;

    const [books, games] = await Promise.all([
      ping("Google Books", booksUrl, true),
      ping("TheGamesDB", gamesUrl, Boolean(gamesKey)),
    ]);

    let tmdb: ApiStatus;
    if (!tmdbKey || !tmdbUrl) {
      tmdb = { name: "TMDB", configured: false, ok: false, detail: "Clave no configurada" };
    } else {
      try {
        const res = await fetch(tmdbUrl, {
          headers: tmdbIsV4 ? { Authorization: `Bearer ${tmdbKey}` } : {},
        });
        tmdb = {
          name: "TMDB",
          configured: true,
          ok: res.ok,
          detail: res.ok ? "Conexión correcta" : `Error HTTP ${res.status}`,
        };
      } catch {
        tmdb = { name: "TMDB", configured: true, ok: false, detail: "Sin respuesta" };
      }
    }

    return [books, tmdb, games];
  });
