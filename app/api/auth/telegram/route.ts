import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function verifyTelegramInitData(initData: string, botToken: string) {
  try {
    // Декодируем
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
    
    // ===== КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ =====
    // Получаем user и принудительно преобразуем в JSON строку
    let userParam = urlParams.get("user");
    if (userParam) {
      try {
        // Пробуем разные способы парсинга
        let userObj = null;
        
        // Способ 1: Прямой парсинг
        try {
          userObj = JSON.parse(userParam);
        } catch (e) {}
        
        // Способ 2: Если не получилось, пробуем через eval (только для отладки!)
        if (!userObj) {
          try {
            // Заменяем переносы и лишние пробелы
            let cleaned = userParam
              .replace(/\n/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            
            // Если есть ключи без кавычек - добавляем кавычки
            cleaned = cleaned.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
            
            userObj = JSON.parse(cleaned);
          } catch (e) {}
        }
        
        // Способ 3: Ручная сборка из строки
        if (!userObj) {
          // Извлекаем значения вручную
          const idMatch = userParam.match(/id:\s*(\d+)/);
          const firstNameMatch = userParam.match(/first_name:\s*"([^"]*)"/);
          const lastNameMatch = userParam.match(/last_name:\s*"([^"]*)"/);
          const usernameMatch = userParam.match(/username:\s*"([^"]*)"/);
          const languageMatch = userParam.match(/language_code:\s*"([^"]*)"/);
          const premiumMatch = userParam.match(/is_premium:\s*(true|false)/);
          const photoMatch = userParam.match(/photo_url:\s*"([^"]*)"/);
          
          userObj = {
            id: idMatch ? parseInt(idMatch[1]) : null,
            first_name: firstNameMatch ? firstNameMatch[1] : null,
            last_name: lastNameMatch ? lastNameMatch[1] : null,
            username: usernameMatch ? usernameMatch[1] : null,
            language_code: languageMatch ? languageMatch[1] : null,
            is_premium: premiumMatch ? premiumMatch[1] === 'true' : false,
            photo_url: photoMatch ? photoMatch[1] : null,
            allows_write_to_pm: true,
          };
          
          console.log("🔄 User parsed manually");
        }
        
        if (userObj) {
          // Преобразуем в правильный JSON без пробелов
          userParam = JSON.stringify(userObj);
          urlParams.set("user", userParam);
          console.log("✅ User converted to proper JSON");
        }
      } catch (e) {
        console.log("❌ Failed to parse user:", e);
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
