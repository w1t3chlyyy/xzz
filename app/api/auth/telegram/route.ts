import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function verifyTelegramInitData(initData: string, botToken: string) {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get("hash");
    
    if (!hash) {
      console.log("❌ No hash in initData");
      return null;
    }
    
    urlParams.delete("hash");
    
    // ВАЖНО: user должен быть JSON строкой, а не объектом
    // Если user пришёл как объект - конвертируем в JSON строку
    let userParam = urlParams.get("user");
    if (userParam && userParam.startsWith('{') && !userParam.startsWith('{"')) {
      // Парсим и сразу преобразуем обратно в JSON строку
      try {
        const userObj = JSON.parse(userParam);
        userParam = JSON.stringify(userObj);
        // Обновляем параметр
        urlParams.set("user", userParam);
        console.log("🔄 Converted user object to JSON string");
      } catch (e) {
        console.log("❌ Failed to parse user");
      }
    }
    
    const keys = Array.from(urlParams.keys()).sort();
    const dataCheckString = keys
      .map(key => `${key}=${urlParams.get(key)}`)
      .join("\n");
    
    console.log("📝 DATA CHECK STRING:");
    console.log(dataCheckString);
    console.log("---");
    
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
    if (!userRaw) {
      console.log("❌ No user param");
      return null;
    }
    
    let user;
    try {
      user = JSON.parse(userRaw);
    } catch (e) {
      console.log("❌ Failed to parse user JSON");
      return null;
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
    
    // Если initData пришла как объект - конвертируем в строку
    if (typeof initData === 'object' && initData !== null) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(initData)) {
        if (value !== undefined && value !== null) {
          // Если value - объект, конвертируем в JSON строку
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
    
    // Если initData закодирована - декодируем
    try {
      const decoded = decodeURIComponent(initData);
      if (decoded !== initData) {
        initData = decoded;
        console.log("🔄 Decoded URL encoding");
      }
    } catch (e) {}
    
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
    
    console.log("✅ Verification successful for user:", tgUser.id);
    
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
