import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function verifyTelegramInitData(initData: string, botToken: string) {
  console.log("DEBUG initData:", initData);
  
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  
  console.log("DEBUG hash from params:", hash);
  
  if (!hash) {
    console.log("ERROR: No hash found in initData");
    return null;
  }
  
  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  console.log("DEBUG dataCheckString:", dataCheckString);

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  console.log("DEBUG received hash:", hash);
  console.log("DEBUG computed hash:", computedHash);
  console.log("DEBUG bot token:", botToken.substring(0, 10) + "...");

  if (computedHash !== hash) {
    console.log("ERROR: Hash mismatch!");
    return null;
  }

  const userRaw = params.get("user");
  console.log("DEBUG userRaw:", userRaw);
  
  if (!userRaw) {
    console.log("ERROR: No user found in params");
    return null;
  }

  try {
    const user = JSON.parse(userRaw);
    console.log("DEBUG parsed user:", user);
    return user;
  } catch (e) {
    console.log("ERROR: Failed to parse user JSON:", e);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("DEBUG request body:", body);
    
    const { initData } = body;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    console.log("DEBUG botToken exists:", !!botToken);
    console.log("DEBUG initData exists:", !!initData);

    if (!initData || !botToken) {
      console.log("ERROR: Missing initData or bot token");
      return NextResponse.json({ error: "Missing initData or bot token" }, { status: 400 });
    }

    const tgUser = verifyTelegramInitData(initData, botToken);
    if (!tgUser) {
      console.log("ERROR: Invalid Telegram signature");
      return NextResponse.json({ error: "Invalid Telegram signature" }, { status: 401 });
    }

    console.log("DEBUG tgUser verified:", tgUser);

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
      console.log("ERROR creating user:", createError);
      throw createError;
    }

    // Логиним и получаем сессию (куки выставятся автоматически)
    const supabase = createClient();
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.user) {
      console.log("ERROR signing in:", signInError);
      throw signInError || new Error("Sign in failed");
    }

    const userId = signInData.user.id;

    // Обновляем/создаём профиль в public.users
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

    console.log("DEBUG auth successful, user role:", userData?.role);
    return NextResponse.json({ role: userData?.role || null });
  } catch (error) {
    console.error("Telegram auth error:", error);
    return NextResponse.json({ error: "Auth failed" }, { status: 500 });
  }
}
