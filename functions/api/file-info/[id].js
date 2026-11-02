
export async function onRequestGet({ request, env, params }) {
  const id = params.id;

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!id || !uuidPattern.test(id)) {
    return Response.json(
      { error: "Invalid file ID." },
      { status: 400 }
    );
  }

  const supabaseUrl = env.SUPABASE_URL;
  const supabaseSecret = env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecret) {
    return Response.json(
      { error: "Server configuration is missing." },
      { status: 500 }
    );
  }

  try {
    const apiUrl = new URL(
      `${supabaseUrl}/rest/v1/files`
    );

    apiUrl.searchParams.set("id", `eq.${id}`);
    apiUrl.searchParams.set(
      "select",
      "filename,size_bytes,content_type"
    );

    const response = await fetch(apiUrl.toString(), {
      headers: {
        apikey: supabaseSecret,
        Authorization: `Bearer ${supabaseSecret}`,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      return Response.json(
        { error: "Unable to retrieve file information." },
        { status: 500 }
      );
    }

    const files = await response.json();

    if (!files || files.length === 0) {
      return Response.json(
        { error: "File not found." },
        { status: 404 }
      );
    }

    const file = files[0];

    return Response.json(
      {
        filename: file.filename,
        size_bytes: file.size_bytes,
        content_type: file.content_type
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    return Response.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}
