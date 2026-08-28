import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function verifyTelegramInitData(initData: string, botToken: string) {
  // Декодируем initData если нужно
  let decodedInitData = initData;
  try {
    decodedInitData = decodeURIComponent(initData);
  } catch (e) {
    // Если не декодируется, оставляем как есть
  }
  
  const params = new URLSearchParams(decodedInitData);
  const hash = params.get("hash");
  
  if (!hash) {
    console.log("ERROR: No hash found");
    return null;
  }
  
  params.delete("hash");
  
  // Сортируем ключи и создаем строку
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  
  console.log("DEBUG dataCheckString:", dataCheckString);
  
  // Правильный алгоритм Telegram
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  
  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");
  
  console.log("DEBUG received hash:", hash);
  console.log("DEBUG computed hash:", computedHash);
  
  if (computedHash !== hash) {
    return null;
  }
  
  const userRaw = params.get("user");
  if (!userRaw) {
    console.log("ERROR: No user data");
    return null;
  }
  
  try {
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
    
    console.log("DEBUG initData exists:", !!initData);
    
    // Если initData пришла как объект, конвертируем в строку
    if (typeof initData === 'object' && initData !== null) {
      const params = new URLSearchParams();
      Object.keys(initData).forEach(key => {
        if (key !== 'hash') {
          params.append(key, initData[key]);
        }
      });
      if (initData.hash) {
        params.append('hash', initData.hash);
      }
      initData = params.toString();
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
