// ============================================================
// LOGIK VIDEO SOROTAN (galeri.html)
// Papar video YouKube yang ditanda "aktif" oleh admin, ikut
// urutan yang ditetapkan. Guna client & helper sama dengan galeri.js.
// ============================================================

async function muatkanVideo() {
  const elGrid = document.getElementById("video-grid");
  if (!elGrid) return;

  const { data, error } = await supabaseClient
    .from("video_karnival")
    .select("*")
    .eq("aktif", true)
    .order("urutan", { ascending: true });

  if (error) {
    elGrid.innerHTML = `<div class="empty-state">Gagal memuatkan video.</div>`;
    console.error(error);
    return;
  }

  const senarai = data || [];

  if (senarai.length === 0) {
    elGrid.innerHTML = `<div class="empty-state">Belum ada video ditambah.</div>`;
    return;
  }

  elGrid.innerHTML = senarai.map((v) => `
    <div class="video-card">
      <div class="video-embed-wrap">
        <iframe
          src="https://www.youtube.com/embed/${escapeHtml(v.youtube_id)}"
          title="${escapeHtml(v.tajuk || "Video Karnival")}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          loading="lazy"
        ></iframe>
      </div>
      <div class="video-card-body">
        <span class="video-card-title">${escapeHtml(v.tajuk || "Video Karnival")}</span>
      </div>
    </div>
  `).join("");
}

muatkanVideo();