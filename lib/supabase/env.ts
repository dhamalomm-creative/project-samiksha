function required(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.example to .env.local and fill it in (see SETUP.md).`);
  }
  return value;
}

// Referenced by full name so Next.js can inline them into the browser bundle.
export const supabaseUrl = () =>
  required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
export const supabaseAnonKey = () =>
  required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
