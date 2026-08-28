import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function verifyTelegramInitData(initData: string, botToken: string) {
  try {
    // Сначала пробуем декодировать
    let decoded = initData;
    try {
      decoded = decodeURIComponent(initData);
    } catch (e) {}
    
    const urlParams = new URLSearchParams(decoded);
    const hash = urlParams.get("hash");
    
    if (!hash) {
      console.log("❌ No hash");
      return null;
    }
    
    urlParams.delete("hash");
    
    // ===== ГЛАВНОЕ ИСПРАВЛЕНИЕ =====
    // Получаем user и преобразуем в правильный JSON
    let userParam = urlParams.get("user");
    if (userParam) {
      try {
        // Пробуем парсить как JSON
        const userObj = JSON.parse(userParam);
        // Преобразуем обратно в строку без пробелов и переносов
        userParam = JSON.stringify(userObj);
        // Обновляем параметр
        urlParams.set("user", userParam);
        console.log("🔄 User converted to proper JSON");
      } catch (e) {
        // Если не получилось, пробуем исправить вручную
        try {
          // Удаляем переносы строк и лишние пробелы
          let cleaned = userParam
            .replace(/\n/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          
          // Если это не полный JSON, оборачиваем в фигурные скобки
          if (!cleaned.startsWith('{')) {
            cleaned = '{' + cleaned + '}';
          }
          
          const userObj = JSON.parse(cleaned);
          userParam = JSON.stringify(userObj);
          urlParams.set("user", userParam);
          console.log("🔄 User cleaned and converted");
        } catch (e2) {
          console.log("❌ Failed to parse user:", e2);
        }
      }
    }
    // ===== КОНЕЦ ИСПРАВЛЕНИЯ =====
    
    // Создаем dataCheckString
    const keys = Array.from(urlParams.keys()).sort();
    const dataCheckString = keys
      .map(key => `${key}=${urlParams.get(key)}`)
      .join("\n");
    
    console.log("📝 DATA CHECK STRING:");
    console.log(dataCheckString);
    console.log("---");
    
    // Вычисляем хеш
    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();
    
    const computedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");
    
    console.log("📥 Received hash:", hash);
    console.log("📤 Computed hash:", computedHash);
    console.log("✅ Match:", computedHash === hash);
    
    if (computedHash !== hash) {
      console.log("❌ Hash mismatch!");
      return null;
    }
    
    // Получаем пользователя
    const userRaw = urlParams.get("user");
    if (!userRaw) return null;
    
    try {
      const user = JSON.parse(userRaw);
      console.log("✅ User verified:", user.id, user.username);
      return user;
    } catch (e) {
      console.log("❌ Failed to parse final user");
      return null;
    }
    
  } catch (error) {
    console.log("❌ Verification error:", error);
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
    
    if (!initData) {
      return NextResponse.json(
        { error: "Missing initData" },
        { status: 400 }
      );
    }
    
    // Если initData пришла как объект
    if (typeof initData === 'object' && initData !== null) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(initData)) {
        if (value !== undefined && value !== null) {
          if (typeof value === 'object') {
            params.append(key, JSON.stringify(value));
          } else {
            params.append(key, String(value));
          }
        }
      }
      initData = params.toString();
      console.log("🔄 Converted object to string");
    }
    
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }
    
    console.log("🔑 Bot token:", botToken.substring(0, 10) + "...");
    
    const tgUser = verifyTelegramInitData(initData, botToken);
    
    if (!tgUser) {
      return NextResponse.json(
        { error: "Invalid Telegram signature" },
        { status: 401 }
      );
    }
    
    console.log("✅ Verification successful!");
    
    // Создаем пользователя
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
