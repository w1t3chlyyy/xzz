import Link from "next/link";

const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "F1337Bot";
const CHANNEL = process.env.TELEGRAM_CHANNEL_URL || "https://t.me/F1337C";
const SUPPORT = process.env.NEXT_PUBLIC_SUPPORT_URL || "https://t.me/F1337H";

const sample = [
  ["Программирование", "Telegram-бот для записи клиентов", "25 000 – 40 000 ₽", "7"],
  ["Дизайн", "Макет мобильного приложения, 8 экранов", "30 000 ₽", "12"],
  ["Маркетинг", "Настройка рекламы в Telegram Ads", "от 15 000 ₽", "4"],
  ["Копирайтинг", "Тексты для лендинга и рассылки", "10 000 – 14 000 ₽", "9"],
];

const steps = [
  ["Заказчик публикует задачу", "Описание, категория и бюджет. Контакты не раскрываются, общение идёт в чатах биржи."],
  ["Исполнители откликаются", "В отклике — предложение, цена и срок. Заказчик видит все отклики и принимает один из них."],
  ["Договорённости фиксируются", "Условия сделки — сумма, срок, результат — оформляются в чате и подтверждаются обеими сторонами."],
];

const terms = [
  ["Пробный период", "5 дней, полный доступ"],
  ["Подписка Pro", "от 990 ₽ в месяц, год со скидкой 20%"],
  ["Оплата", "Telegram Stars, перевод по реквизитам, USDT через CryptoBot"],
  ["Выплаты исполнителям", "от 500 ₽, на карту или по СБП"],
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#F4F3FA] text-slate-900">
      <header className="border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-heading text-2xl">1337</span>
          <nav className="flex items-center gap-7 text-sm font-semibold text-slate-600">
            <a href="#how" className="hidden sm:inline hover:text-slate-900">Как работает</a>
            <a href="#terms" className="hidden sm:inline hover:text-slate-900">Условия</a>
            <Link href="/feed" className="btn-primary px-5 py-2 text-sm font-bold">Войти</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="max-w-6xl mx-auto px-6 py-16 md:py-24 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-700">Фриланс-биржа</p>
            <h1 className="mt-4 text-4xl md:text-5xl font-heading leading-[1.15]">Заказы и исполнители в одном месте</h1>
            <p className="mt-6 text-base text-slate-600 leading-relaxed max-w-lg">
              Биржа для разовых проектов: программирование, дизайн, маркетинг и тексты. Работает на сайте и в Telegram — аккаунт общий.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/feed" className="btn-primary px-7 py-3.5 text-sm font-bold">Начать работу</Link>
              {BOT && <a href={`https://t.me/${BOT}`} className="btn-outline px-7 py-3.5 text-sm font-bold">Открыть бота</a>}
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200 text-xs font-bold text-slate-500 flex justify-between">
                <span>Лента заказов</span>
                <span>Пример</span>
              </div>
              {sample.map(([cat, title, budget, n]) => (
                <div key={title} className="px-5 py-4 border-b border-slate-100 last:border-0 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-violet-700">{cat}</div>
                    <div className="mt-1 text-sm font-bold truncate">{title}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold">{budget}</div>
                    <div className="text-xs text-slate-500 mt-0.5">откликов: {n}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="border-t border-slate-200/80">
          <div className="max-w-6xl mx-auto px-6 py-16 grid lg:grid-cols-12 gap-10">
            <h2 className="lg:col-span-4 text-2xl font-heading">Как это работает</h2>
            <ol className="lg:col-span-8 divide-y divide-slate-200 border-y border-slate-200">
              {steps.map(([t, d], i) => (
                <li key={t} className="py-6 flex gap-6">
                  <span className="font-heading text-2xl text-slate-300 w-8 shrink-0">{i + 1}</span>
                  <div>
                    <h3 className="text-base font-bold">{t}</h3>
                    <p className="mt-1.5 text-sm text-slate-600 leading-relaxed max-w-xl">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="terms" className="border-t border-slate-200/80">
          <div className="max-w-6xl mx-auto px-6 py-16 grid lg:grid-cols-12 gap-10">
            <h2 className="lg:col-span-4 text-2xl font-heading">Условия</h2>
            <dl className="lg:col-span-8 divide-y divide-slate-200 border-y border-slate-200">
              {terms.map(([k, v]) => (
                <div key={k} className="py-4 grid sm:grid-cols-3 gap-1 sm:gap-6 text-sm">
                  <dt className="font-bold">{k}</dt>
                  <dd className="sm:col-span-2 text-slate-600">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/80">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500">
          <span className="font-heading text-lg text-slate-900">1337</span>
          <div className="flex gap-6 font-semibold">
            <a href={CHANNEL} className="hover:text-slate-900">Канал</a>
            <a href={SUPPORT} className="hover:text-slate-900">Поддержка</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
