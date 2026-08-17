// ============================================================
// WIDGET STATISTIK PELAWAT (odometer + breakdown ikut tempoh)
// Widget berasingan dari kaunter simple (counter.js). Panggil RPC
// catat_dan_kira_lawatan() SEKALI SAHAJA setiap load page — fungsi
// tu +1 untuk hari ini DAN pulangkan semua statistik sekali gus.
// Perlu run SELEPAS footer dimuatkan -> dengar event "partialsLoaded".
// ============================================================

const VW_DIGIT_COUNT = 8; // berapa digit dipaparkan dalam odometer (padding sifar di kiri)

function vw_bina_odometer(nombor) {
  const teks = String(nombor).padStart(VW_DIGIT_COUNT, "0").slice(-VW_DIGIT_COUNT);
  return teks.split("").map((d) => `<span class="vw-digit">${d}</span>`).join("");
}

async function papar_widget_pelawat() {
  const el = document.getElementById("visitor-widget");
  if (!el) return; // footer tak ada widget ni, skip senyap

  const { data, error } = await supabaseClient.rpc("catat_dan_kira_lawatan");

  if (error || !data || !data[0]) {
    console.error("Gagal kira statistik pelawat:", error);
    return;
  }

  const stat = data[0];
  const fmt = (n) => Number(n || 0).toLocaleString("ms-MY");

  document.getElementById("vw-odometer").innerHTML = vw_bina_odometer(stat.keseluruhan);
  document.getElementById("vw-hari-ini").textContent = fmt(stat.hari_ini);
  document.getElementById("vw-semalam").textContent = fmt(stat.semalam);
  document.getElementById("vw-minggu-ini").textContent = fmt(stat.minggu_ini);
  document.getElementById("vw-bulan-ini").textContent = fmt(stat.bulan_ini);
  document.getElementById("vw-keseluruhan").textContent = fmt(stat.keseluruhan);
}

document.addEventListener("partialsLoaded", papar_widget_pelawat);