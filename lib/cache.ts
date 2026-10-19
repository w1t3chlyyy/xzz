// Маленький in-memory кэш (stale-while-revalidate): при возврате на страницу
// данные показываются мгновенно, а свежие подтягиваются в фоне.
const store = new Map<string, unknown>();

export function getCached<T>(key: string): T | undefined {
  return store.get(key) as T | undefined;
}

export function setCached<T>(key: string, value: T): void {
  store.set(key, value);
}
