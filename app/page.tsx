import Link from "next/link";
import "./landing.css";
import { Hero } from "@/components/landing/Hero";

import { Effects } from "@/components/landing/Effects";
import { Audience } from "@/components/landing/Audience";

const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "F1337Bot";
const CHANNEL = process.env.TELEGRAM_CHANNEL_URL || "https://t.me/F1337C";
const SUPPORT = process.env.NEXT_PUBLIC_SUPPORT_URL || "https://t.me/F1337H";

const facts: [string, string, string][] = [
  ["5", "дней", "бесплатного доступа"],
  ["4", "направления", "работ на бирже"],
  ["3", "способа", "оплаты подписки"],
  ["500", "₽", "минимальный вывод"],
];
const dirs: [string, string][] = [
  ["Программирование", "Telegram-боты и Mini Apps"],
  ["Дизайн", "UI/UX, баннеры и айдентика"],
  ["Маркетинг", "Трафик, SMM и реклама"],
  ["Копирайтинг", "Тексты, сценарии и посты"],
];
const steps: [string, string][] = [
  ["Регистрация в боте", "Нажмите /start, выберите роль — заказчик или исполнитель. Для исполнителя ещё направление."],
  ["Сайт или Mini App", "Продолжайте там, где удобнее: аккаунт, заказы и чаты общие."],
  ["Заказ и отклики", "Заказчик публикует задачу, исполнители присылают предложения с ценой и сроком."],
  ["Сделка", "Условия фиксируются в чате, после выполнения заказчик подтверждает завершение."],
];
const feats = [
  "Неограниченные отклики на заказы",
  "Общение в защищённых чатах 1337",
  "Приоритетное отображение в ленте специалистов",
  "Значок верифицированного PRO-специалиста",
  "Уведомления о новых заказах",
  "Без комиссии биржи за сделки",
];
const faq: [string, string][] = [
  ["Как начать?", "Откройте бота, нажмите /start и выберите роль. После регистрации бот предложит открыть сайт или остаться в Mini App."],
  ["Что происходит после 5 бесплатных дней?", "Для откликов, публикации заказов и чатов нужна подписка Pro. Оплатить можно Telegram Stars, переводом по реквизитам или в USDT через CryptoBot."],
  ["Можно ли пользоваться и сайтом, и Telegram?", "Да. Это один аккаунт: заказы, отклики, чаты и баланс одинаковы везде."],
  ["Как исполнитель получает деньги?", "Начисления отображаются на балансе в профиле. Вывод — от 500 ₽ на карту или по СБП, заявку обрабатывает администратор."],
  ["Видны ли мои контакты?", "Нет. Общение с заказчиками и исполнителями идёт внутри чатов биржи."],
];

