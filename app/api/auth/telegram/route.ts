function verifyTelegramInitData(initData: string, botToken: string) {
  // Разбиваем строку на параметры вручную
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  
  if (!hash) return null;
  
  // Удаляем hash
  params.delete("hash");
  
  // Сортируем ключи
  const sortedKeys = Array.from(params.keys()).sort();
  
  // Создаем строку для проверки
  const checkString = sortedKeys
    .map(key => `${key}=${params.get(key)}`)
    .join("\n");
  
  console.log("Check string:", checkString);
  
  // Создаем HMAC-SHA256
  const secret = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  
  const computedHash = crypto
    .createHmac("sha256", secret)
    .update(checkString)
    .digest("hex");
  
  console.log("Computed hash:", computedHash);
  console.log("Received hash:", hash);
  
  if (computedHash !== hash) return null;
  
  // Получаем user
  const userStr = params.get("user");
  if (!userStr) return null;
  
  try {
    return JSON.parse(decodeURIComponent(userStr));
  } catch {
    return JSON.parse(userStr);
  }
}
