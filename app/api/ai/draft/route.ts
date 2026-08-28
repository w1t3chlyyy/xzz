import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Проверяем подписку
    const { data: userData } = await supabase
      .from("users")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    if (userData?.subscription_tier !== "ai_pro") {
      return NextResponse.json(
        { error: "AI Pro subscription required" },
        { status: 403 }
      );
    }

    const { orderTitle, orderDescription, category } = await request.json();

    // Генерируем черновик через OpenRouter (или OpenAI)
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL!,
      },
      body: JSON.stringify({
        model: "anthropic/claude-3-haiku",
        messages: [
          {
            role: "system",
            content: `Ты — профессиональный фрилансер. Напиши краткий, убедительный отклик на заказ. 
            Отклик должен быть на русском языке, 2-3 предложения, профессиональный тон.`,
          },
          {
            role: "user",
            content: `Заказ: ${orderTitle}\nОписание: ${orderDescription}\nКатегория: ${category}\n\nНапиши отклик:`,
          },
        ],
        max_tokens: 200,
      }),
    });

    const data = await response.json();
    const draft = data.choices?.[0]?.message?.content || "Здравствуйте! Я заинтересован в вашем проекте и готов приступить к работе.";

    return NextResponse.json({ draft });
  } catch (error) {
    console.error("AI draft error:", error);
    return NextResponse.json(
      { draft: "Здравствуйте! Я заинтересован в вашем проекте и готов приступить к работе." },
      { status: 200 }
    );
  }
}
