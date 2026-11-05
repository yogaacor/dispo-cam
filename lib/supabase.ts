import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const BUCKET = "photos";
export const isSupabaseConfigured = Boolean(url && key);

export type PhotoRow = {
  id: string;
  created_at: string;
  guest_name: string;
  filter: string;
  storage_path: string;
  width: number | null;
  height: number | null;
};

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!url || !key) {
    throw new Error(
      "Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  if (!client) client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export function photoUrl(path: string, download?: string): string {
  const { data } = getSupabase()
    .storage.from(BUCKET)
    .getPublicUrl(path, download ? { download } : undefined);
  return data.publicUrl;
}
