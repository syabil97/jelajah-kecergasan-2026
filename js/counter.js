// ============================================================
// KAUNTER PELAWAT (visitor counter)
// Setiap kali mana-mana page dibuka, panggil RPC increment_lawatan()
// (server-side, elak race condition) lepas tu papar jumlah di footer.
// Perlu run SELEPAS footer dimuatkan -> dengar event "partialsLoaded"
// yang dicetuskan oleh include.js.
// ============================================================

async function papar_kira_lawatan() {
  const elCount = document.getElementById("visitor-count-num");
  if (!elCount) return; // footer tak ada elemen ni, skip senyap

  const { data, error } = await supabaseClient.rpc("increment_lawatan");

  if (error) {
    console.error("Gagal kira lawatan:", error);
    elCount.textContent = "—";
    return;
  }

  elCount.textContent = Number(data).toLocaleString("ms-MY");
}

document.addEventListener("partialsLoaded", papar_kira_lawatan);