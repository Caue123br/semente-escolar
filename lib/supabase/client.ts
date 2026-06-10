import { createBrowserClient } from "@supabase/ssr";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Verdadeiro só quando ambos estão configurados.
// Quando false, o sistema usa localStorage como backend "fake".
export const SUPABASE_ATIVO = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export function getSupabaseClient() {
  if (!SUPABASE_ATIVO) {
    throw new Error(
      "Supabase não configurado. Veja .env.local.example para ativar."
    );
  }
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
