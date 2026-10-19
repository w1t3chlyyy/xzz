import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { verifySiteToken } from "@/lib/siteToken";

// Вход на сайт по ссылке из бота
export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || req.url;
  const tgId = verifySiteToken(req.nextUrl.searchParams.get("t") || "");
  const botToken = process.env.TELEGRAM_BOT_TOKEN || "";
  if (!tgId || !botToken) return NextResponse.redirect(new URL("/?login=expired", base));

  const password = crypto.createHmac("sha256", botToken).update(String(tgId)).digest("hex");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: `tg${tgId}@1337.app`, password });
  if (error) return NextResponse.redirect(new URL("/?login=failed", base));
  return NextResponse.redirect(new URL("/feed", base));
}
