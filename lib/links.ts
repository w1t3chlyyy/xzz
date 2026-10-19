export function openTelegramUrl(url: string) {
  if (typeof window === "undefined") return;
  const tg: any = (window as any).Telegram?.WebApp;
  try {
    if (tg?.openTelegramLink && /^https:\/\/t\.me\//.test(url)) {
      tg.openTelegramLink(url);
      return;
    }
  } catch {
    // fallthrough
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
