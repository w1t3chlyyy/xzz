import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // If user is authenticated, check subscription tier
    if (user) {
      const { data: userData } = await supabase
        .from("users")
        .select("subscription_tier")
        .eq("id", user.id)
        .single();

      if (userData && userData.subscription_tier && userData.subscription_tier !== "ai_pro" && userData.subscription_tier !== "free") {
        // allow free testing if in preview or if user has tier
      }
    }

    const { orderTitle, orderDescription, category } = await request.json();
    const prompt = `Ты — профессиональный фрилансер. Напиши краткий, убедительный отклик на заказ.
Отклик должен быть на русском языке, 2-3 предложения, вежливый и профессиональный тон.
Заказ: ${orderTitle || "Проект"}
Описание: ${orderDescription || "Без описания"}
Категория: ${category || "Общая"}

Напиши отклик:`;

    // 1. Try Gemini API
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });
        if (response.text) {
          return NextResponse.json({ draft: response.text.trim() });
        }
      } catch (geminiErr) {
        console.warn("Gemini draft error:", geminiErr);
      }
    }

    // 2. Try OpenRouter if configured
    if (process.env.OPENROUTER_API_KEY) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            ...(process.env.NEXT_PUBLIC_SITE_URL ? { "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL } : {}),
          },
          body: JSON.stringify({
            model: "anthropic/claude-3-haiku",
            messages: [
              {
                role: "system",
                content: "Ты — профессиональный фрилансер. Напиши краткий, убедительный отклик на заказ. Отклик должен быть на русском языке, 2-3 предложения, профессиональный тон.",
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
        const draft = data.choices?.[0]?.message?.content;
        if (draft) {
          return NextResponse.json({ draft: draft.trim() });
        }
      } catch (openRouterErr) {
        console.warn("OpenRouter draft error:", openRouterErr);
      }
    }

    // Default high-quality template fallback
    const fallbackDraft = `Здравствуйте! Меня заинтересовал ваш проект «${orderTitle || "по этой задаче"}». Имею большой опыт в категории ${category || "фриланса"}, готов качественно выполнить работу в согласованные сроки. Буду рад обсудить детали!`;

    return NextResponse.json({ draft: fallbackDraft });
  } catch (error) {
    console.error("AI draft error:", error);
    return NextResponse.json(
      { draft: "Здравствуйте! Я заинтересован в вашем проекте и готов качественно выполнить поставленную задачу в срок." },
      { status: 200 }
    );
  }
}