export default function Landing() {
  return (
    <div className="bg-white text-slate-900">
      <Effects />
      <Hero />

      <section className="border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4">
          {facts.map(([n, u, d], i) => (
            <div key={d} data-reveal style={{ ["--d" as any]: `${i * 0.08}s` }} className="py-10 md:px-6 border-slate-200 md:border-l first:border-l-0">
              <div className="flex items-baseline gap-2">
                <span data-count={n} className="font-heading text-4xl md:text-5xl">0</span>
                <span className="text-sm font-bold text-violet-700">{u}</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="roles" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 data-reveal className="text-3xl md:text-4xl font-heading max-w-2xl leading-tight mb-10">Что получает каждая сторона</h2>
          <div data-reveal><Audience /></div>
        </div>
      </section>

      <section className="py-24 bg-neutral-50 rounded-[2.5rem] mx-3 md:mx-6">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4">
            <h2 data-reveal className="text-3xl md:text-4xl font-heading leading-tight">Путь от заявки до сделки</h2>
            <p data-reveal className="mt-4 text-sm text-slate-600 leading-relaxed max-w-sm">Четыре шага, без лишних согласований и поиска контактов.</p>
          </div>
          <ol data-reveal className="lg:col-span-8 relative space-y-9">
            <span className="steps-line" />
            {steps.map(([t, d], i) => (
              <li key={t} className="relative pl-14">
                <span className="absolute left-0 top-0 w-[31px] h-[31px] rounded-full bg-white border border-violet-600 text-violet-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                <h3 className="text-lg font-bold">{t}</h3>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed max-w-xl">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 data-reveal className="text-3xl md:text-4xl font-heading leading-tight mb-10">Направления</h2>
          <ul>
            {dirs.map(([t, s], i) => (
              <li key={t} data-reveal style={{ ["--d" as any]: `${i * 0.07}s` }} className="dir bg-white border border-slate-200 rounded-[1.75rem] px-7 py-6 mb-3 flex items-center justify-between gap-6">
                <div>
                  <h3 className="text-xl md:text-2xl font-heading">{t}</h3>
                  <p className="mt-1 text-sm text-slate-500">{s}</p>
                </div>
                <span className="arr text-2xl text-violet-700">→</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="pro" className="py-24 bg-black text-white rounded-[2.5rem] mx-3 md:mx-6">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <p data-reveal className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300">Тариф Pro</p>
            <h2 data-reveal className="mt-4 text-3xl md:text-4xl font-heading leading-tight">Один тариф, без скрытых платежей</h2>
            <div data-reveal className="mt-8 flex items-baseline gap-3">
              <span className="font-heading text-6xl">990</span>
              <span className="text-white/70 text-sm">₽ в месяц · год со скидкой 20%</span>
            </div>
            <p data-reveal className="mt-4 text-sm text-white/60 leading-relaxed">Первые 5 дней — бесплатно, без привязки карты. Оплата: Telegram Stars, перевод по реквизитам, USDT через CryptoBot.</p>
            <Link data-reveal href="/feed" className="lp-btn-light mt-8 px-8 py-4 text-sm font-bold">Попробовать бесплатно</Link>
          </div>
          <ul className="lg:col-span-7 divide-y divide-white/15 border-y border-white/15 self-start">
            {feats.map((f, i) => (
              <li key={f} data-reveal style={{ ["--d" as any]: `${i * 0.06}s` }} className="py-4 flex items-center gap-4 text-sm md:text-base">
                <span className="text-violet-300 font-heading text-sm w-6">{String(i + 1).padStart(2, "0")}</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="faq" className="py-24">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-12 gap-12">
          <h2 data-reveal className="lg:col-span-4 text-3xl md:text-4xl font-heading leading-tight">Частые вопросы</h2>
          <div data-reveal className="lg:col-span-8">
            {faq.map(([q, a]) => (
              <details key={q} className="faq bg-white border border-slate-200 rounded-[1.75rem] px-7 py-5 mb-3">
                <summary className="flex items-center justify-between gap-6 text-base font-bold">
                  {q}
                  <span className="pm text-2xl text-violet-700 leading-none">+</span>
                </summary>
                <p className="ans mt-3 text-sm text-slate-600 leading-relaxed max-w-2xl">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div data-reveal className="max-w-6xl mx-auto bg-black text-white rounded-[2.5rem] px-8 py-14 md:px-14 flex flex-wrap items-center justify-between gap-8">
          <h2 className="text-2xl md:text-3xl font-heading max-w-lg leading-tight">Зарегистрируйтесь в боте за минуту</h2>
          <a href={`https://t.me/${BOT}`} className="lp-btn-light px-8 py-4 text-sm font-bold">Открыть бота</a>
        </div>
      </section>

      <footer className="border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-wrap items-start justify-between gap-8 text-sm text-slate-500">
          <div>
            <span className="font-heading text-xl text-slate-900">1337</span>
            <p className="mt-3">ИНН 920004048610 · +7 978 468-21-44</p>
          </div>
          <div className="flex gap-8 font-semibold">
            <Link href="/offer" className="hover:text-slate-900">Публичная оферта</Link>
            <a href={CHANNEL} className="hover:text-slate-900">Канал</a>
            <a href={SUPPORT} className="hover:text-slate-900">Поддержка</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
