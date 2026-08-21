// ============================================================
// LOGIK HALAMAN GALERI (galeri.html)
// Tab ikut KATEGORI SUKAN *atau* KATEGORI AM (cth: Pendaftaran,
// Majlis Perasmian — gambar yang tak kaitan acara sukan tertentu).
// Dalam setiap tab, gambar dikumpulkan ikut NAMA ACARA / KATEGORI AM
// (heading), gambar tanpa acara/kategori masuk "Lain-lain".
// ============================================================

let semuaGaleri = [];
let kategoriAktif = "semua";
let senaraiUntukLightbox = [];
let indeksLightboxSemasa = 0;

const HAD_PAPAR_AWAL = 12; // bilangan gambar dipapar dulu setiap kumpulan
let hadPaparan = new Map(); // nama kumpulan -> bilangan gambar dipapar setakat ini

async function muatkanGaleri() {
  const elTabs = document.getElementById("subtab-bar");
  const elGrid = document.getElementById("galeri-grid");

  const { data, error } = await supabaseClient
    .from("galeri")
    .select("*, sukan(nama_acara, kategori_sukan)")
    .order("dimuat_naik_pada", { ascending: false });

  if (error) {
    elTabs.innerHTML = "";
    elGrid.innerHTML = `<div class="empty-state">Gagal memuatkan galeri.</div>`;
    console.error(error);
    return;
  }

  semuaGaleri = data || [];

  if (semuaGaleri.length === 0) {
    elTabs.innerHTML = "";
    elGrid.innerHTML = `<div class="empty-state">Belum ada gambar dimuat naik.</div>`;
    return;
  }

  // Senarai kategori sukan unik yang ada gambar, susun ikut abjad
  const kategoriSukanSeen = new Set();
  // Senarai kategori am unik yang ada gambar, susun ikut abjad
  const kategoriAmSeen = new Set();
  semuaGaleri.forEach((g) => {
    if (g.sukan?.kategori_sukan) kategoriSukanSeen.add(g.sukan.kategori_sukan);
    if (g.kategori_am) kategoriAmSeen.add(g.kategori_am);
  });
  const senaraiKategoriSukan = [...kategoriSukanSeen].sort();
  const senaraiKategoriAm = [...kategoriAmSeen].sort();

  const adaTanpaKategori = semuaGaleri.some((g) => !g.sukan?.kategori_sukan && !g.kategori_am);

  // Guna prefix "sukan:" / "am:" pada data-kategori supaya tak konflik kalau
  // kebetulan nama kategori sukan sama dengan nama kategori am
  const tabButtons = [`<button class="subtab-btn ${kategoriAktif === "semua" ? "active" : ""}" data-kategori="semua">Semua</button>`]
    .concat(senaraiKategoriSukan.map((k) => `
      <button class="subtab-btn ${kategoriAktif === "sukan:" + k ? "active" : ""}" data-kategori="sukan:${escapeHtml(k)}">${escapeHtml(k)}</button>
    `))
    .concat(senaraiKategoriAm.map((k) => `
      <button class="subtab-btn ${kategoriAktif === "am:" + k ? "active" : ""}" data-kategori="am:${escapeHtml(k)}">${escapeHtml(k)}</button>
    `));

  if (adaTanpaKategori) {
    tabButtons.push(`<button class="subtab-btn ${kategoriAktif === "lain" ? "active" : ""}" data-kategori="lain">Lain-lain</button>`);
  }

  // Kalau cuma satu kumpulan je (takda kategori langsung), tak payah papar tab
  elTabs.innerHTML = (senaraiKategoriSukan.length === 0 && senaraiKategoriAm.length === 0) ? "" : tabButtons.join("");

  elTabs.querySelectorAll(".subtab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      kategoriAktif = btn.dataset.kategori;
      hadPaparan = new Map(); // reset pagination bila tukar tab
      elTabs.querySelectorAll(".subtab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      paparkanGaleri();
    });
  });

  paparkanGaleri();
}

function getGaleriTersaring() {
  if (kategoriAktif === "semua") return semuaGaleri;
  if (kategoriAktif === "lain") return semuaGaleri.filter((g) => !g.sukan?.kategori_sukan && !g.kategori_am);
  if (kategoriAktif.startsWith("sukan:")) {
    const nilai = kategoriAktif.slice("sukan:".length);
    return semuaGaleri.filter((g) => g.sukan?.kategori_sukan === nilai);
  }
  if (kategoriAktif.startsWith("am:")) {
    const nilai = kategoriAktif.slice("am:".length);
    return semuaGaleri.filter((g) => g.kategori_am === nilai);
  }
  return semuaGaleri;
}

