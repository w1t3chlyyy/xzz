import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function verifyTelegramInitData(initData: string, botToken: string) {
  // Парсим данные
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  
  if (!hash) {
    console.log("ERROR: No hash found");
    return null;
  }
  
  // Удаляем hash из параметров
  params.delete("hash");
  
  // Сортируем ключи и создаем строку для проверки
  // ВАЖНО: ключи должны быть отсортированы по алфавиту
  const keys = Array.from(params.keys()).sort();
  const dataCheckString = keys
    .map(key => `${key}=${params.get(key)}`)
    .join("\n");
  
  console.log("DEBUG dataCheckString:", dataCheckString);
  
  // Telegram WebApp использует этот алгоритм:
  // 1. Сначала создаем SHA256 хеш от botToken
  const secretKey = crypto
    .createHash("sha256")
    .update(botToken)
    .digest();
  
  // 2. Затем создаем HMAC-SHA256 от dataCheckString используя secretKey
  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");
  
  console.log("DEBUG received hash:", hash);
  console.log("DEBUG computed hash:", computedHash);
  
  // Сравниваем хеши
  if (computedHash !== hash) {
    console.log("ERROR: Hash mismatch!");
    return null;
  }
  
  // Получаем данные пользователя
  const userRaw = params.get("user");
  if (!userRaw) {
    console.log("ERROR: No user data");
    return null;
  }
  
  try {
    // Парсим JSON пользователя
    const user = JSON.parse(userRaw);
    console.log("DEBUG User verified:", user);
    return user;
  } catch (e) {
    console.log("ERROR: Failed to parse user:", e);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { initData } = body;
    
    console.log("DEBUG initData length:", initData?.length);
    
    // Если данные пришли закодированными, декодируем
    try {
      initData = decodeURIComponent(initData);
    } catch (e) {
      // Если не получилось, оставляем как есть
    }
    
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!initData || !botToken) {
      return NextResponse.json(
        { error: "Missing initData or bot token" },
        { status: 400 }
      );
    }
    
    const tgUser = verifyTelegramInitData(initData, botToken);
    
    if (!tgUser) {
      return NextResponse.json(
        { error: "Invalid Telegram signature" },
        { status: 401 }
      );
    }
    
    // Создаём email и пароль для пользователя
    const email = `tg${tgUser.id}@fiolet.app`;
    const password = crypto
      .createHmac("sha256", botToken)
      .update(String(tgUser.id))
      .digest("hex");
    
    const admin = createAdminClient();
    
    // Создаём пользователя если его нет
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    
    if (createError && !createError.message.includes("already registered")) {
      console.error("Create user error:", createError);
      throw createError;
    }
    
    // Авторизуем пользователя
    const supabase = createClient();
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (signInError || !signInData.user) {
      console.error("Sign in error:", signInError);
      throw signInError || new Error("Sign in failed");
    }
    
    const userId = signInData.user.id;
    
    // Обновляем профиль
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
      role: userData?.role || null 
    });
    
  } catch (error) {
    console.error("Telegram auth error:", error);
    return NextResponse.json(
      { error: "Auth failed" },
      { status: 500 }
    );
  }
}
