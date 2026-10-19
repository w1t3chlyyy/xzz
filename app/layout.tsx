import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Montserrat, Unbounded, JetBrains_Mono } from "next/font/google";
import { TelegramInitializer } from "@/components/TelegramInitializer";
import { AppProvider } from "@/components/providers/AppProvider";
import "./globals.css";

const unbounded = Unbounded({ subsets: ["latin", "cyrillic"], weight: ["300", "500"], variable: "--font-unbounded", display: "swap" });
const montserrat = Montserrat({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "600", "700", "800"], variable: "--font-montserrat", display: "swap" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], weight: ["500"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "1337 — Фриланс биржа в Telegram",
  description: "Заказы, фриланс и AI-отклики в Telegram на бирже 1337",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#F4F3FA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning className={`${unbounded.variable} ${montserrat.variable} ${jetbrainsMono.variable}`}>
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="antialiased font-sans bg-[#F4F3FA] text-slate-900 min-h-screen selection:bg-purple-500/20 selection:text-purple-900">
        <TelegramInitializer />
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}

