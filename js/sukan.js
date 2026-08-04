// ============================================================
// LOGIK HALAMAN JADUAL SUKAN (sukan.html)
// ============================================================

let semuaAcara = [];

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
  paparkanAcara(semuaAcara);
}

function formatJulatTarikh(a) {
  if (a.tarikh_akhir && a.tarikh_akhir !== a.tarikh) {
    return `${formatTarikh(a.tarikh)} &ndash; ${formatTarikh(a.tarikh_akhir)}`;
  }
  return `${formatTarikh(a.tarikh)}${a.masa ? " &middot; " + formatMasa(a.masa) : ""}`;
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
      <span class="badge badge-${a.status}">${statusLabel(a.status)}</span>
    </div>
  `).join("");
}

document.getElementById("tapis-status").addEventListener("change", (e) => {
  const nilai = e.target.value;
  if (!nilai) {
    paparkanAcara(semuaAcara);
  } else {
    paparkanAcara(semuaAcara.filter((a) => a.status === nilai));
  }
});

muatkanSenaraiAcara();