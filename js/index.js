// ============================================================
// LOGIK HALAMAN UTAMA (index.html)
// ============================================================

// Helper: elak bug tarikh "bergeser" akibat penukaran timezone (kira ikut Asia/Kuala_Lumpur, +8)
function tarikhMalaysia(isoString) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(new Date(isoString));
}

async function muatkanMiniScoreboard() {
  const el = document.getElementById("mini-scoreboard");
  const { data, error } = await supabaseClient
    .from("kiraan_pingat")
    .select("*")
    .order("emas", { ascending: false })
    .order("perak", { ascending: false })
    .order("gangsa", { ascending: false })
    .limit(5);

  if (error) {
    el.innerHTML = `<div class="empty-state" style="color:#fff;opacity:.6">Gagal memuatkan data.</div>`;
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    el.innerHTML = `<div class="empty-state" style="color:#fff;opacity:.6">Belum ada pingat direkodkan.</div>`;
    return;
  }

  el.innerHTML = data.map((row, i) => `
    <div class="sb-row">
      <span class="sb-rank">${i + 1}</span>
      <span class="sb-name">${escapeHtml(row.nama_pasukan)}</span>
      <span class="sb-num">${row.emas}</span>
      <span class="sb-num">${row.perak}</span>
      <span class="sb-num">${row.gangsa}</span>
      <span class="sb-total">${row.jumlah}</span>
    </div>
  `).join("");
}

function formatJulatTarikh(a) {
  if (a.tarikh_akhir && a.tarikh_akhir !== a.tarikh) {
    return `${formatTarikh(a.tarikh)} &ndash; ${formatTarikh(a.tarikh_akhir)}`;
  }
  return `${formatTarikh(a.tarikh)}${a.masa ? " &middot; " + formatMasa(a.masa) : ""}`;
}

// Keutamaan susunan status untuk paparan di halaman utama:
// sedang berlangsung dulu, kemudian akan datang. (Acara selesai/ditangguhkan
// tak perlu tonjol di sini — ditapis keluar di bawah.)
const STATUS_ORDER_INDEX = {
  sedang_berlangsung: 0,
  akan_datang: 1,
};

async function muatkanAcaraTerkini() {
  const el = document.getElementById("acara-terkini");
  // Ambil dari 2 hari lepas supaya acara yang bermula sebelum hari ini tapi
  // masih berlangsung (tarikh_akhir belum diisi / berlanjutan) tetap ditangkap,
  // memandangkan status sebenar dikira semula ikut masa di bawah (kiraStatusAuto),
  // bukan sekadar diharap kepada medan `tarikh_akhir` dalam DB.
  const dueTarikh = new Date();
  dueTarikh.setDate(dueTarikh.getDate() - 2);
  const tarikhMula = dueTarikh.toISOString().slice(0, 10);

  const { data, error } = await supabaseClient
    .from("sukan")
    .select("*")
    .gte("tarikh", tarikhMula)
    .order("tarikh", { ascending: true })
    .order("masa", { ascending: true });

  if (error) {
    el.innerHTML = `<div class="empty-state">Gagal memuatkan acara.</div>`;
    console.error(error);
    return;
  }

  // Kira status sebenar (bukan guna medan `status` mentah dari DB) supaya
  // acara yang sedang berlangsung sekarang betul-betul terpapar sebagai
  // "Sedang Berlangsung", walaupun medan status dalam DB belum dikemas kini.
  const relevan = (data || [])
    .map((a) => ({ ...a, statusAuto: kiraStatusAuto(a) }))
    .filter((a) => a.statusAuto === "sedang_berlangsung" || a.statusAuto === "akan_datang");

  const disusun = relevan
    .sort((a, b) => {
      const sa = STATUS_ORDER_INDEX[a.statusAuto] ?? 99;
      const sb = STATUS_ORDER_INDEX[b.statusAuto] ?? 99;
      if (sa !== sb) return sa - sb;
      const ta = `${a.tarikh || ""}T${a.masa || "00:00"}`;
      const tb = `${b.tarikh || ""}T${b.masa || "00:00"}`;
      return ta.localeCompare(tb);
    })
    .slice(0, 6);

  if (disusun.length === 0) {
    el.innerHTML = `<div class="empty-state">Tiada acara akan datang buat masa ini.</div>`;
    return;
  }

  el.innerHTML = disusun.map((a) => `
    <div class="card event-card">
      <span class="event-date">${formatJulatTarikh(a)}</span>
      <span class="event-name">${escapeHtml(a.nama_acara)}</span>
      <div class="event-meta">
        ${a.kategori_sukan ? `<span>${escapeHtml(a.kategori_sukan)}</span>` : ""}
        ${a.lokasi ? `<span>&middot; ${escapeHtml(a.lokasi)}</span>` : ""}
      </div>
      <span class="badge badge-${a.statusAuto}">${statusLabel(a.statusAuto)}</span>
    </div>
  `).join("");
}

async function muatkanInfoTerkini() {
  const el = document.getElementById("info-terkini");
  const { data, error } = await supabaseClient
    .from("info")
    .select("*")
    .order("dibuat_pada", { ascending: false })
    .limit(3);

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
    const ringkasan = p.kandungan.length > 140 ? p.kandungan.slice(0, 140).trim() + "…" : p.kandungan;
    const gambarHtml = p.gambar_path
      ? (() => {
          const { data: urlData } = supabaseClient.storage.from("galeri-karnival").getPublicUrl(p.gambar_path);
          return `<img class="info-card-img" src="${urlData.publicUrl}" alt="${escapeHtml(p.tajuk)}" loading="lazy">`;
        })()
      : "";
    return `
      <div class="info-card ${p.penting ? "penting" : ""}">
        ${gambarHtml}
        <div class="info-card-body">
          ${p.penting ? '<span class="tag">Pengumuman Penting</span>' : ""}
          <h3>${escapeHtml(p.tajuk)}</h3>
          <p>${escapeHtml(ringkasan)}</p>
          <time>${formatTarikh(tarikhMalaysia(p.dibuat_pada))}</time>
        </div>
      </div>
    `;
  }).join("");
}

async function muatkanStatistikRingkasan() {
  const [acaraRes, pasukanRes] = await Promise.all([
    supabaseClient.from("sukan").select("*", { count: "exact", head: true }),
    supabaseClient.from("pasukan").select("*", { count: "exact", head: true }),
  ]);

  if (acaraRes.error) {
    console.error(acaraRes.error);
  } else {
    document.getElementById("stat-acara").textContent = acaraRes.count ?? "—";
  }

  if (pasukanRes.error) {
    console.error(pasukanRes.error);
  } else {
    document.getElementById("stat-pasukan").textContent = pasukanRes.count ?? "—";
  }
}

function kiraHariKarnival() {
  // Tarikh karnival — laraskan mengikut tarikh sebenar
  const mula = new Date("2026-08-17T00:00:00");
  const tamat = new Date("2026-08-22T23:59:59");
  const hariIni = new Date();
  let label = "—";

  if (hariIni < mula) {
    const bezaHari = Math.ceil((mula - hariIni) / (1000 * 60 * 60 * 24));
    label = `H-${bezaHari}`;
  } else if (hariIni > tamat) {
    label = "Selesai";
  } else {
    const hariKe = Math.floor((hariIni - mula) / (1000 * 60 * 60 * 24)) + 1;
    label = `Hari ${hariKe}`;
  }
  document.getElementById("stat-hari").textContent = label;
}

kiraHariKarnival();
muatkanStatistikRingkasan();
muatkanMiniScoreboard();
muatkanAcaraTerkini();
muatkanInfoTerkini();