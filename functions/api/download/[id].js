export async function onRequestGet({ params, env }) {
  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = env;

  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    return new Response("Server configuration is missing.", {
      status: 500
    });
  }

  const id = params.id;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id || "")) {
    return new Response("File not found.", { status: 404 });
  }

  const headers = {
    apikey: SUPABASE_SECRET_KEY,
    Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
    "Content-Type": "application/json"
  };

  const base = SUPABASE_URL.replace(/\/$/, "");

  const lookup = await fetch(
    `${base}/rest/v1/files?id=eq.${id}&select=storage_path,filename&limit=1`,
    { headers }
  );

  if (!lookup.ok) {
    return new Response("Could not find file.", { status: 502 });
  }

  const rows = await lookup.json();

  if (!rows.length) {
    return new Response("File not found.", { status: 404 });
  }

  const file = rows[0];

  const path = file.storage_path
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  const sign = await fetch(
    `${base}/storage/v1/object/sign/zxking-files/${path}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ expiresIn: 120 })
    }
  );

  if (!sign.ok) {
    return new Response("Could not create download link.", {
      status: 502
    });
  }

  const signed = await sign.json();
  const signedUrl = signed.signedURL || signed.signedUrl;

  if (!signedUrl) {
    return new Response("Download link unavailable.", {
      status: 502
    });
  }

  await fetch(`${base}/rest/v1/rpc/increment_file_download_count`, {
    method: "POST",
    headers,
    body: JSON.stringify({ p_file_id: id })
  }).catch(() => {});

  let destination;

  if (signedUrl.startsWith("http")) {
    destination = signedUrl;
  } else if (signedUrl.startsWith("/storage/v1/")) {
    destination = `${base}${signedUrl}`;
  } else {
    destination = `${base}/storage/v1${signedUrl.startsWith("/") ? signedUrl : `/${signedUrl}`}`;
  }

  return Response.redirect(destination, 302);
      }
