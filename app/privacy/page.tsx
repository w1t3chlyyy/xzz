import Link from "next/link";
import type { Metadata } from "next";
import { ExternalLink, ShieldCheck, ArrowLeft, Lock } from "lucide-react";

export const metadata: Metadata = {
  title: "Политика конфиденциальности — 1337",
  description: "Политика конфиденциальности и обработки персональных данных фриланс-биржи 1337",
};

const TELEGRAPH_PRIVACY_URL = "https://telegra.ph/POLITIKA-KONFIDENCIALNOSTI-08-12-99";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://1337-app.vercel.app";

const sections = [
  {
    title: "1. Общие положения",
    paragraphs: [
      "1.1. Настоящая Политика конфиденциальности (далее — «Политика») определяет порядок обработки и защиты информации о физических лицах (далее — «Пользователи»), пользующихся сервисом и платформой «1337» (далее — «Сервис», «Оператор»), доступной на веб-сайте и в Telegram Mini App.",
      "1.2. Соблюдение конфиденциальности и защита персональных данных Пользователей является важнейшим приоритетом Сервиса.",
      "1.3. Используя Сервис, регистрируясь или совершая вход через Telegram, Пользователь выражает свое полное согласие с условиями настоящей Политики.",
      "1.4. В случае несогласия с условиями настоящей Политики Пользователь обязан немедленно прекратить использование Сервиса.",
    ],
  },
  {
    title: "2. Состав собираемой информации",
    paragraphs: [
      "2.1. Данные, предоставляемые Пользователем при авторизации через Telegram: идентификатор пользователя (Telegram ID), имя (First Name), фамилия (Last Name), имя пользователя (@username), язык интерфейса, аватар профиля.",
      "2.2. Информация, размещаемая Пользователем при использовании Сервиса: данные профиля исполнителя (навыки, ставка, портфолио, описание), текст заказов, отклики, сообщения в чатах сделок.",
      "2.3. Техническая информация: данные об устройстве, IP-адрес, тип браузера, время доступа, файлы cookie и данные сессий.",
      "2.4. Сервис не собирает и не обрабатывает специальные категории персональных данных (сведения о расовой, национальной принадлежности, политических взглядах, религиозных или философских убеждениях, состоянии здоровья).",
    ],
  },
  {
    title: "3. Цели обработки информации",
    paragraphs: [
      "3.1. Обеспечение функционирования Сервиса, регистрация и идентификация Пользователей в системе биржи.",
      "3.2. Предоставление возможности размещения заказов, отправки откликов и заключения безопасных сделок между Заказчиками и Исполнителями.",
      "3.3. Направление сервисных уведомлений, в том числе о новых заказах, статусах откликов и сообщений в чатах.",
      "3.4. Обеспечение безопасности Пользователей, предотвращение мошенничества, спама и недобросовестного использования Сервиса.",
      "3.5. Выполнение требований действующего законодательства Российской Федерации.",
    ],
  },
  {
    title: "4. Порядок и условия обработки персональных данных",
    paragraphs: [
      "4.1. Обработка персональных данных осуществляется с использованием средств автоматизации и без использования таковых в строгом соответствии с требованиями Федерального закона РФ № 152-ФЗ «О персональных данных».",
      "4.2. Персональные данные Пользователей хранятся в защищенной информационной системе и не передаются третьим лицам, за исключением случаев, предусмотренных законодательством РФ или явным согласием Пользователя.",
      "4.3. Персональные данные хранятся в течение срока, необходимого для достижения целей их обработки, либо до момента отзыва согласия Пользователем.",
    ],
  },
  {
    title: "5. Защита персональных данных",
    paragraphs: [
      "5.1. Оператор принимает необходимые правовые, организационные и технические меры для защиты персональных данных Пользователя от неправомерного или случайного доступа, уничтожения, изменения, блокирования, копирования, распространения.",
      "5.2. Доступ к персональным данным предоставляется исключительно уполномоченным администраторам Сервиса, подписавшим соглашение о неразглашении конфиденциальной информации.",
    ],
  },
  {
    title: "6. Права Пользователя",
    paragraphs: [
      "6.1. Пользователь имеет право на получение информации, касающейся обработки его персональных данных.",
      "6.2. Пользователь вправе требовать уточнения, блокирования или уничтожения своих персональных данных в случае, если данные являются неполными, устаревшими или неточными.",
      "6.3. Пользователь вправе в любой момент отозвать свое согласие на обработку персональных данных, направив соответствующее обращение в службу поддержки Сервиса.",
    ],
  },
  {
    title: "7. Изменение Политики конфиденциальности",
    paragraphs: [
      "7.1. Оператор имеет право вносить изменения в настоящую Политику конфиденциальности. Новая редакция вступает в силу с момента ее размещения на Сайте.",
      "7.2. Действующая редакция Политики всегда доступна по адресу настоящей страницы, а также в официальном документе на Telegra.ph.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F4F3FA] text-slate-900">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-heading text-2xl flex items-center gap-2">
            <span>1337</span>
          </Link>
          <div className="flex items-center gap-4 text-xs font-bold">
            <Link href="/" className="text-slate-600 hover:text-slate-900 flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>На главную</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 md:py-14">
        {/* Banner with Official Link */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-6 text-white mb-10 shadow-lg shadow-violet-500/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-extrabold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>Официальный документ</span>
            </div>
            <h2 className="text-lg font-extrabold">Политика конфиденциальности 1337</h2>
            <p className="text-xs text-violet-100 max-w-md">
              Оригинал опубликован и верифицирован в Telegra.ph
            </p>
          </div>

          <a
            href={TELEGRAPH_PRIVACY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-violet-700 font-extrabold text-xs shadow-md hover:bg-violet-50 transition-all shrink-0"
          >
            <span>Открыть в Telegra.ph</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        <div className="space-y-2 mb-8">
          <h1 className="text-3xl md:text-4xl font-heading leading-tight">Политика конфиденциальности</h1>
          <p className="text-sm text-slate-500">
            В отношении обработки и защиты персональных данных пользователей сервиса 1337
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 md:p-10 border border-slate-200/80 shadow-sm space-y-8">
          {sections.map((s) => (
            <section key={s.title} className="space-y-3">
              <h2 className="text-base md:text-lg font-bold border-b border-slate-100 pb-2 text-slate-900">
                {s.title}
              </h2>
              <div className="space-y-2.5 text-xs md:text-sm text-slate-600 leading-relaxed font-normal">
                {s.paragraphs.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>
            </section>
          ))}

          <section className="pt-4 border-t border-slate-200 space-y-3">
            <h2 className="text-base md:text-lg font-bold text-slate-900">Контактная информация Оператора</h2>
            <div className="text-xs md:text-sm text-slate-600 space-y-1">
              <p><b>Сервис:</b> 1337 Фриланс биржа</p>
              <p><b>ИНН:</b> 920004048610</p>
              <p><b>Контактный телефон:</b> +7 978 468-21-44</p>
              <p>
                <b>Официальный текст:</b>{" "}
                <a
                  href={TELEGRAPH_PRIVACY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-600 font-bold hover:underline inline-flex items-center gap-1"
                >
                  <span>{TELEGRAPH_PRIVACY_URL}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
