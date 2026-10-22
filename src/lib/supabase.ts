import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

export const supabase = createClient(supabaseUrl, supabaseKey)

// Admin Client (Bypass RLS) - Use ONLY on Server Side
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseServiceKey) {
    // No silent fallback to the anon key: server-side writes must not depend on public storage policies.
    throw new Error("SUPABASE_SERVICE_ROLE_KEY belum diatur")
}
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
