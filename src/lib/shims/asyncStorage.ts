// Minimal AsyncStorage shim for web builds. Provides an in-memory store so
// optional React Native dependencies used by wallet SDKs don't break Next.js bundling.
const memory = new Map<string, string>();

const asyncStorage = {
  getItem: async (key: string) => memory.get(key) ?? null,
  setItem: async (key: string, value: string) => {
    memory.set(key, value);
  },
  removeItem: async (key: string) => {
    memory.delete(key);
  },
  clear: async () => {
    memory.clear();
  },
  getAllKeys: async () => Array.from(memory.keys()),
  multiGet: async (keys: string[]) =>
    keys.map((key) => [key, memory.get(key) ?? null] as const),
  multiSet: async (entries: Array<[string, string]>) => {
    entries.forEach(([key, value]) => memory.set(key, value));
  },
  multiRemove: async (keys: string[]) => {
    keys.forEach((key) => memory.delete(key));
  },
};

export default asyncStorage;
