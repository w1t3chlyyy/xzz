import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Публичный каталог исполнителей. Раньше лента читала users напрямую, но RLS отдаёт
// пользователю только его собственную строку — список был пустым. Отдаём только безопасные поля.
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return unauthorized();

  const { data, error } = await createAdminClient()
    .from("users")
    .select("id, first_name, avatar_url, executor_profiles(skills, bio, rating, completed_orders, hourly_rate, specialization, is_open)")
    .eq("role", "executor")
    .neq("id", me.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const executors = (data || []).map((u: any) => {
    const p = Array.isArray(u.executor_profiles) ? u.executor_profiles[0] : u.executor_profiles;
    return {
      id: u.id,
      first_name: u.first_name || "Специалист",
      avatar_url: u.avatar_url || null,
      executor_profiles: {
        skills: p?.skills || [],
        bio: p?.bio || "",
        rating: p?.rating ?? null,
        completed_orders: p?.completed_orders || 0,
        hourly_rate: p?.hourly_rate ?? null,
        specialization: p?.specialization || "",
        is_open: p?.is_open !== false,
      },
    };
  });

  return NextResponse.json({ executors });
}
