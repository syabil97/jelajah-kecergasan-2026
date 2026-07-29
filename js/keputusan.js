// ============================================================
// LOGIK HALAMAN KEPUTUSAN (keputusan.html)
// Papar 2 jenis keputusan dalam sub-tab kategori yang sama:
//   1) Perlawanan (skor pasukan A vs B) - dari view perlawanan_penuh
//   2) Acara kedudukan (juara/naib juara/ketiga) - dari sukan + pingat
// ============================================================

let semuaPerlawanan = [];
let semuaAcaraKedudukan = [];
let kategoriAktif = null;

async function muatkanPerlawanan() {
  const elTabs = document.getElementById("subtab-bar");
  const elList = document.getElementById("senarai-perlawanan");

  const [resPerlawanan, resAcara] = await Promise.all([
    supabaseClient
      .from("perlawanan_penuh")
      .select("*")
      .order("tarikh", { ascending: true })
      .order("masa", { ascending: true }),
    supabaseClient
      .from("sukan")
      .select("*, pingat(jenis, pasukan(nama, warna, logo_url))")
      .order("tarikh", { ascending: true }),
  ]);

  if (resPerlawanan.error || resAcara.error) {
    elTabs.innerHTML = "";
    elList.innerHTML = `<div class="empty-state">Gagal memuatkan keputusan.</div>`;
    console.error(resPerlawanan.error || resAcara.error);
    return;
  }

  semuaPerlawanan = resPerlawanan.data || [];
  // Hanya acara yang sudah ada sekurang-kurangnya satu rekod pingat (jenis kedudukan)
  semuaAcaraKedudukan = (resAcara.data || []).filter((s) => s.pingat && s.pingat.length > 0);

  if (semuaPerlawanan.length === 0 && semuaAcaraKedudukan.length === 0) {
    elTabs.innerHTML = "";
    elList.innerHTML = `<div class="empty-state">Belum ada keputusan buat masa ini.</div>`;
    return;
  }

  // Bina senarai kategori sukan unik (gabungan dari kedua-dua sumber), susun ikut abjad
  const kategoriList = [...new Set([
    ...semuaPerlawanan.map((m) => m.kategori_sukan),
    ...semuaAcaraKedudukan.map((s) => s.kategori_sukan),
  ])].filter(Boolean).sort();

  kategoriAktif = kategoriList[0];

  elTabs.innerHTML = kategoriList.map((k) => `
    <button class="subtab-btn ${k === kategoriAktif ? "active" : ""}" data-kategori="${escapeHtml(k)}">
      ${escapeHtml(k)}
    </button>
  `).join("");

  elTabs.querySelectorAll(".subtab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      kategoriAktif = btn.dataset.kategori;
      elTabs.querySelectorAll(".subtab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      paparkanKeputusan(kategoriAktif);
    });
  });

  paparkanKeputusan(kategoriAktif);
}

function paparkanKeputusan(kategori) {
  const el = document.getElementById("senarai-perlawanan");
  const senaraiPerlawanan = semuaPerlawanan.filter((m) => m.kategori_sukan === kategori);
  const senaraiAcara = semuaAcaraKedudukan.filter((s) => s.kategori_sukan === kategori);

  if (senaraiPerlawanan.length === 0 && senaraiAcara.length === 0) {
    el.innerHTML = `<div class="empty-state">Tiada keputusan untuk ${escapeHtml(kategori)} buat masa ini.</div>`;
    return;
  }

  let html = "";

  if (senaraiAcara.length > 0) {
    html += `
      <div class="kedudukan-list">
        ${senaraiAcara.map(kadAcaraKedudukan).join("")}
      </div>
    `;
  }

  if (senaraiPerlawanan.length > 0) {
    const kumpulan = {};
    senaraiPerlawanan.forEach((m) => {
      const key = m.pusingan || "Perlawanan";
      if (!kumpulan[key]) kumpulan[key] = [];
      kumpulan[key].push(m);
    });

    html += Object.entries(kumpulan).map(([pusingan, perlawanan]) => `
      <div class="match-round-group">
        <span class="match-round-title">${escapeHtml(pusingan)}</span>
        <div class="match-list">
          ${perlawanan.map(kadPerlawanan).join("")}
        </div>
      </div>
    `).join("");
  }

  el.innerHTML = html;
}

