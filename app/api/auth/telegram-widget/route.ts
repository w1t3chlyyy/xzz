import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Вход на сайте через Telegram Login Widget. Аккаунт совпадает с Mini App (тот же email/пароль от telegram id).
function verify(data: Record<string, string>, botToken: string): boolean {
  const { hash, ...rest } = data;
  if (!hash) return false;
  const check = Object.keys(rest).sort().map((k) => `${k}=${rest[k]}`).join("\n");
  const secret = crypto.createHash("sha256").update(botToken.trim()).digest();
  const calc = crypto.createHmac("sha256", secret).update(check).digest("hex");
  const authDate = Number(rest.auth_date);
  return calc === hash && !!authDate && Date.now() / 1000 - authDate < 86400;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!body || !botToken) return NextResponse.json({ error: "bad request" }, { status: 400 });

    const data: Record<string, string> = {};
    for (const [k, v] of Object.entries(body)) if (v !== null && v !== undefined) data[k] = String(v);
    if (!verify(data, botToken)) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

    const id = Number(data.id);
    const email = `tg${id}@1337.app`;
    const password = crypto.createHmac("sha256", botToken).update(String(id)).digest("hex");
    const admin = createAdminClient();

    await admin.auth.admin.createUser({ email, password, email_confirm: true }); // ошибка «уже есть» — нормально

    const supabase = await createClient();
    const { data: s, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !s.user) throw error || new Error("sign in failed");

    await admin.from("users").upsert(
      {
        id: s.user.id,
        telegram_id: id,
        username: data.username || null,
        first_name: data.first_name || null,
        last_name: data.last_name || null,
        avatar_url: data.photo_url || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("widget auth error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Auth failed" }, { status: 500 });
  }
}
