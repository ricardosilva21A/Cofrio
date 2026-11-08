import { createClient } from "@supabase/supabase-js";

const storage = {
  async getItem(key: string): Promise<string | null> {
    const stored = await chrome.storage.local.get(key);
    return (stored[key] as string | undefined) ?? null;
  },
  setItem: (key: string, value: string) => chrome.storage.local.set({ [key]: value }),
  removeItem: (key: string) => chrome.storage.local.remove(key),
};

export const supabase = createClient(__SUPABASE_URL__, __SUPABASE_KEY__, {
  auth: { storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
