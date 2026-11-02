export async function onRequestGet({ env }) {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return Response.json(
      { error: "Missing Supabase configuration." },
      { status: 500 }
    );
  }

  return Response.json(
    {
      url: supabaseUrl,
      key: supabaseKey
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
