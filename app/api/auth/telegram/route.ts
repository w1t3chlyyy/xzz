import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function verifyTelegramInitData(initData: string, botToken: string) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  console.log("DEBUG received hash:", hash);
  console.log("DEBUG computed hash:", computedHash);
  console.log("DEBUG bot token length:", botToken.length);

  if (computedHash !== hash) return null;

  const userRaw = params.get("user");
  if (!userRaw) return null;

  return JSON.parse(userRaw) as {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { initData } = await request.json();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!initData || !botToken) {
      return NextResponse.json({ error: "Missing initData or bot token" }, { status: 400 });
    }

    const tgUser = verifyTelegramInitData(initData, botToken);
    if (!tgUser) {
      return NextResponse.json({ error: "Invalid Telegram signature" }, { status: 401 });
    }

    const email = `tg${tgUser.id}@fiolet.app`;
    const password = crypto
      .createHmac("sha256", botToken)
      .update(String(tgUser.id))
      .digest("hex");

    const admin = createAdminClient();

    // Создаём пользователя в auth, если его ещё нет
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError && !createError.message.includes("already registered")) {
      throw createError;
    }

    // Логиним и получаем сессию (куки выставятся автоматически)
    const supabase = createClient();
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.user) {
      throw signInError || new Error("Sign in failed");
    }

    const userId = signInData.user.id;

    // Обновляем/создаём профиль в public.users, не трогая role/subscription
    await admin.from("users").upsert(
      {
        id: userId,
        telegram_id: tgUser.id,
        username: tgUser.username || null,
        first_name: tgUser.first_name || null,
        last_name: tgUser.last_name || null,
        avatar_url: tgUser.photo_url || null,
      },
      { onConflict: "id" }
    );

    const { data: userData } = await admin
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    return NextResponse.json({ role: userData?.role || null });
  } catch (error) {
    console.error("Telegram auth error:", error);
    return NextResponse.json({ error: "Auth failed" }, { status: 500 });
  }
}
