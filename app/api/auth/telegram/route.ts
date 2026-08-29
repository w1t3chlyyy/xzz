import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

function verifyTelegramInitData(initData: string, botToken: string): TelegramUser | null {
  try {
    const cleanToken = botToken.trim();

    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get("hash");
    if (!hash) {
      console.log("❌ No hash field in initData at all");
      return null;
    }

    urlParams.delete("hash");

    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    const secretKey = crypto.createHmac("sha256", "WebAppData").update(cleanToken).digest();
    const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    // ВРЕМЕННО для отладки — удалить после диагностики
    console.log("RAW initData:", initData);
    console.log("dataCheckString:", JSON.stringify(dataCheckString));
    console.log("botToken length:", cleanToken.length, "first 6 chars:", cleanToken.slice(0, 6));
    console.log("received hash :", hash);
    console.log("computed hash :", computedHash);
    console.log("match:", computedHash === hash);

    if (computedHash !== hash) return null;

    const authDate = Number(urlParams.get("auth_date"));
    if (!authDate || Date.now() / 1000 - authDate > 86400) {
      console.log("❌ auth_date expired or missing");
      return null;
    }

    const userRaw = urlParams.get("user");
    if (!userRaw) return null;

    return JSON.parse(userRaw) as TelegramUser;
  } catch (e) {
    console.log("❌ Verification threw:", e);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { initData } = await request.json();

    if (!initData || typeof initData !== "string") {
      return NextResponse.json({ error: "Missing initData" }, { status: 400 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const tgUser = verifyTelegramInitData(initData, botToken);
    if (!tgUser) {
      return NextResponse.json({ error: "Invalid Telegram signature" }, { status: 401 });
    }

    const email = `tg${tgUser.id}@1337.app`;
    const password = crypto.createHmac("sha256", botToken).update(String(tgUser.id)).digest("hex");

    const admin = createAdminClient();

    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError && !createError.message.includes("already registered")) {
      throw createError;
    }

    const supabase = await createClient();
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.user) {
      throw signInError || new Error("Sign in failed");
    }

    const userId = signInData.user.id;

    await admin.from("users").upsert(
      {
        id: userId,
        telegram_id: tgUser.id,
        username: tgUser.username || null,
        first_name: tgUser.first_name || null,
        last_name: tgUser.last_name || null,
        avatar_url: tgUser.photo_url || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    const { data: userData } = await admin
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    return NextResponse.json({
      success: true,
      role: userData?.role || null,
    });
  } catch (error) {
    console.error("Telegram auth error:", error);
    return NextResponse.json({ error: "Auth failed" }, { status: 500 });
  }
}
