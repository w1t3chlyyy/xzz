"use client";

import { useState } from "react";

const DATA = {
  client: {
    label: "Заказчикам",
    lead: "Опишите задачу один раз — исполнители придут сами.",
    items: [
      ["Публикация заказа", "Заголовок, подробное ТЗ, категория и вилка бюджета. Готовые шаблоны для типовых задач."],
      ["Отклики с ценой и сроком", "Каждый исполнитель предлагает свою стоимость и дедлайн. Вы видите все предложения в одном списке."],
      ["Выбор исполнителя", "Принимайте или отклоняйте отклики на сайте или прямо в боте — исполнитель получит уведомление."],
      ["Чат и сделка", "Обсуждайте детали в защищённом чате и фиксируйте сумму, срок и результат. Завершение сделки подтверждаете вы."],
    ],
  },
  executor: {
    label: "Исполнителям",
    lead: "Лента заказов, портфолио и выплаты — без поиска по чатам.",
    items: [
      ["Лента заказов", "Фильтр по категории, сортировка по бюджету, закладки. Новые заказы приходят уведомлением в Telegram."],
      ["Резюме и портфолио", "Специализация, ставка, навыки и кейсы со ссылками. Заказчики видят их в каталоге специалистов."],
      ["Отклики", "Предложение, цена и срок. Свой отклик можно отозвать, пока он не принят."],
      ["Выплаты", "Баланс в профиле и вывод от 500 ₽ на карту или по СБП."],
    ],
  },
} as const;

export function Audience() {
  const [tab, setTab] = useState<keyof typeof DATA>("client");
  const d = DATA[tab];
  return (
    <div>
      <div className="inline-flex border border-slate-300 rounded-full p-1 bg-white">
        {(Object.keys(DATA) as (keyof typeof DATA)[]).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={`px-5 py-2 rounded-full text-sm font-bold transition-colors ${tab === k ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"}`}>
            {DATA[k].label}
          </button>
        ))}
      </div>
      <div key={tab} className="tab-pane mt-8 grid lg:grid-cols-12 gap-8">
        <p className="lg:col-span-4 text-xl font-heading leading-snug">{d.lead}</p>
        <dl className="lg:col-span-8 grid sm:grid-cols-2 gap-x-10 gap-y-8">
          {d.items.map(([t, s]) => (
            <div key={t} className="bg-white border border-slate-200 rounded-[1.75rem] p-6">
              <dt className="text-sm font-bold">{t}</dt>
              <dd className="mt-2 text-sm text-slate-600 leading-relaxed">{s}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
