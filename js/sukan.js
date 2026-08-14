// ============================================================
// LOGIK HALAMAN JADUAL SUKAN (sukan.html)
// ============================================================

let semuaAcara = [];
let kategoriAktif = "semua";
let statusAktif = "";

// Keutamaan susunan status: sedang berlangsung dulu, kemudian akan datang,
// selesai, dan ditangguhkan di paling bawah.
const STATUS_ORDER = {
  sedang_berlangsung: 0,
  akan_datang: 1,
  selesai: 2,
  ditangguhkan: 3,
};

async function muatkanSenaraiAcara() {
  const el = document.getElementById("senarai-acara");

  const { data, error } = await supabaseClient
    .from("sukan")
    .select("*")
    .order("tarikh", { ascending: true })
    .order("masa", { ascending: true });

  if (error) {
    el.innerHTML = `<div class="empty-state">Gagal memuatkan acara.</div>`;
    console.error(error);
    return;
  }

  semuaAcara = data || [];
  paparkanSubtab();
  paparkanAcaraTertapis();

  document.getElementById("tapis-status").addEventListener("change", (e) => {
    statusAktif = e.target.value;
    paparkanAcaraTertapis();
  });
}

function formatJulatTarikh(a) {
  if (a.tarikh_akhir && a.tarikh_akhir !== a.tarikh) {
    return `${formatTarikh(a.tarikh)} &ndash; ${formatTarikh(a.tarikh_akhir)}`;
  }
  const masaTeks = a.masa
    ? " &middot; " + formatMasa(a.masa) + (a.masa_tamat ? " &ndash; " + formatMasa(a.masa_tamat) : "")
    : "";
  return `${formatTarikh(a.tarikh)}${masaTeks}`;
}

// Kira status sebenar acara secara automatik ikut tarikh & masa semasa.
// "ditangguhkan" sentiasa manual — tak akan diganti oleh logik auto ni.
function kiraStatusAuto(a) {
  if (a.status === "ditangguhkan") return "ditangguhkan";
  if (!a.tarikh) return a.status || "akan_datang";

  const now = new Date();
  const mula = new Date(`${a.tarikh}T${a.masa || "00:00"}`);
  const tarikhAkhir = a.tarikh_akhir || a.tarikh;
  const akhir = new Date(`${tarikhAkhir}T${a.masa_tamat || a.masa || "23:59"}`);

  if (now < mula) return "akan_datang";
  if (now > akhir) return "selesai";
  return "sedang_berlangsung";
}

// Senarai kategori unik dari data, ikut susunan pertama kali dijumpai.
// Kategori yang semua acaranya sudah "selesai" akan diletak di belah kanan (paling akhir).
function senaraiKategori() {
  const kategori = [];
  semuaAcara.forEach((a) => {
    const k = a.kategori_sukan;
    if (k && !kategori.includes(k)) kategori.push(k);
  });

  const semuaSelesai = (k) =>
    semuaAcara
      .filter((a) => a.kategori_sukan === k)
      .every((a) => kiraStatusAuto(a) === "selesai");

  return kategori.sort((a, b) => {
    const aSelesai = semuaSelesai(a);
    const bSelesai = semuaSelesai(b);
    if (aSelesai === bSelesai) return 0;
    return aSelesai ? 1 : -1;
  });
}

function paparkanSubtab() {
  const bar = document.getElementById("subtab-bar");
  const kategori = senaraiKategori();

  const semuaBtn = `<button class="subtab-btn${kategoriAktif === "semua" ? " active" : ""}" data-kategori="semua">Semua</button>`;
  const btnLain = kategori.map((k) => `
    <button class="subtab-btn${kategoriAktif === k ? " active" : ""}" data-kategori="${escapeHtml(k)}">${escapeHtml(k)}</button>
  `).join("");

  bar.innerHTML = semuaBtn + btnLain;

  bar.querySelectorAll(".subtab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      kategoriAktif = btn.dataset.kategori;
      paparkanSubtab();
      paparkanAcaraTertapis();
    });
  });
}

function paparkanAcaraTertapis() {
  let tertapis = kategoriAktif === "semua"
    ? semuaAcara
    : semuaAcara.filter((a) => a.kategori_sukan === kategoriAktif);

  if (statusAktif) {
    tertapis = tertapis.filter((a) => kiraStatusAuto(a) === statusAktif);
  }

  const disusun = [...tertapis].sort((a, b) => {
    const statusA = STATUS_ORDER[kiraStatusAuto(a)] ?? 99;
    const statusB = STATUS_ORDER[kiraStatusAuto(b)] ?? 99;
    if (statusA !== statusB) return statusA - statusB;

    const tarikhA = `${a.tarikh || ""}T${a.masa || "00:00"}`;
    const tarikhB = `${b.tarikh || ""}T${b.masa || "00:00"}`;
    return tarikhA.localeCompare(tarikhB);
  });

  paparkanAcara(disusun);
}

function paparkanAcara(senarai) {
  const el = document.getElementById("senarai-acara");

  if (!senarai || senarai.length === 0) {
    el.innerHTML = `<div class="empty-state">Tiada acara untuk paparan ini.</div>`;
    return;
  }

  el.innerHTML = senarai.map((a) => `
    <div class="card event-card">
      <span class="event-date">${formatJulatTarikh(a)}</span>
      <span class="event-name">${escapeHtml(a.nama_acara)}</span>
      <div class="event-meta">
        ${a.kategori_sukan ? `<span>${escapeHtml(a.kategori_sukan)}</span>` : ""}
        ${a.lokasi ? `<span>&middot; ${escapeHtml(a.lokasi)}</span>` : ""}
      </div>
      ${a.keputusan ? `<p style="font-size:13px;color:var(--ink-600);margin:2px 0 0">${escapeHtml(a.keputusan)}</p>` : ""}
      <span class="badge badge-${kiraStatusAuto(a)}">${statusLabel(kiraStatusAuto(a))}</span>
    </div>
  `).join("");
}

muatkanSenaraiAcara();