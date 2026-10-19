import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Montserrat, Unbounded, JetBrains_Mono } from "next/font/google";
import { TelegramInitializer } from "@/components/TelegramInitializer";
import "./globals.css";
import "./site.css";

const unbounded = Unbounded({ subsets: ["latin", "cyrillic"], weight: ["300", "500"], variable: "--font-unbounded", display: "swap" });
const montserrat = Montserrat({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "600", "700", "800"], variable: "--font-montserrat", display: "swap" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], weight: ["500"], variable: "--font-mono", display: "swap" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://1337-app.vercel.app";
const TITLE = "1337 — Фриланс биржа";
const DESCRIPTION =
  "Биржа фриланса 1337: публикуйте заказы, находите исполнителей, получайте отклики с ценой и сроком и фиксируйте сделку в чате. На сайте и в Telegram.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · 1337",
  },
  description: DESCRIPTION,
  applicationName: "1337",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    type: "website",
    siteName: "1337",
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    locale: "ru_RU",
    images: [{ url: "/logo.png", alt: "1337" }],
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/logo.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F4F3FA",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning className={`${unbounded.variable} ${montserrat.variable} ${jetbrainsMono.variable}`}>
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body className="antialiased font-sans bg-[#F4F3FA] text-slate-900 min-h-screen selection:bg-purple-500/20 selection:text-purple-900">
        <TelegramInitializer />
        {children}
      </body>
    </html>
  );
}
