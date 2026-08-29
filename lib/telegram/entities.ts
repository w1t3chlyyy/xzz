// lib/telegram/entities.ts
//
// Когда админ набирает текст /setwelcome прямо в Telegram (с жирным,
// курсивом, премиум-эмодзи и т.д.), Telegram присылает боту "чистый" текст
// (msg.text / msg.caption) отдельно от разметки — разметка приходит
// в виде массива entities (смещение + длина + тип). Чтобы такое же
// форматирование потом воспроизвести в исходящем sendMessage/sendPhoto
// с parse_mode: "HTML", нужно самим собрать HTML-строку из текста + entities.
//
// Премиум-эмодзи в Telegram — это entity типа "custom_emoji" с полем
// custom_emoji_id; в HTML он передаётся тегом <tg-emoji emoji-id="...">.

export interface TelegramMessageEntity {
  type: string;
  offset: number;
  length: number;
  url?: string;
  custom_emoji_id?: string;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function wrapEntityHtml(entity: TelegramMessageEntity, escapedSegment: string): string {
  switch (entity.type) {
    case "bold":
      return `<b>${escapedSegment}</b>`;
    case "italic":
      return `<i>${escapedSegment}</i>`;
    case "underline":
      return `<u>${escapedSegment}</u>`;
    case "strikethrough":
      return `<s>${escapedSegment}</s>`;
    case "spoiler":
      return `<tg-spoiler>${escapedSegment}</tg-spoiler>`;
    case "code":
      return `<code>${escapedSegment}</code>`;
    case "pre":
      return `<pre>${escapedSegment}</pre>`;
    case "text_link":
      return entity.url ? `<a href="${escapeHtml(entity.url)}">${escapedSegment}</a>` : escapedSegment;
    case "custom_emoji":
      // Премиум-эмодзи. Требует, чтобы бот имел право использовать custom_emoji
      // в исходящих сообщениях (см. примечание в webhook/route.ts) — иначе
      // Telegram ответит ошибкой на sendMessage/sendPhoto, и стоит откатиться
      // на обычный emoji-символ (он всё равно есть внутри segment).
      return entity.custom_emoji_id
        ? `<tg-emoji emoji-id="${entity.custom_emoji_id}">${escapedSegment}</tg-emoji>`
        : escapedSegment;
    default:
      return escapedSegment;
  }
}

/**
 * Собирает HTML-строку (для parse_mode: "HTML") из исходного текста
 * и массива entities, присланного Telegram.
 *
 * Ограничение: вложенные/пересекающиеся entities (например ссылка внутри
 * жирного текста) не разворачиваются во вложенные теги — берётся первая
 * entity по offset, остальные пересекающиеся с ней пропускаются. Для
 * приветственного сообщения (текст + эмодзи + простое форматирование)
 * этого достаточно.
 */
export function telegramEntitiesToHtml(text: string, entities: TelegramMessageEntity[] = []): string {
  if (!text) return "";
  if (!entities.length) return escapeHtml(text);

  const sorted = [...entities].sort((a, b) => a.offset - b.offset || b.length - a.length);
  let html = "";
  let cursor = 0;

  for (const entity of sorted) {
    if (entity.offset < cursor) continue; // пересекается с уже обработанной entity — пропускаем
    if (entity.offset > cursor) {
      html += escapeHtml(text.slice(cursor, entity.offset));
    }
    const segment = text.slice(entity.offset, entity.offset + entity.length);
    html += wrapEntityHtml(entity, escapeHtml(segment));
    cursor = entity.offset + entity.length;
  }

  html += escapeHtml(text.slice(cursor));
  return html;
}

/**
 * Обрезает команду (например "/setwelcome" или "/setwelcome@BotName")
 * и пробелы после неё из начала текста, синхронно сдвигая offset
 * у entities, чтобы они остались валидными относительно укороченного текста.
 */
export function stripCommandWithEntities(
  text: string,
  entities: TelegramMessageEntity[] = []
): { text: string; entities: TelegramMessageEntity[] } {
  const match = text.match(/^\/[a-zA-Z0-9_]+(@\w+)?\s*/);
  const prefixLength = match ? match[0].length : 0;

  const newText = text.slice(prefixLength);
  const newEntities = entities
    .filter((e) => e.offset >= prefixLength)
    .map((e) => ({ ...e, offset: e.offset - prefixLength }));

  return { text: newText, entities: newEntities };
}
