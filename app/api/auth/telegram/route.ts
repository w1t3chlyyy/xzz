import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function verifyTelegramInitData(initData: string, botToken: string) {
  try {
    // 1. Парсим параметры
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get("hash");
    
    if (!hash) {
      console.log("❌ No hash in initData");
      return null;
    }
    
    // 2. Удаляем hash из параметров
    urlParams.delete("hash");
    
    // 3. Сортируем ключи и создаем строку для проверки
    const keys = Array.from(urlParams.keys()).sort();
    const dataCheckString = keys
      .map(key => `${key}=${urlParams.get(key)}`)
      .join("\n");
    
    console.log("📝 DATA CHECK STRING:");
    console.log(dataCheckString);
    console.log("---");
    
    // 4. Вычисляем хеш по алгоритму Telegram
    // Сначала создаем HMAC ключ
    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();
    
    // Затем вычисляем хеш от dataCheckString
    const computedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");
    
    console.log("📥 Received hash:", hash);
    console.log("📤 Computed hash:", computedHash);
    console.log("✅ Match:", computedHash === hash);
    
    // 5. Сравниваем
    if (computedHash !== hash) {
      console.log("❌ Hash mismatch!");
      return null;
    }
    
    // 6. Получаем данные пользователя
    const userParam = urlParams.get("user");
    if (!userParam) {
      console.log("❌ No user param");
      return null;
    }
    
    // 7. Парсим JSON (может быть закодирован)
    let user;
    try {
      user = JSON.parse(decodeURIComponent(userParam));
    } catch {
      try {
        user = JSON.parse(userParam);
      } catch (e) {
        console.log("❌ Failed to parse user JSON");
        return null;
      }
    }
    
    console.log("✅ User verified:", user.id, user.username);
    return user;
    
  } catch (error) {
    console.log("❌ Verification error:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("📦 Body keys:", Object.keys(body));
    
    let { initData } = body;
    
    if (!initData) {
      console.log("❌ No initData in request");
      return NextResponse.json(
        { error: "Missing initData" },
        { status: 400 }
      );
    }
    
    // Если initData пришла как объект - конвертируем
    if (typeof initData === 'object') {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(initData)) {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      }
      initData = params.toString();
      console.log("🔄 Converted object to string");
    }
    
    console.log("📦 initData type:", typeof initData);
    console.log("📦 initData length:", initData.length);
    console.log("📦 initData preview:", initData.substring(0, 100) + "...");
    
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      console.log("❌ No bot token in environment");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }
    
    console.log("🔑 Bot token prefix:", botToken.substring(0, 10) + "...");
    console.log("🔑 Bot token length:", botToken.length);
    
    // Пробуем проверить с сырыми данными
    let tgUser = verifyTelegramInitData(initData, botToken);
    
    // Если не получилось, пробуем декодировать
    if (!tgUser) {
      console.log("🔄 Trying with decoded data...");
      try {
        const decoded = decodeURIComponent(initData);
        tgUser = verifyTelegramInitData(decoded, botToken);
      } catch (e) {
        console.log("❌ Decode failed");
      }
    }
    
    if (!tgUser) {
      console.log("❌ Verification failed");
      return NextResponse.json(
        { error: "Invalid Telegram signature" },
        { status: 401 }
      );
    }
    
    console.log("✅ Verification successful!");
    
    // Дальше код создания пользователя...
    const email = `tg${tgUser.id}@fiolet.app`;
    const password = crypto
      .createHmac("sha256", botToken)
      .update(String(tgUser.id))
      .digest("hex");
    
    const admin = createAdminClient();
    
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    
    if (createError && !createError.message.includes("already registered")) {
      console.error("❌ Create user error:", createError);
      throw createError;
    }
    
    const supabase = createClient();
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
      .select("role, subscription")
      .eq("id", userId)
      .single();
    
    return NextResponse.json({
      success: true,
      user: {
        id: tgUser.id,
        username: tgUser.username,
        first_name: tgUser.first_name,
        last_name: tgUser.last_name,
        avatar_url: tgUser.photo_url,
        role: userData?.role || null,
        subscription: userData?.subscription || null,
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
