import crypto from "crypto";

// Одноразово-временная ссылка для входа на сайт из бота (живёт 10 минут)
const key = () => crypto.createHash("sha256").update("site-login:" + (process.env.TELEGRAM_BOT_TOKEN || "")).digest();
const mac = (p: string) => crypto.createHmac("sha256", key()).update(p).digest("base64url");

export function signSiteToken(tgId: number, ttlSec = 600): string {
  const p = `${tgId}.${Math.floor(Date.now() / 1000) + ttlSec}`;
  return `${p}.${mac(p)}`;
}

export function verifySiteToken(token: string): number | null {
  const [id, exp, sig] = (token || "").split(".");
  if (!id || !exp || !sig) return null;
  const good = mac(`${id}.${exp}`);
  if (good.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(good), Buffer.from(sig))) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  return Number(id) || null;
}
