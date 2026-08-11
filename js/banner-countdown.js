// ============================================================
// BANNER SLIDER + COUNTDOWN BESAR (index.html)
// Dikawal dari Admin Panel > tab "Paparan" (jadual tetapan_paparan
// & banner_slaid dalam Supabase). Boleh disable tanpa sentuh kod.
// ============================================================

const PAPARAN_GALERI_BUCKET = "galeri-karnival"; // sama bucket dengan galeri gambar

function bannerSlaidHTML(slaid) {
  let bgStyle = "";
  let imgClass = "";
  if (slaid.imej_path) {
    const { data: urlData } = supabaseClient.storage.from(PAPARAN_GALERI_BUCKET).getPublicUrl(slaid.imej_path);
    bgStyle = ` style="background-image:url('${urlData.publicUrl}')"`;
    imgClass = " has-image";
  }

  const adaTeks = !!(slaid.eyebrow || slaid.tajuk || slaid.teks);
  if (!adaTeks) imgClass += " no-text";

  return `
    <div class="banner-slide${imgClass}"${bgStyle}>
      ${adaTeks ? `
      <div class="container banner-slide-inner">
        ${slaid.eyebrow ? `<span class="eyebrow">${escapeHtml(slaid.eyebrow)}</span>` : ""}
        ${slaid.tajuk ? `<h2>${escapeHtml(slaid.tajuk)}</h2>` : ""}
        ${slaid.teks ? `<p>${escapeHtml(slaid.teks)}</p>` : ""}
      </div>` : ""}
    </div>`;
}

// Slaid lalai kalau admin belum tambah slaid langsung dalam jadual banner_slaid
const SLAID_LALAI = [
  { eyebrow: "17 – 22 Ogos 2026", tajuk: "Jelajah Kecergasan 2026 Peringkat Kebangsaan", teks: "Enam hari acara sukan dan kecergasan merentas seluruh Negeri Sembilan." },
  { eyebrow: "Penyertaan Terbuka", tajuk: "Sertai Kontinjen Daerah Anda", teks: "Rebut kemenangan dan sumbangkan pingat untuk kontinjen anda di pelbagai acara sukan." },
  { eyebrow: "Ikuti Secara Langsung", tajuk: "Keputusan & Kedudukan Pingat Terkini", teks: "Semak kedudukan kontinjen dan keputusan acara dikemaskini dari semasa ke semasa." },
];

function setupBannerSlider(slaidSenarai) {
  const section = document.getElementById("banner-slider");
  const track = document.getElementById("banner-track");
  const dotsEl = document.getElementById("banner-dots");
  const prevBtn = document.getElementById("banner-prev");
  const nextBtn = document.getElementById("banner-next");
  if (!track) return;

  const senarai = slaidSenarai && slaidSenarai.length > 0 ? slaidSenarai : SLAID_LALAI;
  const n = senarai.length;

  section.style.display = "";

  if (n <= 1) {
    track.innerHTML = senarai.map(bannerSlaidHTML).join("");
    dotsEl.style.display = "none";
    prevBtn.style.display = "none";
    nextBtn.style.display = "none";
    return;
  }

  // Teknik carousel infinite: tambah clone slaid terakhir di depan, dan
  // clone slaid pertama di belakang. Loop jadi "seamless" — bila sampai
  // clone, kita lompat balik ke slaid sebenar SECARA SENYAP (tanpa transition)
  // sebab clone tu nampak 100% sama, mata tak perasan lompatan tu.
  const htmlSenarai = senarai.map(bannerSlaidHTML);
  track.innerHTML = [htmlSenarai[n - 1], ...htmlSenarai, htmlSenarai[0]].join("");

  let index = 1; // posisi slaid sebenar pertama (selepas clone terakhir)
  let timer = null;
  let sedangTransisi = false;

  track.style.transform = `translateX(-${index * 100}%)`;

  dotsEl.innerHTML = "";
  dotsEl.style.display = "";
  prevBtn.style.display = "";
  nextBtn.style.display = "";

  for (let i = 0; i < n; i++) {
    const dot = document.createElement("button");
    dot.className = "banner-dot" + (i === 0 ? " active" : "");
    dot.setAttribute("aria-label", `Slaid ${i + 1}`);
    dot.addEventListener("click", () => goTo(i + 1));
    dotsEl.appendChild(dot);
  }

  function kemaskiniDots() {
    let realIndex = index - 1;
    if (realIndex < 0) realIndex = n - 1;
    if (realIndex >= n) realIndex = 0;
    dotsEl.querySelectorAll(".banner-dot").forEach((d, i) => {
      d.classList.toggle("active", i === realIndex);
    });
  }

  function goTo(target) {
    if (sedangTransisi) return;
    sedangTransisi = true;
    index = target;
    track.style.transition = "transform 0.7s cubic-bezier(0.65,0,0.35,1)";
    track.style.transform = `translateX(-${index * 100}%)`;
    kemaskiniDots();
  }

  track.addEventListener("transitionend", () => {
    sedangTransisi = false;
    // Lompat senyap dari clone kembali ke slaid sebenar
    if (index === n + 1) {
      track.style.transition = "none";
      index = 1;
      track.style.transform = `translateX(-${index * 100}%)`;
    } else if (index === 0) {
      track.style.transition = "none";
      index = n;
      track.style.transform = `translateX(-${index * 100}%)`;
    }
  });

  function next() { goTo(index + 1); }
  function prev() { goTo(index - 1); }

  function startAutoplay() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    timer = setInterval(next, 5000);
  }

  function stopAutoplay() {
    clearInterval(timer);
  }

  nextBtn.addEventListener("click", () => { next(); stopAutoplay(); startAutoplay(); });
  prevBtn.addEventListener("click", () => { prev(); stopAutoplay(); startAutoplay(); });

  section.addEventListener("mouseenter", stopAutoplay);
  section.addEventListener("mouseleave", startAutoplay);

  startAutoplay();
}

