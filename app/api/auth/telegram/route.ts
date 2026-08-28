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

  // ПРАВИЛЬНЫЙ алгоритм проверки Telegram
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
  console.log("DEBUG bot token (first 10):", botToken.substring(0, 10) + "...");

  if (computedHash.toLowerCase() !== hash.toLowerCase()) {
    return null;
  }

  const userRaw = params.get("user");
  if (!userRaw) return null;

  try {
    return JSON.parse(decodeURIComponent(userRaw));
  } catch {
    return JSON.parse(userRaw);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { initData } = body;
    
    // Пробуем получить токен из разных мест
    let botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    // Если есть токен для этого бота (проверьте, что это правильный бот)
    console.log("DEBUG Using bot token:", botToken ? botToken.substring(0, 10) + "..." : "NOT SET");

    if (!initData || !botToken) {
      return NextResponse.json({ 
        error: "Missing initData or bot token",
        debug: { initDataLength: initData?.length, hasToken: !!botToken }
      }, { status: 400 });
    }

    // Декодируем initData если нужно
    const decodedInitData = decodeURIComponent(initData);
    const tgUser = verifyTelegramInitData(decodedInitData, botToken);
    
    if (!tgUser) {
      // Пробуем с сырыми данными
      const tgUserRaw = verifyTelegramInitData(initData, botToken);
      if (!tgUserRaw) {
        return NextResponse.json({ 
          error: "Invalid Telegram signature",
          debug: { 
            receivedHash: new URLSearchParams(decodedInitData).get("hash"),
            botTokenPrefix: botToken.substring(0, 10)
          }
        }, { status: 401 });
      }
      // Используем tgUserRaw
    }

    // ... остальной код
  } catch (error) {
    console.error("Telegram auth error:", error);
    return NextResponse.json({ error: "Auth failed" }, { status: 500 });
  }
}
