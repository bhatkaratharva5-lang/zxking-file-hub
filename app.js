(async () => {
  const $ = (id) => document.getElementById(id);
  const authPanel = $("auth-panel"), uploadPanel = $("upload-panel"), filesPanel = $("files-panel");
  let client = null, currentUser = null;

  function message(id, text, isError = false) {
    const el = $(id); el.textContent = text; el.style.color = isError ? "#ff9b9b" : "";
  }
  function bytes(n) {
    if (n < 1024) return n + " B";
    if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
    return (n / 1048576).toFixed(1) + " MB";
  }
  async function init() {
    try {
      const r = await fetch("/api/config");
      if (!r.ok) throw new Error("Cloudflare configuration is missing.");
      const cfg = await r.json();
      if (!cfg.url || !cfg.key) throw new Error("Supabase URL or publishable key is missing.");
      client = window.supabase.createClient(cfg.url, cfg.key);
      const { data } = await client.auth.getSession();
      currentUser = data.session?.user || null;
      renderAuth();
      client.auth.onAuthStateChange((_event, session) => {
        currentUser = session?.user || null; renderAuth(); if (currentUser) loadFiles();
      });
    } catch (e) { message("auth-message", e.message, true); }
  }
  function renderAuth() {
    $("account-label").textContent = currentUser ? currentUser.email : "Not signed in";
    authPanel.classList.toggle("hidden", !!currentUser);
    uploadPanel.classList.toggle("hidden", !currentUser);
    filesPanel.classList.toggle("hidden", !currentUser);
  }
  $("signup-btn").addEventListener("click", async () => {
    if (!client) return;
    const { error } = await client.auth.signUp({ email: $("email").value.trim(), password: $("password").value });
    message("auth-message", error ? error.message : "Signup submitted. Check your email if confirmation is enabled.", !!error);
  });
  $("login-btn").addEventListener("click", async () => {
    if (!client) return;
    const { error } = await client.auth.signInWithPassword({ email: $("email").value.trim(), password: $("password").value });
    message("auth-message", error ? error.message : "Logged in.", !!error);
  });
  $("logout-btn").addEventListener("click", async () => { await client.auth.signOut(); });
  $("refresh-btn").addEventListener("click", loadFiles);

  $("upload-btn").addEventListener("click", async () => {
    const file = $("file-input").files[0];
    if (!file) return message("upload-message", "Choose a file first.", true);
    if (file.size > 50 * 1024 * 1024) return message("upload-message", "This file is over the 50 MB limit.", true);
    const btn = $("upload-btn"), bar = $("progress-bar"), wrap = $("progress-wrap");
    btn.disabled = true; wrap.classList.remove("hidden"); bar.style.width = "10%";
    message("upload-message", "Uploading...");
    try {
      const id = crypto.randomUUID();
      const safeName = file.name.replace(/[\\/]/g, "_");
      const path = `${currentUser.id}/${id}`;
      const { error: uploadError } = await client.storage.from("zxking-files").upload(path, file, {
        contentType: file.type || "application/octet-stream", upsert: false
      });
      if (uploadError) throw uploadError;
      bar.style.width = "75%";
      const { error: dbError } = await client.from("files").insert({
        id, user_id: currentUser.id, storage_path: path, filename: safeName,
        size_bytes: file.size, content_type: file.type || "application/octet-stream"
      });
      if (dbError) {
        await client.storage.from("zxking-files").remove([path]);
        throw dbError;
      }
      bar.style.width = "100%";
      message("upload-message", "Upload complete. Your file is ready to share.");
      $("file-input").value = "";
      await loadFiles();
    } catch (e) { message("upload-message", e.message || "Upload failed.", true); }
    finally { btn.disabled = false; setTimeout(() => wrap.classList.add("hidden"), 1800); }
  });

  async function loadFiles() {
    if (!client || !currentUser) return;
    $("file-list").innerHTML = '<p class="hint">Loading your files…</p>';
    const { data, error } = await client.from("files")
      .select("id,filename,size_bytes,created_at,download_count")
      .order("created_at", { ascending: false });
    if (error) { $("file-list").textContent = error.message; return; }
    if (!data.length) { $("file-list").innerHTML = '<p class="hint">No files yet. Upload your first file above.</p>'; return; }
    $("file-list").replaceChildren(...data.map((f) => {
      const row = document.createElement("div"); row.className = "file";
      const info = document.createElement("div");
      const name = document.createElement("strong"); name.textContent = f.filename;
      const meta = document.createElement("small"); meta.textContent = `${bytes(f.size_bytes)} · ${f.download_count || 0} downloads`;
      info.append(name, meta);
      const link = document.createElement("a"); link.href = `/api/download/${encodeURIComponent(f.id)}`;
      link.textContent = "Create download link ↗"; link.target = "_blank"; link.rel = "noopener";
      row.append(info, link); return row;
    }));
  }
  init();
})();
