import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function verifyTelegramInitData(initData: string, botToken: string) {
  // Парсим параметры
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  
  if (!hash) {
    console.log("❌ No hash found");
    return null;
  }
  
  // Удаляем hash из параметров
  params.delete("hash");
  
  // Получаем все ключи и сортируем их
  const keys = Array.from(params.keys()).sort();
  
  // Создаем строку для проверки (ключи и значения через =, разделенные \n)
  const dataCheckString = keys
    .map(key => `${key}=${params.get(key)}`)
    .join("\n");
  
  console.log("📝 Data check string:", dataCheckString);
  
  // Создаем HMAC-SHA256 ключ из "WebAppData" и botToken
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  
  // Вычисляем хеш
  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");
  
  console.log("📥 Received hash:", hash);
  console.log("📤 Computed hash:", computedHash);
  console.log("✅ Hashes match:", computedHash === hash);
  
  if (computedHash !== hash) {
    console.log("❌ Hash mismatch!");
    return null;
  }
  
  // Получаем данные пользователя
  const userRaw = params.get("user");
  if (!userRaw) {
    console.log("❌ No user data");
    return null;
  }
  
  try {
    const user = JSON.parse(userRaw);
    console.log("✅ User verified:", user.id, user.username);
    return user;
  } catch (e) {
    console.log("❌ Failed to parse user:", e);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { initData } = body;
    
    console.log("🔍 Request received");
    console.log("📦 initData type:", typeof initData);
    console.log("📦 initData length:", initData?.length);
    
    // Если initData пришла как объект, конвертируем в строку
    if (typeof initData === 'object' && initData !== null) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(initData)) {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      }
      initData = params.toString();
      console.log("🔄 Converted object to string");
    }
    
    // Декодируем URL-кодирование если есть
    try {
      const decoded = decodeURIComponent(initData);
      if (decoded !== initData) {
        initData = decoded;
        console.log("🔄 Decoded URL encoding");
      }
    } catch (e) {
      // Не было URL-кодирования
    }
    
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!initData) {
      console.log("❌ No initData");
      return NextResponse.json(
        { error: "Missing initData" },
        { status: 400 }
      );
    }
    
    if (!botToken) {
      console.log("❌ No bot token in env");
      return NextResponse.json(
        { error: "Bot token not configured" },
        { status: 500 }
      );
    }
    
    console.log("🔑 Bot token prefix:", botToken.substring(0, 10) + "...");
    
    const tgUser = verifyTelegramInitData(initData, botToken);
    
    if (!tgUser) {
      console.log("❌ Verification failed");
      return NextResponse.json(
        { error: "Invalid Telegram signature" },
        { status: 401 }
      );
    }
    
    console.log("✅ Verification successful for user:", tgUser.id);
    
    // Создаём email и пароль
    const email = `tg${tgUser.id}@fiolet.app`;
    const password = crypto
      .createHmac("sha256", botToken)
      .update(String(tgUser.id))
      .digest("hex");
    
    const admin = createAdminClient();
    
    // Создаём пользователя
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    
    if (createError && !createError.message.includes("already registered")) {
      console.log("❌ Create user error:", createError);
      throw createError;
    }
    
    if (createError?.message.includes("already registered")) {
      console.log("ℹ️ User already exists");
    } else {
      console.log("✅ User created");
    }
    
    // Авторизуем
    const supabase = createClient();
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (signInError || !signInData.user) {
      console.log("❌ Sign in error:", signInError);
      throw signInError || new Error("Sign in failed");
    }
    
    console.log("✅ User signed in:", signInData.user.id);
    
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
    
    console.log("✅ Profile updated");
    
    const { data: userData } = await admin
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();
    
    console.log("✅ Auth complete, role:", userData?.role);
    
    return NextResponse.json({
      success: true,
      role: userData?.role || null,
      user: {
        id: tgUser.id,
        username: tgUser.username,
        first_name: tgUser.first_name,
      },
    });
    
  } catch (error) {
    console.error("❌ Telegram auth error:", error);
    return NextResponse.json(
      { error: "Auth failed" },
      { status: 500 }
    );
  }
}
