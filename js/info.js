// ============================================================
// LOGIK HALAMAN INFO (info.html)
// ============================================================

// Helper: elak bug tarikh "bergeser" akibat penukaran timezone (kira ikut Asia/Kuala_Lumpur, +8)
function tarikhMalaysia(isoString) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(new Date(isoString));
}

async function muatkanSenaraiInfo() {
  const el = document.getElementById("senarai-info");

  const { data, error } = await supabaseClient
    .from("info")
    .select("*")
    .order("penting", { ascending: false })
    .order("dibuat_pada", { ascending: false });

  if (error) {
    el.innerHTML = `<div class="empty-state">Gagal memuatkan info.</div>`;
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    el.innerHTML = `<div class="empty-state">Tiada pengumuman buat masa ini.</div>`;
    return;
  }

  el.innerHTML = data.map((p) => {
    // Jika ada gambar_path, papar sebagai kad buletin/laporan (gambar + kandungan penuh)
    if (p.gambar_path) {
      const { data: urlData } = supabaseClient.storage.from("galeri-karnival").getPublicUrl(p.gambar_path);
      return `
        <article class="info-item info-buletin ${p.penting ? "penting" : ""}">
          <img class="info-buletin-img" src="${urlData.publicUrl}" alt="${escapeHtml(p.tajuk)}" loading="lazy">
          <div class="info-buletin-body">
            ${p.penting ? '<span class="tag">Pengumuman Penting</span>' : ""}
            <h3>${escapeHtml(p.tajuk)}</h3>
            ${kandunganKeParagraf(p.kandungan)}
            <time>${formatTarikh(tarikhMalaysia(p.dibuat_pada))}</time>
          </div>
        </article>
      `;
    }
    // Tiada gambar - papar ringkas macam biasa
    return `
      <div class="info-item ${p.penting ? "penting" : ""}">
        ${p.penting ? '<span class="tag">Pengumuman Penting</span>' : ""}
        <h3>${escapeHtml(p.tajuk)}</h3>
        <p>${escapeHtml(p.kandungan)}</p>
        <time>${formatTarikh(tarikhMalaysia(p.dibuat_pada))}</time>
      </div>
    `;
  }).join("");
}

// Pecahkan kandungan panjang (paragraf dipisah oleh baris kosong) kepada <p> berasingan
function kandunganKeParagraf(teks) {
  return teks
    .split(/\n\s*\n/)
    .map((perenggan) => `<p>${escapeHtml(perenggan.trim())}</p>`)
    .join("");
}

muatkanSenaraiInfo();