function updateCountdownBesar() {
  // Tarikh karnival — laraskan mengikut tarikh sebenar
  const mula = new Date("2026-08-17T00:00:00");
  const tamat = new Date("2026-08-22T23:59:59");
  const sekarang = new Date();

  const hariEl = document.getElementById("cd-hari");
  const jamEl = document.getElementById("cd-jam");
  const minitEl = document.getElementById("cd-minit");
  const saatEl = document.getElementById("cd-saat");
  const statusEl = document.getElementById("countdown-status");
  if (!hariEl) return;

  let sasaran = mula;
  let statusTeks = "Sehingga jelajah bermula";

  if (sekarang > tamat) {
    hariEl.textContent = "0";
    jamEl.textContent = "0";
    minitEl.textContent = "0";
    saatEl.textContent = "0";
    statusEl.textContent = "Jelajah Kecergasan 2026 telah selesai. Terima kasih atas penyertaan!";
    return;
  }

  if (sekarang >= mula && sekarang <= tamat) {
    sasaran = tamat;
    statusTeks = "Sehingga jelajah tamat";
  }

  const beza = sasaran - sekarang;
  const hari = Math.floor(beza / (1000 * 60 * 60 * 24));
  const jam = Math.floor((beza / (1000 * 60 * 60)) % 24);
  const minit = Math.floor((beza / (1000 * 60)) % 60);
  const saat = Math.floor((beza / 1000) % 60);

  hariEl.textContent = String(hari);
  jamEl.textContent = String(jam).padStart(2, "0");
  minitEl.textContent = String(minit).padStart(2, "0");
  saatEl.textContent = String(saat).padStart(2, "0");
  statusEl.textContent = statusTeks;
}

async function initPaparan() {
  // Default selamat: kalau gagal fetch tetapan, banner & countdown tetap papar (fail-open)
  let tetapan = { banner_aktif: true, countdown_aktif: true };
  try {
    const { data, error } = await supabaseClient.from("tetapan_paparan").select("*").eq("id", 1).maybeSingle();
    if (!error && data) tetapan = data;
  } catch (err) {
    console.error(err);
  }

  if (tetapan.banner_aktif) {
    let slaidSenarai = [];
    try {
      const { data, error } = await supabaseClient.from("banner_slaid").select("*").order("urutan", { ascending: true });
      if (!error && data) slaidSenarai = data;
    } catch (err) {
      console.error(err);
    }
    setupBannerSlider(slaidSenarai);
  }

  if (tetapan.countdown_aktif) {
    document.getElementById("countdown-section").style.display = "";
    updateCountdownBesar();
    setInterval(updateCountdownBesar, 1000);
  }
}

initPaparan();