function paparkanGaleri() {
  const elGrid = document.getElementById("galeri-grid");
  const tersaring = getGaleriTersaring();

  if (tersaring.length === 0) {
    elGrid.innerHTML = `<div class="empty-state">Tiada gambar untuk kumpulan ini.</div>`;
    senaraiUntukLightbox = [];
    return;
  }

  // Kumpulkan ikut nama acara sukan, atau kategori am (kalau tiada acara),
  // atau "Lain-lain" (kalau tiada kedua-duanya)
  const kumpulan = new Map(); // nama -> senarai gambar
  tersaring.forEach((g) => {
    const nama = g.sukan?.nama_acara || g.kategori_am || "Lain-lain";
    if (!kumpulan.has(nama)) kumpulan.set(nama, []);
    kumpulan.get(nama).push(g);
  });

  // "Lain-lain" letak last, selebihnya ikut abjad
  const namaAcaraList = [...kumpulan.keys()].sort((a, b) => {
    if (a === "Lain-lain") return 1;
    if (b === "Lain-lain") return -1;
    return a.localeCompare(b);
  });

  senaraiUntukLightbox = namaAcaraList.flatMap((nama) => kumpulan.get(nama));
  let offset = 0;

  elGrid.innerHTML = namaAcaraList.map((nama) => {
    const gambarAcaraSemua = kumpulan.get(nama);
    const mulaOffset = offset;
    offset += gambarAcaraSemua.length;

    // Had bilangan gambar dipapar untuk kumpulan ni (default HAD_PAPAR_AWAL)
    const hadSemasa = hadPaparan.get(nama) || HAD_PAPAR_AWAL;
    const gambarAcara = gambarAcaraSemua.slice(0, hadSemasa);
    const bakiLagi = gambarAcaraSemua.length - gambarAcara.length;

    return `
      <div class="gallery-group">
        <span class="gallery-group-title">${escapeHtml(nama)}</span>
        <div class="gallery-grid-inner">
          ${gambarAcara.map((g, i) => `
            <div class="gallery-item" data-index="${mulaOffset + i}" role="button" tabindex="0" aria-label="Besarkan gambar">
              <img src="${getGaleriThumbUrl(g.image_path)}" alt="${escapeHtml(g.tajuk || "Gambar karnival")}" loading="lazy">
              <div class="cap">${escapeHtml(g.tajuk || "Gambar Karnival")}</div>
            </div>
          `).join("")}
        </div>
        ${bakiLagi > 0 ? `
          <button class="btn-papar-lagi" data-nama="${escapeHtml(nama)}">
            Papar Lagi (${bakiLagi} lagi gambar)
          </button>
        ` : ""}
      </div>
    `;
  }).join("");

  elGrid.querySelectorAll(".gallery-item").forEach((item) => {
    const buka = () => bukaLightbox(parseInt(item.dataset.index, 10));
    item.addEventListener("click", buka);
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); buka(); }
    });
  });

  elGrid.querySelectorAll(".btn-papar-lagi").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nama = btn.dataset.nama;
      const hadBaru = (hadPaparan.get(nama) || HAD_PAPAR_AWAL) + HAD_PAPAR_AWAL;
      hadPaparan.set(nama, hadBaru);
      paparkanGaleri();
    });
  });
}

/* ---------------- LIGHTBOX ---------------- */
const lightboxEl = document.getElementById("lightbox");
const lightboxImgEl = document.getElementById("lightbox-img");
const lightboxCapEl = document.getElementById("lightbox-cap");

function bukaLightbox(index) {
  indeksLightboxSemasa = index;
  paparkanLightbox();
  lightboxEl.classList.add("open");
  document.body.style.overflow = "hidden";
}

function tutupLightbox() {
  lightboxEl.classList.remove("open");
  document.body.style.overflow = "";
}

function paparkanLightbox() {
  const g = senaraiUntukLightbox[indeksLightboxSemasa];
  if (!g) return;
  lightboxImgEl.src = getGaleriBesarUrl(g.image_path);
  lightboxImgEl.alt = g.tajuk || "Gambar karnival";
  lightboxCapEl.textContent = g.tajuk || "";
}

function lightboxSeterusnya() {
  indeksLightboxSemasa = (indeksLightboxSemasa + 1) % senaraiUntukLightbox.length;
  paparkanLightbox();
}

function lightboxSebelum() {
  indeksLightboxSemasa = (indeksLightboxSemasa - 1 + senaraiUntukLightbox.length) % senaraiUntukLightbox.length;
  paparkanLightbox();
}

document.getElementById("lightbox-close").addEventListener("click", tutupLightbox);
document.getElementById("lightbox-next").addEventListener("click", lightboxSeterusnya);
document.getElementById("lightbox-prev").addEventListener("click", lightboxSebelum);

lightboxEl.addEventListener("click", (e) => {
  if (e.target === lightboxEl) tutupLightbox();
});

document.addEventListener("keydown", (e) => {
  if (!lightboxEl.classList.contains("open")) return;
  if (e.key === "Escape") tutupLightbox();
  if (e.key === "ArrowRight") lightboxSeterusnya();
  if (e.key === "ArrowLeft") lightboxSebelum();
});

muatkanGaleri();