const JENIS_LABEL = { emas: "Juara", perak: "Naib Juara", gangsa: "Ketiga" };
const JENIS_URUTAN = ["emas", "perak", "gangsa"];
const RUMI = ["I", "II", "III", "IV", "V"];

function kadAcaraKedudukan(acara) {
  const kumpulan = { emas: [], perak: [], gangsa: [] };
  (acara.pingat || []).forEach((p) => {
    if (kumpulan[p.jenis]) kumpulan[p.jenis].push(p.pasukan);
  });

  const baris = JENIS_URUTAN.filter((j) => kumpulan[j].length > 0).map((j) => {
    const pasukanList = kumpulan[j];
    const labelUtama = pasukanList.length > 1 ? `${JENIS_LABEL[j]} Bersama` : JENIS_LABEL[j];

    if (pasukanList.length === 1) {
      return `
        <div class="kedudukan-row">
          <span class="kedudukan-label">${labelUtama}</span>
          <span class="kedudukan-pasukan">
            ${pasukanList[0]?.logo_url
              ? `<img class="team-flag" src="${escapeHtml(pasukanList[0].logo_url)}" alt="">`
              : `<span class="team-dot" style="background:${pasukanList[0]?.warna || "#00A99D"}"></span>`}
            ${escapeHtml(pasukanList[0]?.nama || "")}
          </span>
        </div>
      `;
    }

    return `
      <div class="kedudukan-row kedudukan-row-bersama">
        <span class="kedudukan-label">${labelUtama}</span>
        <div class="kedudukan-pasukan-list">
          ${pasukanList.map((p, i) => `
            <div class="kedudukan-pasukan-item">
              <span class="kedudukan-rumi">${RUMI[i] || ""})</span>
              <span class="kedudukan-pasukan">
                ${p?.logo_url
                  ? `<img class="team-flag" src="${escapeHtml(p.logo_url)}" alt="">`
                  : `<span class="team-dot" style="background:${p?.warna || "#00A99D"}"></span>`}
                ${escapeHtml(p?.nama || "")}
              </span>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }).join("");

  return `
    <div class="kedudukan-card">
      <div class="kedudukan-card-head">${escapeHtml(acara.nama_acara)}</div>
      <div class="kedudukan-card-body">${baris}</div>
    </div>
  `;
}

function kadPerlawanan(m) {
  const sudahTamat = m.status === "selesai" && m.skor_a !== null && m.skor_b !== null;
  const skorPaparan = sudahTamat
    ? `<span>${m.skor_a}</span><span class="vs-label">&ndash;</span><span>${m.skor_b}</span>`
    : `<span class="vs-label">VS</span>`;

  return `
    <div class="match-card">
      <div class="match-card-top">
        <span class="match-date">${formatTarikh(m.tarikh)}${m.masa ? " &middot; " + formatMasa(m.masa) : ""}</span>
        <span class="badge badge-${m.status}">${statusLabel(m.status)}</span>
      </div>
      <div class="match-teams">
        <div class="match-team team-a">
          <span class="team-dot" style="background:${m.warna_pasukan_a || "#00A99D"}"></span>
          ${escapeHtml(m.nama_pasukan_a || "Belum Ditentukan")}
        </div>
        <div class="match-score">${skorPaparan}</div>
        <div class="match-team team-b">
          <span class="team-dot" style="background:${m.warna_pasukan_b || "#00A99D"}"></span>
          ${escapeHtml(m.nama_pasukan_b || "Belum Ditentukan")}
        </div>
      </div>
      <div class="match-card-bottom">
        <span class="match-meta-text">${m.lokasi ? escapeHtml(m.lokasi) : ""}</span>
        ${m.catatan ? `<span class="match-meta-text">${escapeHtml(m.catatan)}</span>` : ""}
      </div>
    </div>
  `;
}

muatkanPerlawanan();

supabaseClient
  .channel("perlawanan-realtime")
  .on("postgres_changes", { event: "*", schema: "public", table: "perlawanan" }, () => {
    muatkanPerlawanan();
  })
  .subscribe();

supabaseClient
  .channel("pingat-keputusan-realtime")
  .on("postgres_changes", { event: "*", schema: "public", table: "pingat" }, () => {
    muatkanPerlawanan();
  })
  .subscribe();